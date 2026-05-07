import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableTextProps {
  readonly text: string;
  readonly maxLines?: number;
  readonly className?: string;
  readonly expandable?: boolean;
  readonly showTooltip?: boolean;
}

/**
 * ExpandableText — truncates long text with line-clamp and provides
 * hover tooltip + inline expand/collapse when content overflows.
 *
 * @behavior
 *   - Renders with CSS line-clamp by default.
 *   - Measures overflow via ref (scrollHeight > clientHeight).
 *   - When overflow detected and expandable=true, shows expand button.
 *   - Hovering the text shows a native tooltip with full content.
 *   - Clicking expand removes line-clamp; collapse restores it.
 */
export function ExpandableText({
  text,
  maxLines = 1,
  className = '',
  expandable = true,
  showTooltip = true,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  const checkOverflow = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [checkOverflow, text, maxLines, isExpanded]);

  const lineClampClass = maxLines === 1
    ? 'line-clamp-1'
    : maxLines === 2
    ? 'line-clamp-2'
    : maxLines === 3
    ? 'line-clamp-3'
    : 'line-clamp-1';

  const displayText = text || '—';

  return (
    <span className={`inline-flex items-start gap-1 ${className}`}>
      <span
        ref={textRef}
        className={isExpanded ? '' : lineClampClass}
        title={showTooltip && isOverflowing && !isExpanded ? displayText : undefined}
      >
        {displayText}
      </span>
      {expandable && isOverflowing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className="shrink-0 mt-0.5 inline-flex items-center text-[10px] font-medium text-primary hover:text-primary-dark bg-primary/5 hover:bg-primary/10 rounded px-1 py-0.5 transition-colors"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      )}
    </span>
  );
}

/**
 * TruncatedCell — table-cell wrapper around ExpandableText.
 * Prevents row-click propagation when toggling expand.
 */
export function TruncatedCell({
  text,
  maxLines = 1,
  className = '',
  expandable = true,
}: Omit<ExpandableTextProps, 'showTooltip'>) {
  return (
    <span className={className} onClick={(e) => e.stopPropagation()}>
      <ExpandableText text={text} maxLines={maxLines} expandable={expandable} />
    </span>
  );
}
