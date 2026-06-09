"""Passive liveness / anti-spoofing using Silent-Face MiniFASNet via cv2.dnn.

Source-verified against minivision-ai/Silent-Face-Anti-Spoofing:
  - Two models: ``2.7_80x80_MiniFASNetV2`` (scale 2.7) and
    ``4_0_0_80x80_MiniFASNetV1SE`` (scale 4.0). Scale is parsed from the
    Silent-Face filename convention (``<scale>_<h>x<w>_<type>``).
  - Each model gets its own crop: an expanded square centered on the detected
    face bbox, scaled by the model's scale, then resized to 80x80
    (CropImage._get_new_box / CropImage.crop in src/generate_patches.py).
  - Preprocess: BGR, float32 in [0, 255] (the upstream ToTensor does NOT divide
    by 255 — see src/data_io/functional.py), laid out NCHW.
  - The two per-model softmax vectors are SUMMED; ``label = argmax`` and
    ``label == 1`` means a REAL/live face (0 = print spoof, 2 = screen spoof) —
    see test.py.
ONNX exports loadable by ``cv2.dnn.readNetFromONNX`` come from
QingHeYang/Silent-Face-Anti-Spoofing-onnx (NCHW, input range [0, 255], BGR).

Design contract — FAIL-OPEN. If the models are absent, OpenCV is missing, or
inference raises, :meth:`LivenessDetector.assess` returns ``None`` and callers
MUST treat that as "liveness unavailable" and continue. A liveness outage must
never block clinic check-in; Face ID is an optional convenience per the Face ID
design spec ("engine failures must not block normal customer workflows").
"""

import logging
import os
from typing import List, Optional, Sequence, Tuple

import numpy as np

logger = logging.getLogger("face-service.liveness")

# (filename, scale) — scale is intrinsic to each Silent-Face model variant.
LIVENESS_MODEL_SPECS: Tuple[Tuple[str, float], ...] = (
    ("2.7_80x80_MiniFASNetV2.onnx", 2.7),
    ("4_0_0_80x80_MiniFASNetV1SE.onnx", 4.0),
)
INPUT_SIZE = 80
# Silent-Face class index that denotes a genuine/live face.
REAL_LABEL = 1


def _get_new_box(src_w: int, src_h: int, bbox: Sequence[float], scale: float) -> Tuple[int, int, int, int]:
    """Port of ``CropImage._get_new_box`` (Silent-Face generate_patches.py).

    Returns the inclusive ``(left, top, right, bottom)`` of an expanded square
    crop centered on ``bbox`` (``x, y, w, h``). ``scale`` is clamped so the crop
    never exceeds the image, and if a side hits a boundary the opposite side is
    shifted to preserve the requested size (matching upstream exactly).
    """
    x, y, box_w, box_h = bbox[0], bbox[1], bbox[2], bbox[3]
    scale = min((src_h - 1) / box_h, min((src_w - 1) / box_w, scale))

    new_width = box_w * scale
    new_height = box_h * scale
    center_x, center_y = box_w / 2 + x, box_h / 2 + y

    left_top_x = center_x - new_width / 2
    left_top_y = center_y - new_height / 2
    right_bottom_x = center_x + new_width / 2
    right_bottom_y = center_y + new_height / 2

    if left_top_x < 0:
        right_bottom_x -= left_top_x
        left_top_x = 0
    if left_top_y < 0:
        right_bottom_y -= left_top_y
        left_top_y = 0
    if right_bottom_x > src_w - 1:
        left_top_x -= right_bottom_x - src_w + 1
        right_bottom_x = src_w - 1
    if right_bottom_y > src_h - 1:
        left_top_y -= right_bottom_y - src_h + 1
        right_bottom_y = src_h - 1

    return int(left_top_x), int(left_top_y), int(right_bottom_x), int(right_bottom_y)


def _softmax(logits: np.ndarray) -> np.ndarray:
    """Row-wise numerically-stable softmax for a (1, C) logits array."""
    shifted = logits - np.max(logits, axis=1, keepdims=True)
    exp = np.exp(shifted)
    return exp / np.sum(exp, axis=1, keepdims=True)


