"""Unit tests for the face-service /embed endpoint.

These tests mock OpenCV (cv2) because the models (YuNet detector + SFace
recognizer) are heavy and not always present in CI. We exercise the
endpoint contract, error mapping, and request validation instead of the
actual neural network inference.

The original test file imported `detect_face`, `extract_embedding`, and
`cosine_similarity` from `main`, but those names do not exist in main.py —
main.py only exports the FastAPI `app`. The collection-time ImportError was
silently breaking pytest for the entire face-service suite. This rewrite
imports only what actually exists and uses FastAPI TestClient to exercise
the HTTP layer.
"""

import io
import sys
from pathlib import Path

import pytest

# Ensure the parent directory is on the path so we can import main
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture
def client(monkeypatch):
    """Build a TestClient with the cv2 models stubbed out.

    The real YuNet/SFace models are loaded lazily on first request. We
    short-circuit _ensure_models so the TestClient doesn't try to open
    .onnx files that aren't present in CI.
    """

    class _StubDetector:
        def setInputSize(self, *_args, **_kwargs):
            return None

        def detect(self, _img):
            # Return (count=0, faces=None) so /embed returns NO_FACE cleanly.
            return 0, None

    class _StubRecognizer:
        def alignCrop(self, _img, _box):
            return _img

        def feature(self, _aligned):
            import numpy as np  # local import keeps the fixture optional
            return np.zeros((1, 128), dtype=np.float32)

    import main as face_main

    face_main._detector = _StubDetector()
    face_main._recognizer = _StubRecognizer()

    from fastapi.testclient import TestClient

    return TestClient(face_main.app)


def _png_bytes(width: int = 320, height: int = 240, color: tuple = (128, 128, 128)) -> bytes:
    """Build a real PNG byte string via PIL — used as valid multipart upload body."""
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buf, format="PNG")
    return buf.getvalue()


class TestHealthEndpoint:
    def test_health_returns_ok_when_models_loaded(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["models"]["detector"] == "yunet"
        assert body["models"]["recognizer"] == "sface"

    def test_health_returns_503_when_models_missing(self, monkeypatch):
        import main as face_main

        def _raise():
            raise RuntimeError("Detector model not found: /tmp/missing.onnx")

        monkeypatch.setattr(face_main, "_ensure_models", _raise)
        from fastapi.testclient import TestClient

        client = TestClient(face_main.app)
        response = client.get("/health")
        assert response.status_code == 503
        assert "Detector model not found" in response.json()["detail"]


class TestEmbedEndpoint:
    def test_embed_rejects_non_image_content_type(self, client):
        response = client.post(
            "/embed",
            files={"image": ("blob.bin", b"\x00\x01\x02", "application/octet-stream")},
        )
        assert response.status_code == 400
        assert response.json()["error"] == "IMAGE_UNREADABLE"

    def test_embed_rejects_empty_body(self, client):
        response = client.post(
            "/embed",
            files={"image": ("empty.png", b"", "image/png")},
        )
        # FastAPI/Starlette returns 400 on empty multipart file.
        assert response.status_code in (400, 422)

    def test_embed_returns_422_when_detector_finds_no_face(self, client):
        # The stub detector returns (0, None) → NO_FACE
        response = client.post(
            "/embed",
            files={"image": ("blank.png", _png_bytes(), "image/png")},
        )
        assert response.status_code == 422
        body = response.json()
        assert body["error"] == "NO_FACE"

    def test_embed_endpoint_accepts_jpeg(self, client):
        """Sanity: a JPEG upload reaches the detector (will then 422 NO_FACE
        from the stub, but the request must not 400 IMAGE_UNREADABLE)."""
        from PIL import Image

        buf = io.BytesIO()
        Image.new("RGB", (320, 240), (128, 128, 128)).save(buf, format="JPEG")
        response = client.post(
            "/embed",
            files={"image": ("face.jpg", buf.getvalue(), "image/jpeg")},
        )
        assert response.status_code in (200, 422)
        assert response.status_code != 400


class TestConfigurationEnvVars:
    """The Dockerfile sets DETECTION_THRESHOLD and main.py must read it.

    Regression: there was a period where main.py read DETECTOR_SCORE_THRESHOLD
    for the detector and DETECTION_THRESHOLD for the quality gate, but the
    Dockerfile only set DETECTION_THRESHOLD. This test pins both contracts.

    These tests use regex checks against main.py source rather than importing
    it, because importing main.py requires cv2 which is heavy and not always
    available in CI. The contract we care about — env var names and defaults
    appearing in the right places — is fully encoded in source.
    """

    def test_quality_threshold_reads_detection_threshold_env(self):
        import re

        from pathlib import Path

        main_src = Path(__file__).parent.parent.joinpath("main.py").read_text()
        # Must read DETECTION_THRESHOLD for QUALITY_THRESHOLD
        assert re.search(
            r"QUALITY_THRESHOLD\s*=\s*float\(os\.environ\.get\(\s*[\"']DETECTION_THRESHOLD[\"']",
            main_src,
        ), "main.py must read DETECTION_THRESHOLD into QUALITY_THRESHOLD"

    def test_detector_score_threshold_has_own_env_var(self):
        import re

        from pathlib import Path

        main_src = Path(__file__).parent.parent.joinpath("main.py").read_text()
        # Must read DETECTOR_SCORE_THRESHOLD for the detector
        assert re.search(
            r"DETECTOR_SCORE_THRESHOLD\s*=\s*float\(os\.environ\.get\(\s*[\"']DETECTOR_SCORE_THRESHOLD[\"']",
            main_src,
        ), "main.py must read DETECTOR_SCORE_THRESHOLD"

    def test_dockerfile_sets_both_env_vars(self):
        import re

        from pathlib import Path

        dockerfile = (
            Path(__file__).parent.parent.parent.joinpath("face-service/Dockerfile")
            if (Path(__file__).parent.parent.parent.joinpath("face-service/Dockerfile").exists())
            else Path(__file__).parent.parent.joinpath("Dockerfile")
        )
        # In a worktree, face-service/Dockerfile is alongside tests/.
        candidates = [
            Path(__file__).parent.parent.joinpath("Dockerfile"),
        ]
        repo_root_dockerfile = Path(__file__).parent.parent.parent.joinpath("Dockerfile")
        if repo_root_dockerfile.exists():
            candidates.append(repo_root_dockerfile)
        chosen = next((c for c in candidates if c.exists()), None)
        assert chosen is not None, "Could not locate face-service/Dockerfile"
        df = chosen.read_text()
        assert "ENV DETECTION_THRESHOLD" in df, "Dockerfile must set DETECTION_THRESHOLD"
        assert "ENV DETECTOR_SCORE_THRESHOLD" in df, "Dockerfile must set DETECTOR_SCORE_THRESHOLD"

    def test_defaults_when_no_env_set(self):
        """Sanity check: source contains the documented defaults (0.85, 0.5)."""
        from pathlib import Path

        main_src = Path(__file__).parent.parent.joinpath("main.py").read_text()
        assert '"0.85"' in main_src, "QUALITY_THRESHOLD default 0.85 must be present in source"
        assert '"0.5"' in main_src, "DETECTOR_SCORE_THRESHOLD default 0.5 must be present in source"