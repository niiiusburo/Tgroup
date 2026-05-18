export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  strategy: 'native' | 'quality-only' | 'highres' | 'burst';
  videoConstraints: MediaTrackConstraints;
  jpegQuality: number;
  autoScoreThreshold: number;
  readyFramesNeeded: number;
  burstFrameCount?: number;
  burstIntervalMs?: number;
}

export interface ModuleResult {
  moduleId: string;
  match: {
    partnerId: string;
    name: string;
    confidence: number;
  } | null;
  candidates: Array<{
    partnerId: string;
    name: string;
    confidence: number;
  }>;
  timing: {
    detect: number;
    capture: number;
    upload: number;
    total: number;
  };
  imageSize: number;
  resolution: string;
  framesEvaluated: number;
  bestFrameScore: number;
  error?: string;
}
