'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export interface ConsoleSheetProps {
  readonly open: boolean;
  readonly title: string;
  /** Visible and accessible label of the close button. */
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

function dialogSupported(): boolean {
  return typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function';
}

/**
 * Bottom sheet on the native modal dialog. showModal() gives the focus trap,
 * Escape and focus return; children are mounted only while open.
 */
export function ConsoleSheet({ open, title, closeLabel, onClose, children }: ConsoleSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const supported = dialogSupported();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !supported) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open, supported]);

  const heading = (
    <div className="sheetHead">
      <h2 className="sheetTitle">{title}</h2>
      <button type="button" className="sheetClose" onClick={() => (supported ? ref.current?.close() : onClose())}>
        {closeLabel}
      </button>
    </div>
  );

  if (!supported) {
    if (!open) return null;
    return (
      <section className="sheet sheetInline" aria-label={title}>
        {heading}
        <div className="sheetBody">{children}</div>
      </section>
    );
  }

  return (
    <dialog ref={ref} className="sheet" aria-label={title} onClose={onClose}>
      {open ? (
        <>
          {heading}
          <div className="sheetBody">{children}</div>
        </>
      ) : null}
    </dialog>
  );
}
