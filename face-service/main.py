"""Local face embedding service using OpenCV YuNet + SFace."""

import io
import os
import logging
import signal
import sys
from typing import List, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face-service")

app = FastAPI(title="Face Embedding Service", version="1.0.0")

# ─── Configuration ──────────────────────────────────────────────────────────
MODEL_DIR = os.environ.get("MODEL_DIR", "/app/models")
DETECTOR_PATH = os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx")
RECOGNIZER_PATH = os.path.join(MODEL_DIR, "face_recognition_sface_2021dec.onnx")
DETECTOR_SCORE_THRESHOLD = float(os.environ.get("DETECTOR_SCORE_THRESHOLD", "0.5"))
QUALITY_THRESHOLD = float(os.environ.get("DETECTION_THRESHOLD", "0.85"))
INPUT_SIZE = (320, 320)  # YuNet default

# ─── Model loading ──────────────────────────────────────────────────────────
_detector = None
_recognizer = None


def _load_models():
    global _detector, _recognizer
    if _detector is not None and _recognizer is not None:
        return

    if not os.path.exists(DETECTOR_PATH):
        raise RuntimeError(f"Detector model not found: {DETECTOR_PATH}")
    if not os.path.exists(RECOGNIZER_PATH):
        raise RuntimeError(f"Recognizer model not found: {RECOGNIZER_PATH}")

    _detector = cv2.FaceDetectorYN.create(
        model=DETECTOR_PATH,
        config="",
        input_size=INPUT_SIZE,
        score_threshold=DETECTOR_SCORE_THRESHOLD,
        nms_threshold=0.3,
        top_k=5000,
    )
    _recognizer = cv2.FaceRecognizerSF.create(
        model=RECOGNIZER_PATH,
        config="",
    )
    logger.info("Models loaded: detector=%s recognizer=%s", DETECTOR_PATH, RECOGNIZER_PATH)


def _ensure_models():
    if _detector is None or _recognizer is None:
        _load_models()


# ─── Helpers ────────────────────────────────────────────────────────────────

def _decode_image(file_bytes: bytes) -> Optional[np.ndarray]:
    """Decode uploaded bytes to OpenCV BGR image."""
    try:
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            # Try PIL fallback for formats OpenCV doesn't handle
            pil_img = Image.open(io.BytesIO(file_bytes))
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        return img
    except Exception as exc:
        logger.warning("Image decode failed: %s", exc)
        return None


def _extract_embedding(img: np.ndarray, face_box: np.ndarray) -> List[float]:
    """Align face, extract SFace embedding, L2-normalize for cosine-similarity matching."""
    _ensure_models()
    aligned = _recognizer.alignCrop(img, face_box)
    embedding = _recognizer.feature(aligned).flatten()
    norm = float(np.linalg.norm(embedding))
    if norm > 0:
        embedding = embedding / norm
    return embedding.tolist()


# ─── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    try:
        _ensure_models()
        return {
            "status": "ok",
            "models": {
                "detector": "yunet",
                "recognizer": "sface",
                "version": "opencv-sface-2021",
            },
        }
    except Exception as exc:
        logger.error("Health check failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/embed")
async def embed(image: UploadFile = File(...)):
    """
    Detect faces and return embedding for the primary face.
    Rejects no-face and multi-face captures.
    """
    try:
        _ensure_models()
    except RuntimeError as exc:
        logger.error("Model not ready: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"error": "MODEL_NOT_READY", "message": str(exc)},
        )
    except Exception as exc:
        logger.error("Engine error on model load: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": "ENGINE_ERROR", "message": str(exc)},
        )

    if not image.content_type or not image.content_type.startswith("image/"):
        return JSONResponse(
            status_code=400,
            content={"error": "IMAGE_UNREADABLE", "message": "Uploaded file is not an image"},
        )

    try:
        file_bytes = await image.read()
        if len(file_bytes) == 0:
            return JSONResponse(
                status_code=400,
                content={"error": "IMAGE_UNREADABLE", "message": "Empty image file"},
            )
    except Exception as exc:
        logger.warning("Image read failed: %s", exc)
        return JSONResponse(
            status_code=400,
            content={"error": "IMAGE_UNREADABLE", "message": "Could not read image"},
        )

    img = _decode_image(file_bytes)
    if img is None:
        return JSONResponse(
            status_code=400,
            content={"error": "IMAGE_UNREADABLE", "message": "Could not decode image"},
        )

    h, w = img.shape[:2]
    _detector.setInputSize((w, h))

    try:
        _, faces = _detector.detect(img)
    except Exception as exc:
        logger.error("Detection error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": "ENGINE_ERROR", "message": f"Detection failed: {exc}"},
        )

    if faces is None or len(faces) == 0:
        return JSONResponse(
            status_code=422,
            content={"error": "NO_FACE", "message": "No face detected"},
        )

    # Keep only faces above the quality bar; spurious low-score detections are dropped.
    quality_faces = [f for f in faces if float(f[14]) >= QUALITY_THRESHOLD]

    if len(quality_faces) == 0:
        return JSONResponse(
            status_code=422,
            content={
                "error": "LOW_QUALITY",
                "message": f"No face above quality threshold {QUALITY_THRESHOLD}",
            },
        )

    if len(quality_faces) > 1:
        return JSONResponse(
            status_code=422,
            content={"error": "MULTIPLE_FACES", "message": "More than one face detected"},
        )

    face = quality_faces[0]
    # YuNet returns: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
    score = float(face[14])
    if score < QUALITY_THRESHOLD:
        return JSONResponse(
            status_code=422,
            content={
                "error": "LOW_QUALITY",
                "message": f"Face detection score {score:.2f} below threshold {QUALITY_THRESHOLD}",
            },
        )

    # Build face box for alignCrop: expects [[x1, y1], [x2, y2], [x_re, y_re], [x_le, y_le], [x_nt, y_nt]]
    x, y, fw, fh = float(face[0]), float(face[1]), float(face[2]), float(face[3])
    x_re, y_re = float(face[4]), float(face[5])
    x_le, y_le = float(face[6]), float(face[7])
    x_nt, y_nt = float(face[8]), float(face[9])

    face_box = np.array([
        [x, y],
        [x + fw, y + fh],
        [x_re, y_re],
        [x_le, y_le],
        [x_nt, y_nt],
    ], dtype=np.float32)

    try:
        embedding = _extract_embedding(img, face_box)
    except Exception as exc:
        logger.error("Embedding extraction error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"error": "ENGINE_ERROR", "message": f"Embedding extraction failed: {exc}"},
        )

    return {
        "embedding": embedding,
        "model": {
            "detector": "yunet",
            "recognizer": "sface",
            "version": "opencv-sface-2021",
        },
        "quality": {
            "faceCount": 1,
            "detectionScore": round(score, 4),
            "box": {
                "x": round(x, 1),
                "y": round(y, 1),
                "width": round(fw, 1),
                "height": round(fh, 1),
            },
        },
    }


# ─── Graceful Shutdown (LIFE-02) ────────────────────────────────────────────
def sigterm_handler(signum, frame):
    """LIFE-02: Clean shutdown on SIGTERM — exit process within 30s."""
    logger.info("[SIGTERM] Received termination signal, exiting cleanly...")
    sys.exit(0)


signal.signal(signal.SIGTERM, sigterm_handler)
logger.info("SIGTERM handler registered")

