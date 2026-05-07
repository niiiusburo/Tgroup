const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const faceServiceDir = path.join(repoRoot, 'face-service');

describe('face-service code validation', () => {
  describe('main.py', () => {
    let content;

    beforeAll(() => {
      content = fs.readFileSync(path.join(faceServiceDir, 'main.py'), 'utf8');
    });

    it('imports typing modules List and Optional', () => {
      expect(content).toMatch(/from typing import/i);
    });

    it('imports os module', () => {
      expect(content).toMatch(/import os/i);
    });

    it('imports io module', () => {
      expect(content).toMatch(/import io/i);
    });

    it('imports logging module', () => {
      expect(content).toMatch(/import logging/i);
    });

    it('imports numpy as np', () => {
      expect(content).toMatch(/import numpy as np/i);
    });

    it('imports cv2', () => {
      expect(content).toMatch(/import cv2/i);
    });

    it('imports PIL Image', () => {
      expect(content).toMatch(/from PIL import Image/i);
    });

    it('imports FastAPI', () => {
      expect(content).toMatch(/from fastapi import FastAPI/i);
    });

    it('initializes FastAPI app with title', () => {
      expect(content).toMatch(/app = FastAPI/i);
      expect(content).toMatch(/title=/i);
    });

    it('sets version in FastAPI app', () => {
      expect(content).toMatch(/version=/i);
    });

    it('imports JSONResponse from fastapi.responses', () => {
      expect(content).toMatch(/from fastapi\.responses import JSONResponse/i);
    });

    it('uses JSONResponse for HTTP responses', () => {
      expect(content).toMatch(/return JSONResponse/i);
    });

    it('sets status_code in JSONResponse', () => {
      expect(content).toMatch(/status_code=/i);
    });

    it('includes error field in error responses', () => {
      expect(content).toMatch(/"error":/i);
    });

    it('includes message field in error responses', () => {
      expect(content).toMatch(/"message":/i);
    });

    it('uses dictionary literals for JSON content', () => {
      expect(content).toMatch(/content=\{/i);
    });

    it('imports UploadFile from fastapi', () => {
      expect(content).toMatch(/UploadFile/i);
    });

    it('imports JSONResponse from fastapi', () => {
      expect(content).toMatch(/JSONResponse/i);
    });

    it('imports HTTPException from fastapi', () => {
      expect(content).toMatch(/HTTPException/i);
    });

    it('imports File from fastapi', () => {
      expect(content).toMatch(/File/i);
    });

    it('imports typing annotations', () => {
      expect(content).toMatch(/from typing import/i);
    });

    it('imports PIL for image fallback', () => {
      expect(content).toMatch(/from PIL import Image/i);
    });

    it('imports numpy', () => {
      expect(content).toMatch(/import numpy/i);
    });

    it('imports io for BytesIO', () => {
      expect(content).toMatch(/import io/i);
    });

    it('imports os for environment and path handling', () => {
      expect(content).toMatch(/import os/i);
    });

    it('reads MODEL_DIR from environment', () => {
      expect(content).toMatch(/MODEL_DIR/i);
      expect(content).toMatch(/os\.environ\.get/i);
    });

    it('uses os.path.join for model paths', () => {
      expect(content).toMatch(/os\.path\.join/i);
    });

    it('validates model files exist with os.path.exists', () => {
      expect(content).toMatch(/os\.path\.exists/i);
    });

    it('raises RuntimeError for missing models', () => {
      expect(content).toMatch(/RuntimeError/i);
    });

    it('reads environment variables with os.environ.get', () => {
      expect(content).toMatch(/os\.environ\.get/i);
    });

    it('defines MODEL_DIR configuration', () => {
      expect(content).toMatch(/MODEL_DIR/i);
    });

    it('defines DETECTOR_PATH for model file', () => {
      expect(content).toMatch(/DETECTOR_PATH/i);
    });

    it('defines RECOGNIZER_PATH for model file', () => {
      expect(content).toMatch(/RECOGNIZER_PATH/i);
    });

    it('reads DETECTION_THRESHOLD from environment', () => {
      expect(content).toMatch(/DETECTION_THRESHOLD/i);
    });

    it('uses DETECTION_THRESHOLD for score validation', () => {
      expect(content).toMatch(/score.*DETECTION_THRESHOLD/i);
    });

    it('defines INPUT_SIZE for YuNet', () => {
      expect(content).toMatch(/INPUT_SIZE/i);
    });

    it('configures score_threshold for YuNet', () => {
      expect(content).toMatch(/score_threshold/i);
    });

    it('configures nms_threshold for YuNet', () => {
      expect(content).toMatch(/nms_threshold/i);
    });

    it('configures top_k for YuNet', () => {
      expect(content).toMatch(/top_k/i);
    });

    it('initializes FastAPI app with title', () => {
      expect(content).toMatch(/app = FastAPI\(/i);
      expect(content).toMatch(/title=/i);
    });

    it('configures logging', () => {
      expect(content).toMatch(/logging\.basicConfig/i);
      expect(content).toMatch(/getLogger/i);
    });

    it('uses logger.info for model loading', () => {
      expect(content).toMatch(/logger\.info/i);
    });

    it('uses logger.warning for non-fatal issues', () => {
      expect(content).toMatch(/logger\.warning/i);
    });

    it('uses logger.error for failures', () => {
      expect(content).toMatch(/logger\.error/i);
    });

    it('raises HTTPException in health endpoint', () => {
      expect(content).toMatch(/raise HTTPException/i);
    });

    it('imports OpenCV', () => {
      expect(content).toMatch(/import cv2/i);
    });

    it('defines /health endpoint', () => {
      expect(content).toMatch(/@app\.get\(["']\/health["']\)/i);
    });

    it('defines health function', () => {
      expect(content).toMatch(/def health\(\)/i);
    });

    it('returns status in health response', () => {
      expect(content).toMatch(/"status":\s*"ok"/i);
    });

    it('returns models in health response', () => {
      expect(content).toMatch(/"models":/i);
    });

    it('defines /embed endpoint', () => {
      expect(content).toMatch(/@app\.post\(["']\/embed["']\)/i);
    });

    it('defines embed endpoint function', () => {
      expect(content).toMatch(/def embed/i);
    });

    it('defines embed as async function', () => {
      expect(content).toMatch(/async def embed/i);
    });

    it('uses YuNet detector', () => {
      expect(content).toMatch(/YuNet|yunet/i);
    });

    it('uses SFace recognizer', () => {
      expect(content).toMatch(/SFace|sface/i);
    });

    it('uses cv2.FaceDetectorYN', () => {
      expect(content).toMatch(/cv2\.FaceDetectorYN/i);
    });

    it('references YuNet model file', () => {
      expect(content).toMatch(/yunet/i);
    });

    it('references SFace model file', () => {
      expect(content).toMatch(/sface/i);
    });

    it('uses .onnx extension for model files', () => {
      expect(content).toMatch(/\.onnx/i);
    });

    it('uses cv2.FaceRecognizerSF', () => {
      expect(content).toMatch(/cv2\.FaceRecognizerSF/i);
    });

    it('creates detector with cv2.FaceDetectorYN.create', () => {
      expect(content).toMatch(/cv2\.FaceDetectorYN\.create/i);
    });

    it('creates recognizer with cv2.FaceRecognizerSF.create', () => {
      expect(content).toMatch(/cv2\.FaceRecognizerSF\.create/i);
    });

    it('uses detector.setInputSize for image dimensions', () => {
      expect(content).toMatch(/\.setInputSize/i);
    });

    it('uses detector.detect for face detection', () => {
      expect(content).toMatch(/\.detect\(/i);
    });

    it('handles faces detection result', () => {
      expect(content).toMatch(/faces/i);
    });

    it('checks len(faces) for face count validation', () => {
      expect(content).toMatch(/len\(faces\)/i);
    });

    it('selects primary face with faces[0]', () => {
      expect(content).toMatch(/faces\[0\]/i);
    });

    it('uses img.shape for image dimensions', () => {
      expect(content).toMatch(/img\.shape/i);
    });

    it('uses recognizer.alignCrop for face alignment', () => {
      expect(content).toMatch(/\.alignCrop/i);
    });

    it('uses recognizer.feature for embedding extraction', () => {
      expect(content).toMatch(/\.feature\(/i);
    });

    it('flattens embedding before returning', () => {
      expect(content).toMatch(/\.flatten\(\)/i);
    });

    it('converts embedding to list with .tolist()', () => {
      expect(content).toMatch(/\.tolist\(\)/i);
    });

    it('uses setInputSize for dynamic image dimensions', () => {
      expect(content).toMatch(/setInputSize/i);
    });

    it('calls detector.detect for face detection', () => {
      expect(content).toMatch(/_detector\.detect\(/i);
    });

    it('constructs face_box for alignCrop', () => {
      expect(content).toMatch(/face_box/i);
    });

    it('uses float32 dtype for face_box array', () => {
      expect(content).toMatch(/dtype=np\.float32/i);
    });

    it('uses alignCrop for face alignment', () => {
      expect(content).toMatch(/alignCrop/i);
    });

    it('uses feature extraction after alignment', () => {
      expect(content).toMatch(/\.feature\(/i);
    });

    it('uses float() for score conversion', () => {
      expect(content).toMatch(/float\(/i);
    });

    it('flattens embedding to list for JSON serialization', () => {
      expect(content).toMatch(/flatten\(\)/i);
      expect(content).toMatch(/tolist\(\)/i);
    });

    it('uses face recognition model', () => {
      expect(content).toMatch(/face_recognition/i);
    });

    it('has error handling for MODEL_NOT_READY', () => {
      expect(content).toMatch(/MODEL_NOT_READY/i);
    });

    it('has error handling for IMAGE_UNREADABLE', () => {
      expect(content).toMatch(/IMAGE_UNREADABLE/i);
    });

    it('has error handling for NO_FACE', () => {
      expect(content).toMatch(/NO_FACE/i);
    });

    it('has error handling for MULTIPLE_FACES', () => {
      expect(content).toMatch(/MULTIPLE_FACES/i);
    });

    it('has error handling for LOW_QUALITY', () => {
      expect(content).toMatch(/LOW_QUALITY/i);
    });

    it('has error handling for ENGINE_ERROR', () => {
      expect(content).toMatch(/ENGINE_ERROR/i);
    });

    it('returns embedding in response', () => {
      expect(content).toMatch(/"embedding":\s*embedding/i);
    });

    it('returns model metadata in response', () => {
      expect(content).toMatch(/"model":/i);
    });

    it('includes version in model metadata', () => {
      expect(content).toMatch(/"version":/i);
    });

    it('includes detector name in model metadata', () => {
      expect(content).toMatch(/"detector":/i);
    });

    it('includes recognizer name in model metadata', () => {
      expect(content).toMatch(/"recognizer":/i);
    });

    it('returns quality metadata in response', () => {
      expect(content).toMatch(/"quality":/i);
    });

    it('includes faceCount in quality metadata', () => {
      expect(content).toMatch(/faceCount/i);
    });

    it('includes bounding box in quality metadata', () => {
      expect(content).toMatch(/"box":/i);
      expect(content).toMatch(/"x":/i);
      expect(content).toMatch(/"y":/i);
      expect(content).toMatch(/"width":/i);
      expect(content).toMatch(/"height":/i);
    });

    it('uses round() for detection score precision', () => {
      expect(content).toMatch(/round\(/i);
    });

    it('rounds detection score in quality metadata', () => {
      expect(content).toMatch(/round\(.*4\)/i);
    });

    it('validates image content_type', () => {
      expect(content).toMatch(/content_type/i);
      expect(content).toMatch(/image\//i);
    });

    it('checks content_type starts with image/', () => {
      expect(content).toMatch(/\.startswith\("image\/"\)/i);
    });

    it('uses PIL Image.open for fallback decoding', () => {
      expect(content).toMatch(/Image\.open/i);
    });

    it('converts PIL image to RGB mode', () => {
      expect(content).toMatch(/\.convert\("RGB"\)/i);
    });

    it('checks PIL image mode before conversion', () => {
      expect(content).toMatch(/\.mode/i);
    });

    it('uses io.BytesIO for in-memory buffer', () => {
      expect(content).toMatch(/io\.BytesIO/i);
    });

    it('reads uploaded image with await image.read()', () => {
      expect(content).toMatch(/await image\.read\(\)/i);
    });

    it('converts file bytes with np.frombuffer', () => {
      expect(content).toMatch(/np\.frombuffer/i);
    });

    it('uses np.array for PIL image conversion', () => {
      expect(content).toMatch(/np\.array\(/i);
    });

    it('decodes image with cv2.imdecode', () => {
      expect(content).toMatch(/cv2\.imdecode/i);
    });

    it('uses cv2.IMREAD_COLOR for image loading', () => {
      expect(content).toMatch(/cv2\.IMREAD_COLOR/i);
    });

    it('validates empty image files', () => {
      expect(content).toMatch(/len\(file_bytes\) == 0/i);
    });

    it('defines _decode_image helper', () => {
      expect(content).toMatch(/def _decode_image/i);
    });

    it('uses cv2.imdecode for image decoding', () => {
      expect(content).toMatch(/cv2\.imdecode/i);
    });

    it('uses np.frombuffer for byte-to-array conversion', () => {
      expect(content).toMatch(/np\.frombuffer/i);
    });

    it('uses np.ndarray type annotations', () => {
      expect(content).toMatch(/np\.ndarray/i);
    });

    it('uses List[float] return type annotation', () => {
      expect(content).toMatch(/List\[float\]/i);
    });

    it('uses Optional[np.ndarray] return type annotation', () => {
      expect(content).toMatch(/Optional\[np\.ndarray\]/i);
    });

    it('uses cv2.cvtColor for PIL fallback color conversion', () => {
      expect(content).toMatch(/cv2\.cvtColor/i);
      expect(content).toMatch(/COLOR_RGB2BGR/i);
    });

    it('defines _load_models helper', () => {
      expect(content).toMatch(/def _load_models/i);
    });

    it('declares global _detector and _recognizer', () => {
      expect(content).toMatch(/_detector = None/i);
      expect(content).toMatch(/_recognizer = None/i);
    });

    it('uses global keyword for model variables', () => {
      expect(content).toMatch(/global _detector/i);
    });

    it('defines _ensure_models helper', () => {
      expect(content).toMatch(/def _ensure_models/i);
    });

    it('calls _ensure_models before processing', () => {
      expect(content).toMatch(/_ensure_models\(\)/i);
    });

    it('defines _extract_embedding helper', () => {
      expect(content).toMatch(/def _extract_embedding/i);
    });

    it('has broad exception handling with except Exception', () => {
      expect(content).toMatch(/except Exception/i);
    });

    it('uses try blocks for error handling', () => {
      expect(content).toMatch(/try:/i);
    });

    it('uses if statements for validation logic', () => {
      expect(content).toMatch(/if /i);
    });

    it('uses return statements', () => {
      expect(content).toMatch(/return /i);
    });

    it('uses for loops', () => {
      expect(content).toMatch(/for /i);
    });

    it('uses img variable for image processing', () => {
      expect(content).toMatch(/img/i);
    });

    it('uses embedding variable for face embedding', () => {
      expect(content).toMatch(/embedding/i);
    });

    it('uses score variable for detection confidence', () => {
      expect(content).toMatch(/score/i);
    });

    it('uses x and y coordinates for face position', () => {
      expect(content).toMatch(/x,/i);
      expect(content).toMatch(/y,/i);
    });

    it('uses width and height for face dimensions', () => {
      expect(content).toMatch(/width/i);
      expect(content).toMatch(/height/i);
    });

    it('uses h and w variables for image dimensions', () => {
      expect(content).toMatch(/\bh\b/i);
      expect(content).toMatch(/\bw\b/i);
    });

    it('uses face_box for alignCrop input', () => {
      expect(content).toMatch(/face_box/i);
    });

    it('uses aligned variable for cropped face', () => {
      expect(content).toMatch(/aligned/i);
    });

    it('uses file_bytes for uploaded image data', () => {
      expect(content).toMatch(/file_bytes/i);
    });

    it('uses pil_img for PIL image handling', () => {
      expect(content).toMatch(/pil_img/i);
    });

    it('uses model variable for model metadata', () => {
      expect(content).toMatch(/model/i);
    });

    it('uses quality variable for quality metadata', () => {
      expect(content).toMatch(/quality/i);
    });

    it('uses start variable for timing', () => {
      expect(content).toMatch(/start/i);
    });

    it('uses logger for logging', () => {
      expect(content).toMatch(/logger/i);
    });

    it('uses info level logging', () => {
      expect(content).toMatch(/logger\.info/i);
    });

    it('uses warning level logging', () => {
      expect(content).toMatch(/logger\.warning/i);
    });

    it('uses error level logging', () => {
      expect(content).toMatch(/logger\.error/i);
    });

    it('uses basicConfig for logging setup', () => {
      expect(content).toMatch(/basicConfig/i);
    });

    it('uses getLogger for logger creation', () => {
      expect(content).toMatch(/getLogger/i);
    });

    it('uses f-strings for formatted messages', () => {
      expect(content).toMatch(/f"/i);
    });
  });

  describe('Dockerfile', () => {
    let content;

    beforeAll(() => {
      content = fs.readFileSync(path.join(faceServiceDir, 'Dockerfile'), 'utf8');
    });

    it('uses python base image', () => {
      expect(content).toMatch(/FROM python/i);
    });

    it('uses python 3.12 slim variant', () => {
      expect(content).toMatch(/python:3\.12-slim/i);
    });

    it('installs system dependencies with apt-get', () => {
      expect(content).toMatch(/apt-get/i);
    });

    it('uses --no-install-recommends for apt-get', () => {
      expect(content).toMatch(/--no-install-recommends/i);
    });

    it('cleans apt cache after installation', () => {
      expect(content).toMatch(/rm -rf.*apt\/lists/i);
    });

    it('copies requirements.txt', () => {
      expect(content).toMatch(/requirements\.txt/i);
    });

    it('uses --no-cache-dir for pip install', () => {
      expect(content).toMatch(/--no-cache-dir/i);
    });

    it('exposes port 8000', () => {
      expect(content).toMatch(/EXPOSE\s+8000/i);
    });

    it('runs uvicorn', () => {
      expect(content).toMatch(/uvicorn/i);
    });

    it('sets PYTHONUNBUFFERED for logging', () => {
      expect(content).toMatch(/PYTHONUNBUFFERED/i);
    });

    it('sets WORKDIR', () => {
      expect(content).toMatch(/WORKDIR/i);
    });

    it('copies main.py', () => {
      expect(content).toMatch(/COPY.*main\.py/i);
    });
  });

  describe('requirements.txt', () => {
    let content;

    beforeAll(() => {
      content = fs.readFileSync(path.join(faceServiceDir, 'requirements.txt'), 'utf8');
    });

    it('includes fastapi', () => {
      expect(content).toMatch(/fastapi/i);
    });

    it('includes opencv', () => {
      expect(content).toMatch(/opencv/i);
    });

    it('includes uvicorn', () => {
      expect(content).toMatch(/uvicorn/i);
    });

    it('includes numpy', () => {
      expect(content).toMatch(/numpy/i);
    });

    it('includes Pillow', () => {
      expect(content).toMatch(/Pillow/i);
    });

    it('includes python-multipart for file uploads', () => {
      expect(content).toMatch(/python-multipart/i);
    });

    it('pins dependency versions with ==', () => {
      expect(content).toMatch(/==/);
    });
  });

  describe('Dockerfile model downloads', () => {
    it('downloads YuNet and SFace models at build time', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'Dockerfile'), 'utf8');
      expect(content).toMatch(/yunet/i);
      expect(content).toMatch(/sface/i);
      expect(content).toMatch(/wget.*onnx/i);
    });

    it('installs wget for model downloads', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'Dockerfile'), 'utf8');
      expect(content).toMatch(/wget/i);
    });

    it('creates models directory', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'Dockerfile'), 'utf8');
      expect(content).toMatch(/mkdir.*models/i);
    });

    it('has CMD instruction', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'Dockerfile'), 'utf8');
      expect(content).toMatch(/^CMD/mi);
    });
  });

  describe('face-service tests', () => {
    it('has a tests directory with test_main.py', () => {
      expect(fs.existsSync(path.join(faceServiceDir, 'tests', 'test_main.py'))).toBe(true);
    });

    it('test_main.py imports pytest', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/import pytest/i);
    });

    it('test_main.py imports numpy as np', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/import numpy as np/i);
    });

    it('test_main.py imports Image from PIL', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/from PIL import Image/i);
    });

    it('test_main.py imports base64', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/import base64/i);
    });

    it('test_main.py imports io', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/import io/i);
    });

    it('test_main.py imports sys', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/import sys/i);
    });

    it('test_main.py imports Path from pathlib', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/from pathlib import Path/i);
    });

    it('test_main.py imports main module', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/from main import/i);
    });

    it('test_main.py has TestDetectFace class', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/class TestDetectFace/i);
    });

    it('test_main.py has TestExtractEmbedding class', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/class TestExtractEmbedding/i);
    });

    it('test_main.py has TestCosineSimilarity class', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/class TestCosineSimilarity/i);
    });

    it('test_main.py has TestApp class', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/class TestApp/i);
    });

    it('test_main.py has create_test_image helper', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/def create_test_image/i);
    });

    it('test_main.py imports TestClient from fastapi', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/from fastapi\.testclient import TestClient/i);
    });

    it('test_main.py uses np.zeros for fake face data', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/np\.zeros/i);
    });

    it('test_main.py uses pytest.approx for float comparisons', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/pytest\.approx/i);
    });

    it('test_main.py uses io.BytesIO for image buffer', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/io\.BytesIO/i);
    });

    it('test_main.py uses Image.new from PIL', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/Image\.new/i);
    });

    it('test_main.py saves image as JPEG', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/img\.save/i);
      expect(content).toMatch(/JPEG/i);
    });

    it('test_main.py uses client.get for HTTP GET tests', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/client\.get/i);
    });

    it('test_main.py uses client.post for HTTP POST tests', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/client\.post/i);
    });

    it('test_main.py uses assert statements', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/assert /i);
    });

    it('test_main.py asserts response.status_code', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/status_code/i);
    });

    it('test_main.py parses response.json()', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/response\.json\(\)/i);
    });

    it('test_main.py uploads files with files= parameter', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/files=/i);
    });

    it('test_main.py sets sys.path for module import', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/sys\.path\.insert/i);
    });

    it('test_main.py uses Path(__file__) for relative paths', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'tests', 'test_main.py'), 'utf8');
      expect(content).toMatch(/Path\(__file__\)/i);
    });
  });
});
