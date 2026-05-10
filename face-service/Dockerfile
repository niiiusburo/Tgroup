# syntax=docker/dockerfile:1.7
FROM python:3.11-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 wget \
    && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY face-service/requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

FROM base AS models
RUN mkdir -p /app/models && \
    wget -q -O /app/models/face_detection_yunet_2023mar.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx && \
    wget -q -O /app/models/face_recognition_sface_2021dec.onnx \
        https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx

FROM base AS runtime
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=models /app/models /app/models
COPY face-service/main.py .
ENV MODEL_DIR=/app/models
ENV DETECTION_THRESHOLD=0.90
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
