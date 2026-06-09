"""Tests for the MiniFASNet liveness module.

The pure-logic tests (crop geometry, softmax aggregation, threshold, fail-open)
run with only numpy. The two end-to-end ``assess`` tests need OpenCV for the
crop resize and are skipped when cv2 is absent.
"""

import sys
from pathlib import Path

import numpy as np
import pytest

# Ensure the service root is importable (liveness.py lives next to main.py).
sys.path.insert(0, str(Path(__file__).parent.parent))

from liveness import (  # noqa: E402
    LivenessDetector,
    _get_new_box,
    _softmax,
    aggregate_predictions,
    is_live,
)


class TestGetNewBox:
    def test_centered_crop_within_bounds(self):
        # 200x200 image, 40x40 box at (80,80) center (100,100), scale 2.0 -> 80x80 crop.
        assert _get_new_box(200, 200, (80, 80, 40, 40), 2.0) == (60, 60, 140, 140)

    def test_scale_clamped_to_image(self):
        left, top, right, bottom = _get_new_box(100, 100, (10, 10, 20, 20), 999)
        assert left >= 0 and top >= 0
        assert right <= 99 and bottom <= 99

    def test_edge_shifts_opposite_side(self):
        # Box flush to the left edge: left clamps to 0, right shifts to keep size.
        left, top, right, bottom = _get_new_box(200, 200, (0, 80, 40, 40), 2.0)
        assert left == 0
        assert right - left == 80


class TestSoftmax:
    def test_sums_to_one(self):
        out = _softmax(np.array([[1.0, 2.0, 3.0]]))
        assert pytest.approx(float(out.sum()), abs=1e-6) == 1.0

    def test_monotonic(self):
        out = _softmax(np.array([[1.0, 2.0, 3.0]]))[0]
        assert out[2] > out[1] > out[0]


class TestAggregate:
    @staticmethod
    def _sm(real_p):
        other = (1.0 - real_p) / 2
        return np.array([[other, real_p, other]])

    def test_real_favoring_is_label_1(self):
        label, value, real_score = aggregate_predictions([self._sm(0.9), self._sm(0.8)])
        assert label == 1
        assert real_score == pytest.approx(0.85, abs=1e-6)
        assert value == pytest.approx(0.85, abs=1e-6)

    def test_spoof_favoring_is_label_0(self):
        sm = np.array([[0.8, 0.1, 0.1]])
        label, _value, real_score = aggregate_predictions([sm, sm])
        assert label == 0
        assert real_score == pytest.approx(0.1, abs=1e-6)

    def test_empty_is_spoof(self):
        assert aggregate_predictions([]) == (0, 0.0, 0.0)


class TestIsLive:
    def test_threshold_boundary(self):
        assert is_live(0.5, 0.5) is True
        assert is_live(0.4999, 0.5) is False


class TestFailOpen:
    def test_missing_models_makes_detector_unavailable(self, tmp_path):
        det = LivenessDetector(str(tmp_path), threshold=0.5)
        assert det.available is False

    def test_assess_returns_none_when_unavailable(self, tmp_path):
        det = LivenessDetector(str(tmp_path), threshold=0.5)
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        assert det.assess(img, (10, 10, 20, 20)) is None


class _FakeNet:
    def __init__(self, logits):
        self._logits = np.asarray(logits, dtype=np.float32)

    def setInput(self, _blob):
        pass

    def forward(self):
        return self._logits


def _detector_with(logits):
    det = LivenessDetector("/nonexistent", threshold=0.5)
    det._nets = [(_FakeNet(logits), 2.7), (_FakeNet(logits), 4.0)]
    det._available = True
    det._load_attempted = True
    return det


class TestAssessEndToEnd:
    def test_live_face_passes(self):
        pytest.importorskip("cv2")
        det = _detector_with([[0.0, 10.0, 0.0]])  # real class dominant
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        result = det.assess(img, (80, 80, 40, 40))
        assert result is not None
        assert result["isLive"] is True
        assert result["label"] == 1
        assert result["available"] is True

    def test_spoof_face_blocks(self):
        pytest.importorskip("cv2")
        det = _detector_with([[10.0, 0.0, 0.0]])  # spoof class dominant
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        result = det.assess(img, (80, 80, 40, 40))
        assert result is not None
        assert result["isLive"] is False
        assert result["label"] == 0
