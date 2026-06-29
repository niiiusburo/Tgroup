# Face ID Strictness Research

Date: 2026-06-29
Scope: NK2 Face ID recognition strictness and downloadable/reference libraries.

## Direct Recommendation

Use stricter acceptance policy first, then benchmark a provider/model swap with real NK2 enrollment samples before replacing live Face ID.

Immediate NK2 policy:
- Auto-match threshold: `0.92`
- Candidate threshold: `0.84`
- Top-vs-second margin: `0.05`
- Staff header candidate-only results: rescan-only, no candidate identity buttons

This reduces false accepts. It will also increase false rejects, so operators should expect more "clearer scan" states.

## Upstream References

- CompreFace similarity threshold docs: https://github.com/exadel-inc/CompreFace/blob/master/docs/Face-Recognition-Similarity-Threshold.md
  - CompreFace explicitly says no face recognition service is 100% accurate and threshold choice trades unknown faces being accepted against known faces being rejected.
- CompreFace REST API docs: https://github.com/exadel-inc/CompreFace/blob/master/docs/Rest-API-description.md
  - Recognition supports `prediction_count`, `det_prob_threshold`, returned subject similarities, and detection probability fields.
- OpenCV SFace ONNX model: https://github.com/opencv/opencv_zoo/blob/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx
  - This is the local-provider SFace model family already represented by `FACE_RECOGNITION_PROVIDER=local`.
- OpenVINO ArcFace ONNX model: https://docs.openvino.ai/2023.3/omz_models_model_face_recognition_resnet100_arcface_onnx.html
  - Downloadable ArcFace/ResNet100 ONNX model with 512-dimensional embeddings and published LFW accuracy for benchmark evaluation.
- InsightFace project: https://github.com/deepinsight/insightface
  - Reference implementation for modern face detection, alignment, and recognition families such as ArcFace; model-license review is required before commercial clinic use.
- NIST FRTE 1:N: https://pages.nist.gov/frvt/html/frvt1N.html
  - Production face identification should be thresholded against false-positive identification rate; "100%" is not a valid operating assumption.

## Handoff

Do not switch models live until these are done:
- Build a local benchmark set from consented NK2 samples with same-person and different-person pairs.
- Compare current CompreFace, local OpenCV SFace, and ArcFace/InsightFace candidates on the same images.
- Pick thresholds from the benchmark target, favoring low false accept rate for the clinic.
- If embedding dimension/model changes for the local provider, re-register affected local-provider samples per `INV-005`. CompreFace examples are provider-owned and should be re-enrolled only through explicit re-register.
