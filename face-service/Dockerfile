FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Download models at build time
RUN mkdir -p /app/models && \
    wget -q -O /app/models/face_detection_yunet_2023mar.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx && \
    wget -q -O /app/models/face_recognition_sface_2021dec.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx

ENV MODEL_DIR=/app/models
# DETECTION_THRESHOLD is read by main.py as QUALITY_THRESHOLD (the bar above
# which a detected face is accepted — i.e. LOW_QUALITY gate).
# DETECTOR_SCORE_THRESHOLD is read separately as the YuNet raw score cutoff.
# Setting both keeps the Dockerfile contract aligned with main.py; previously
# only DETECTION_THRESHOLD was set, leaving the detector on the 0.5 default.
ENV DETECTION_THRESHOLD=0.90
ENV DETECTOR_SCORE_THRESHOLD=0.60
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
