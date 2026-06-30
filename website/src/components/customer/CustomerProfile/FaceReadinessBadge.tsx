import { AlertTriangle, CheckCircle2, ScanFace, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FaceReadinessLabel, FaceStatusResult } from '@/lib/api';

interface FaceReadinessBadgeProps {
  readonly faceStatus?: FaceStatusResult | null;
}

const labelKey: Record<FaceReadinessLabel, string> = {
  excellent: 'excellent',
  good: 'good',
  needs_retake: 'needsRetake',
  not_registered: 'notRegistered',
};

const defaultLabel: Record<FaceReadinessLabel, string> = {
  excellent: 'Excellent',
  good: 'Good',
  needs_retake: 'Needs retake',
  not_registered: 'Not registered',
};

function variantFor(label: FaceReadinessLabel) {
  if (label === 'excellent') {
    return {
      Icon: ShieldCheck,
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    };
  }
  if (label === 'good') {
    return {
      Icon: CheckCircle2,
      className: 'bg-sky-50 text-sky-700 ring-sky-200',
    };
  }
  if (label === 'needs_retake') {
    return {
      Icon: AlertTriangle,
      className: 'bg-amber-50 text-amber-700 ring-amber-200',
    };
  }
  return {
    Icon: ScanFace,
    className: 'bg-gray-50 text-gray-600 ring-gray-200',
  };
}

export function FaceReadinessBadge({ faceStatus }: FaceReadinessBadgeProps) {
  const { t } = useTranslation('customers');
  const readiness = faceStatus?.readiness;
  if (!readiness) return null;

  const { Icon, className } = variantFor(readiness.label);
  const title = t('face.readinessTitle', {
    defaultValue: 'Face ID readiness: {{score}}% ({{count}}/{{target}} samples) - {{label}}',
    score: readiness.score,
    count: faceStatus.sampleCount,
    target: readiness.targetSampleCount,
    label: t(`face.readinessLabels.${labelKey[readiness.label]}`, defaultLabel[readiness.label]),
  });

  return (
    <span
      data-testid="profile-face-readiness"
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span>{readiness.score}%</span>
      <span className="text-current/70">&middot;</span>
      <span>{faceStatus.sampleCount}/{readiness.targetSampleCount}</span>
    </span>
  );
}
