FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py liveness.py .

# Download models at build time
RUN mkdir -p /app/models && \
    wget -q -O /app/models/face_detection_yunet_2023mar.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx && \
    wget -q -O /app/models/face_recognition_sface_2021dec.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx

# Liveness (anti-spoofing) MiniFASNet models — best-effort. A download failure must
# NOT break the image: the service fails open (liveness disabled) when models are
# absent. Source: QingHeYang/Silent-Face-Anti-Spoofing-onnx (cv2.dnn-loadable).
RUN wget -q -O /app/models/2.7_80x80_MiniFASNetV2.onnx \
        https://raw.githubusercontent.com/QingHeYang/Silent-Face-Anti-Spoofing-onnx/main/onnx/2.7_80x80_MiniFASNetV2.onnx \
    && wget -q -O /app/models/4_0_0_80x80_MiniFASNetV1SE.onnx \
        https://raw.githubusercontent.com/QingHeYang/Silent-Face-Anti-Spoofing-onnx/main/onnx/4_0_0_80x80_MiniFASNetV1SE.onnx \
    || echo "WARNING: liveness model download failed; liveness fails open (disabled) until models are provided"

ENV MODEL_DIR=/app/models
ENV DETECTION_THRESHOLD=0.90
ENV PYTHONUNBUFFERED=1
# Liveness defaults: OFF until calibrated with real clinic captures (see Face ID spec).
ENV LIVENESS_ENABLED=false
ENV LIVENESS_THRESHOLD=0.5

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