def aggregate_predictions(softmaxes: List[np.ndarray]) -> Tuple[int, float, float]:
    """Sum per-model softmax vectors (each shape ``(1, 3)``) and derive the
    Silent-Face verdict.

    Returns ``(label, value, real_score)``:
      - ``label``       argmax of the summed vector; ``label == REAL_LABEL`` is live.
      - ``value``       confidence of the winning label, averaged across models.
      - ``real_score``  probability of the REAL class, averaged across models,
                        in ``[0, 1]`` — the single calibratable liveness score.
    """
    if not softmaxes:
        return 0, 0.0, 0.0
    summed = np.zeros((1, 3), dtype=np.float64)
    for sm in softmaxes:
        summed += sm
    n = float(len(softmaxes))
    label = int(np.argmax(summed))
    value = float(summed[0][label] / n)
    real_score = float(summed[0][REAL_LABEL] / n)
    return label, value, real_score


def is_live(real_score: float, threshold: float) -> bool:
    """Gate decision: a capture is live when its REAL-class probability clears
    the (calibratable) threshold."""
    return real_score >= threshold


class LivenessDetector:
    """Lazily-loaded MiniFASNet liveness detector. Construct once and reuse.

    All failure paths return ``None`` from :meth:`assess` (fail-open). Model
    loading is attempted at most once; a missing model permanently disables the
    detector for the process lifetime (until restart) without raising.
    """

    def __init__(self, model_dir: str, threshold: float = 0.5):
        self._model_dir = model_dir
        self._threshold = threshold
        self._nets: Optional[List[Tuple[object, float]]] = None
        self._load_attempted = False
        self._available = False

    @property
    def threshold(self) -> float:
        return self._threshold

    @property
    def available(self) -> bool:
        """True only if both ONNX models loaded successfully (triggers a one-time
        lazy load)."""
        return self._ensure()

    def _ensure(self) -> bool:
        if self._load_attempted:
            return self._available
        self._load_attempted = True
        try:
            import cv2  # lazy: keep module import-light for pure-logic tests

            nets: List[Tuple[object, float]] = []
            for fname, scale in LIVENESS_MODEL_SPECS:
                path = os.path.join(self._model_dir, fname)
                if not os.path.exists(path):
                    logger.warning(
                        "Liveness model missing: %s -- liveness DISABLED (fail-open)", path
                    )
                    self._available = False
                    return False
                nets.append((cv2.dnn.readNetFromONNX(path), scale))
            self._nets = nets
            self._available = True
            logger.info(
                "Liveness models loaded (threshold=%.2f): %s",
                self._threshold,
                [s[0] for s in LIVENESS_MODEL_SPECS],
            )
        except Exception as exc:  # ImportError, cv2 read errors, etc.
            logger.warning(
                "Liveness model load failed: %s -- liveness DISABLED (fail-open)", exc
            )
            self._available = False
        return self._available

    def assess(self, img_bgr: np.ndarray, bbox: Sequence[float]) -> Optional[dict]:
        """Assess a single detected face.

        ``img_bgr`` is the full decoded BGR frame; ``bbox`` is ``(x, y, w, h)``
        of the face in pixels. Returns a verdict dict, or ``None`` when liveness
        is unavailable (caller MUST fail-open).
        """
        if not self._ensure():
            return None
        try:
            import cv2  # lazy

            src_h, src_w = img_bgr.shape[:2]
            softmaxes: List[np.ndarray] = []
            for net, scale in self._nets:  # type: ignore[union-attr]
                x1, y1, x2, y2 = _get_new_box(src_w, src_h, bbox, scale)
                crop = img_bgr[y1 : y2 + 1, x1 : x2 + 1]
                if crop.size == 0:
                    logger.warning("Liveness crop empty -- treating as unavailable (fail-open)")
                    return None
                crop = cv2.resize(crop, (INPUT_SIZE, INPUT_SIZE))
                # BGR float32 in [0,255], HWC -> CHW -> NCHW. No /255, no mean.
                blob = np.transpose(crop.astype(np.float32), (2, 0, 1))[np.newaxis, ...]
                net.setInput(blob)
                logits = np.asarray(net.forward(), dtype=np.float64).reshape(1, -1)
                softmaxes.append(_softmax(logits))

            label, value, real_score = aggregate_predictions(softmaxes)
            live = is_live(real_score, self._threshold)
            return {
                "available": True,
                "isLive": bool(live),
                "score": round(real_score, 4),
                "label": int(label),
                "value": round(value, 4),
                "threshold": self._threshold,
            }
        except Exception as exc:
            logger.warning(
                "Liveness inference failed: %s -- treating as unavailable (fail-open)", exc
            )
            return None
