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
  });
});
