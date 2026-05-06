# Face ID V1 — Deferred Optimizations

## Performance & Scale
- Add face recognition latency benchmarks (p50/p95/p99 thresholds)
- Add load tests for concurrent recognition requests
- Add embedding cache in Redis for frequently recognized customers
- Add batch register endpoint for importing multiple customer photos

## Quality & Safety
- Add image quality validation (blur detection, lighting checks) before processing
- Add face liveness detection to prevent photo spoofing
- Add retry logic with exponential backoff for face-service transient failures
- Add circuit breaker pattern for face-service health degradation

## Maintainability
- Add TypeScript type tests to verify frontend API client matches backend response shapes
- Add contract tests (Pact) between frontend and backend
- Add embedding versioning to support future model upgrades
- Add automated migration rollback tests

## Future Features
- Support multiple face models (ArcFace, MobileFaceNet) with A/B testing
- Add face clustering for deduplication
- Add face recognition analytics dashboard
- Support video stream recognition (not just still images)
