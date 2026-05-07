export type DetectionState = 'scanning' | 'detected' | 'capturing';
export type FaceCaptureMode = 'single' | 'profile';
export type CapturedFaceImages = Blob | readonly Blob[] | null;
export type CapturePoseId = 'center' | 'left' | 'right';

export type CapturePose = {
  readonly id: CapturePoseId;
  readonly labelKey: string;
  readonly fallbackLabel: string;
  readonly hintKey: string;
  readonly fallbackHint: string;
};

export const PROFILE_POSES: readonly CapturePose[] = [
  {
    id: 'center',
    labelKey: 'faceCapture.poseStraight',
    fallbackLabel: 'Look straight',
    hintKey: 'faceCapture.poseStraightHint',
    fallbackHint: 'Hold the face inside the outline.',
  },
  {
    id: 'left',
    labelKey: 'faceCapture.poseLeft',
    fallbackLabel: 'Turn head left',
    hintKey: 'faceCapture.poseLeftHint',
    fallbackHint: 'Turn head to the left, hold steady, then tap Capture.',
  },
  {
    id: 'right',
    labelKey: 'faceCapture.poseRight',
    fallbackLabel: 'Turn head right',
    hintKey: 'faceCapture.poseRightHint',
    fallbackHint: 'Turn head to the right, hold steady, then tap Capture.',
  },
];
