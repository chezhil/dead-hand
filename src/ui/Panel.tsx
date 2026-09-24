import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}

/** The rounded card every panel sits in. Use it in your slot so the grid stays consistent. */
export function Panel({ title, subtitle, right, className = '', bodyClassName = '', children }: PanelProps) {
  return (
    <section className={`flex min-w-0 flex-col rounded-xl border border-line bg-surface ${className}`}>
      <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-wide text-ink uppercase">{title}</h2>
          {subtitle && <div className="mt-0.5 text-xs text-muted">{subtitle}</div>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      <div className={`min-h-0 min-w-0 flex-1 px-4 pb-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export type Tone = 'cyan' | 'orange' | 'green' | 'muted';

const TONE: Record<Tone, string> = {
  cyan: 'border-cyan/40 bg-cyan/10 text-cyan',
  orange: 'border-orange/40 bg-orange/10 text-orange',
  green: 'border-green/40 bg-green/10 text-green',
  muted: 'border-line bg-surface-2 text-muted',
};

/** Small status chip. Always pair colour with a word; never colour alone. */
export function Pill({ tone, children, className = '' }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Dot({ tone }: { tone: Tone }) {
  const bg = { cyan: 'bg-cyan', orange: 'bg-orange', green: 'bg-green', muted: 'bg-muted' }[tone];
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${bg}`} />;
}

/** Dashed placeholder used by slots that haven't been built yet. */
export function SlotPlaceholder({ owner, children }: { owner: string; children?: ReactNode }) {
  return (
    <div className="flex h-full min-h-20 flex-col justify-center rounded-lg border border-dashed border-line px-3 py-3 text-xs text-muted">
      <div>Slot reserved for {owner}.</div>
      {children && <div className="mt-1 text-ink/80">{children}</div>}
    </div>
  );
}
