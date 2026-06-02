import { useEffect, useState, type RefObject } from 'react';

const FEEDBACK_DIALOG_SELECTORS = '[role="dialog"], .modal-container';

export function useObjectUrls(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => {
      next.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  return urls;
}

export function useBlockingDialogPresence(panelRef: RefObject<HTMLDivElement>) {
  const [hasBlockingDialog, setHasBlockingDialog] = useState(false);

  useEffect(() => {
    function checkDialogs() {
      const dialogs = Array.from(document.querySelectorAll(FEEDBACK_DIALOG_SELECTORS));
      setHasBlockingDialog(
        dialogs.some((dialog) => {
          if (!(dialog instanceof HTMLElement)) return false;
          if (panelRef.current?.contains(dialog)) return false;
          return dialog.offsetParent !== null || getComputedStyle(dialog).position === 'fixed';
        })
      );
    }

    checkDialogs();
    const observer = new MutationObserver(checkDialogs);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'role'] });
    return () => observer.disconnect();
  }, [panelRef]);

  return hasBlockingDialog;
}
