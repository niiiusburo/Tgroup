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
    capture: number;
    upload: number;
    total: number;
  };
  imageSize: number;
  resolution: string;
  error?: string;
}

export interface FaceLabModuleProps {
  onResult: (result: ModuleResult) => void;
}
