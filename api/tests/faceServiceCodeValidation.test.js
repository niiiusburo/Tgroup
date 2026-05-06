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

    it('defines _decode_image helper', () => {
      expect(content).toMatch(/def _decode_image/i);
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

    it('copies requirements.txt', () => {
      expect(content).toMatch(/requirements\.txt/i);
    });

    it('exposes port 8000', () => {
      expect(content).toMatch(/EXPOSE\s+8000/i);
    });

    it('runs uvicorn', () => {
      expect(content).toMatch(/uvicorn/i);
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
  });

  describe('Dockerfile model downloads', () => {
    it('downloads YuNet and SFace models at build time', () => {
      const content = fs.readFileSync(path.join(faceServiceDir, 'Dockerfile'), 'utf8');
      expect(content).toMatch(/yunet/i);
      expect(content).toMatch(/sface/i);
      expect(content).toMatch(/wget.*onnx/i);
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
  });
});
