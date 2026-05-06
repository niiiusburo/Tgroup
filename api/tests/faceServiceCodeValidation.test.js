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

    it('imports FastAPI', () => {
      expect(content).toMatch(/from fastapi import FastAPI/i);
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

    it('reads DETECTION_THRESHOLD from environment', () => {
      expect(content).toMatch(/DETECTION_THRESHOLD/i);
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

    it('imports OpenCV', () => {
      expect(content).toMatch(/import cv2/i);
    });

    it('defines /health endpoint', () => {
      expect(content).toMatch(/@app\.get\(["']\/health["']\)/i);
    });

    it('defines /embed endpoint', () => {
      expect(content).toMatch(/@app\.post\(["']\/embed["']\)/i);
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

    it('uses cv2.FaceRecognizerSF', () => {
      expect(content).toMatch(/cv2\.FaceRecognizerSF/i);
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

    it('uses alignCrop for face alignment', () => {
      expect(content).toMatch(/alignCrop/i);
    });

    it('uses feature extraction after alignment', () => {
      expect(content).toMatch(/\.feature\(/i);
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

    it('returns quality metadata in response', () => {
      expect(content).toMatch(/"quality":/i);
    });

    it('rounds detection score in quality metadata', () => {
      expect(content).toMatch(/round\(.*4\)/i);
    });

    it('validates image content_type', () => {
      expect(content).toMatch(/content_type/i);
      expect(content).toMatch(/image\//i);
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

    it('uses cv2.cvtColor for PIL fallback color conversion', () => {
      expect(content).toMatch(/cv2\.cvtColor/i);
      expect(content).toMatch(/COLOR_RGB2BGR/i);
    });

    it('defines _extract_embedding helper', () => {
      expect(content).toMatch(/def _extract_embedding/i);
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
