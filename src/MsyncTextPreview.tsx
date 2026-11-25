import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { indexMsync, msyncHighlight } from "./msyncHighlight.js";

export function MsyncTextPreview({ source, timeMs, command }: {
  source: string; timeMs?: number; command?: string;
}) {
  const index = useMemo(() => indexMsync(source), [source]);
  const { cue, definition } = msyncHighlight(index, timeMs, command);
  const windowRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useLayoutEffect(() => {
    const editor = windowRef.current;
    if (!editor) return;
    if (cue !== undefined) {
      const styles = getComputedStyle(editor);
      const lineHeight = parseFloat(styles.lineHeight);
      const top = parseFloat(styles.paddingTop) + cue * lineHeight;
      if (top < editor.scrollTop) editor.scrollTop = top;
      else if (top + lineHeight > editor.scrollTop + editor.clientHeight) {
        editor.scrollTop = top + lineHeight - editor.clientHeight;
      }
    }
    setScrollTop(editor.scrollTop);
  }, [cue, source]);

  const highlighted = [["definition", definition], ["cue", cue]] as const;
  return <div className="msync-text-preview">
    <h3>Live MSYNC Preview</h3>
    <div className="msync-text-window">
      <div className="msync-highlight-layer" aria-hidden="true">
        {highlighted.map(([kind, line]) => line !== undefined && <div key={kind}
          className={"msync-highlight msync-highlight-" + kind} data-line={line + 1}
          style={{ top: `calc(var(--msync-padding) + ${line} * var(--msync-line) - ${scrollTop}px)` }} />)}
      </div>
      <textarea ref={windowRef} className="live-msync" aria-label="Live MSYNC Preview"
        readOnly value={source} wrap="off" spellCheck={false}
        onScroll={event => setScrollTop(event.currentTarget.scrollTop)} />
    </div>
    {cue !== undefined && <p className="msync-line-key">
      <span className="msync-key-cue">Cue · line {cue + 1}</span>
      {definition !== undefined && <span className="msync-key-definition">Definition · line {definition + 1}</span>}
    </p>}
  </div>;
}
