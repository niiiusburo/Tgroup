import type { UpdateSeverity } from '@/hooks/useVersionCheck';

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  commit: string;
  highlights: string;
  sections: ChangelogSection[];
  severity?: UpdateSeverity;
  forceUpdate?: boolean;
}
