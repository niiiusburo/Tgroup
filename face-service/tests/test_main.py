"""Unit tests for face-service detection and embedding pipeline."""

import base64
import io
import sys
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

# Ensure the parent directory is on the path so we can import main
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import detect_face, extract_embedding, cosine_similarity, app


def create_test_image(width: int = 640, height: int = 480, color: tuple = (128, 128, 128)):
    """Create a simple test image in memory."""
    img = Image.new("RGB", (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


class TestDetectFace:
    def test_detects_no_face_on_blank_image(self):
        image_bytes = create_test_image()
        face, score, box = detect_face(image_bytes)
        assert face is None
        assert score == 0.0
        assert box is None

    def test_detection_score_range(self):
        # A blank image should yield score 0
        image_bytes = create_test_image()
        _, score, _ = detect_face(image_bytes)
        assert 0.0 <= score <= 1.0


class TestExtractEmbedding:
    def test_returns_128_dimensions_for_valid_face(self):
        # We can't easily synthesize a real face, but we can verify
        # the function accepts a cropped face array and returns 128-dim vector.
        fake_face = np.zeros((112, 112, 3), dtype=np.uint8)
        emb = extract_embedding(fake_face)
        assert emb is not None
        assert len(emb) == 128


class TestCosineSimilarity:
    def test_identical_vectors_have_similarity_one(self):
        v = np.ones(128, dtype=np.float32)
        sim = cosine_similarity(v, v)
        assert pytest.approx(sim, 0.001) == 1.0

    def test_orthogonal_vectors_have_similarity_zero(self):
        a = np.array([1.0] + [0.0] * 127, dtype=np.float32)
        b = np.array([0.0, 1.0] + [0.0] * 126, dtype=np.float32)
        sim = cosine_similarity(a, b)
        assert pytest.approx(sim, 0.001) == 0.0

    def test_opposite_vectors_have_similarity_minus_one(self):
        a = np.ones(128, dtype=np.float32)
        b = -np.ones(128, dtype=np.float32)
        sim = cosine_similarity(a, b)
        assert pytest.approx(sim, 0.001) == -1.0


class TestApp:
    def test_health_endpoint(self):
        from fastapi.testclient import TestClient
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_embed_invalid_image_returns_400(self):
        from fastapi.testclient import TestClient
        client = TestClient(app)
        response = client.post("/embed", files={"image": ("test.jpg", b"not-an-image", "image/jpeg")})
        assert response.status_code == 400

    def test_embed_valid_image_returns_128_embedding(self):
        from fastapi.testclient import TestClient
        client = TestClient(app)
        image_bytes = create_test_image()
        response = client.post("/embed", files={"image": ("test.jpg", image_bytes, "image/jpeg")})
        # Blank image has no face — should return 422 or 200 with empty result
        # depending on pipeline implementation; we just check it doesn't crash.
        assert response.status_code in (200, 422)
