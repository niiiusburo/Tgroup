import { useEffect, useState } from 'react';
import { ChevronRight, FileText, X } from 'lucide-react';
import type { ChangelogEntry } from './types';

interface ReleaseNotesModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly currentVersion: string;
}

export function ReleaseNotesModal({ isOpen, onClose, currentVersion }: ReleaseNotesModalProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/CHANGELOG.json?v=' + Date.now(), { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: ChangelogEntry[]) => {
        setEntries(data);
        const currentEntry = data.find(e => e.version === currentVersion);
        setExpandedVersion(currentEntry?.version ?? data[0]?.version ?? null);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [isOpen, currentVersion]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">Release Notes</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="py-8 text-center text-gray-400">No release notes found</div>
          ) : (
            entries.map((entry) => {
              const isExpanded = expandedVersion === entry.version;
              const isCurrentVersion = entry.version === currentVersion;
              return (
                <div
                  key={entry.version}
                  className={`border rounded-xl overflow-hidden ${isCurrentVersion ? 'border-primary/30 ring-1 ring-primary/20' : 'border-gray-200'}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedVersion(isExpanded ? null : entry.version)}
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${
                      isCurrentVersion ? 'bg-orange-50/50 hover:bg-orange-50' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${isCurrentVersion ? 'text-primary' : 'text-gray-900'}`}>
                        v{entry.version}
                      </span>
                      {isCurrentVersion && (
                        <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-medium">
                          Current
                        </span>
                      )}
                      {entry.forceUpdate && (
                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                          Critical
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{entry.date}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 space-y-3">
                      <p className="text-sm text-gray-600 font-medium">{entry.highlights}</p>
                      {entry.sections.map((section) => (
                        <div key={section.title}>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">{section.title}</h4>
                          <ul className="space-y-1">
                            {section.items.map((item, i) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-primary mt-1.5 shrink-0 w-1 h-1 rounded-full bg-primary" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
