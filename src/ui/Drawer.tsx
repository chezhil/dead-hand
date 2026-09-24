import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CloseIcon } from './icons';

interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Right-hand slide-over. Esc or the backdrop closes it. */
export function Drawer({ open, title, subtitle, onClose, children }: DrawerProps) {
  // Captured on first render, before focus moves into the drawer.
  const [returnFocus] = useState(() => document.activeElement as HTMLElement | null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      returnFocus?.focus?.();
    };
  }, [open, onClose, returnFocus]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <div className="print-hide absolute inset-0 bg-navy/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex h-full w-[min(760px,92vw)] flex-col border-l border-line bg-surface shadow-2xl">
        <div className="print-hide flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button ref={closeRef} onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
