const { execSync } = require('child_process');

describe('face-service model URLs', () => {
  it('YuNet detector model URL is reachable', () => {
    const url = 'https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx';
    const result = execSync(`curl -s -L -o /dev/null -w "%{http_code}" "${url}"`, { encoding: 'utf8', timeout: 15000 });
    expect(result.trim()).toBe('200');
  }, 20000);

  it('SFace recognizer model URL is reachable', () => {
    const url = 'https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx';
    const result = execSync(`curl -s -L -o /dev/null -w "%{http_code}" "${url}"`, { encoding: 'utf8', timeout: 15000 });
    expect(result.trim()).toBe('200');
  }, 20000);
});
