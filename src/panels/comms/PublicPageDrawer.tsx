// OWNER: Agent B (Kaustubh). Mock of MochaTrade's public incident page. Rendered inside
// the shared drawer shell (App.tsx) when activeDrawer === 'public_page'.
import { useStore, useMakegoodTotals } from '../../core/store';
import { T } from '../../core/engine';
import { fmtPct, fmtT, fmtUSD } from '../../core/format';
import { PriceChart, PriceLegend } from '../incident';

/** The date the Deviation Doctrine and band were published, before launch. */
export const RULE_PUBLISHED_ON = '1 September 2025';

function Stat({ label, value, sub, accent = 'text-ink' }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 p-4">
      <div className="text-[11px] font-medium tracking-wider text-muted uppercase">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold ${accent}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export function PublicPageDrawer() {
  const simTime = useStore((s) => s.simTime);
  const phase = useStore((s) => s.phase);
  const bandPct = useStore((s) => s.bandPct);
  const reserveBalance = useStore((s) => s.reserveBalance);
  const reserveStart = useStore((s) => s.reserveStart);
  const liquidations = useStore((s) => s.liquidations);
  const comms = useStore((s) => s.comms);
  const { count, total } = useMakegoodTotals();

  const tested = phase !== 'setup' && simTime >= T.deviationTest;
  const paid = liquidations.filter((l) => l.status === 'paid').length;
  const latest = [...comms].reverse().find((c) => c.status === 'sent' && (c.channel === 'status_page' || c.channel === 'x_post'));

  let verdict: { tone: string; headline: string; detail: string };
  if (phase === 'setup') {
    verdict = { tone: 'border-line', headline: 'All systems normal', detail: 'No incident in progress.' };
  } else if (!tested) {
    verdict = {
      tone: 'border-cyan/40',
      headline: 'Investigating unusual price movement',
      detail: `New leverage is paused; exits are open. Every liquidation will be tested against the reference median at ${fmtT(T.deviationTest)}.`,
    };
  } else if (count > 0) {
    verdict = {
      tone: 'border-orange/50',
      headline: 'Our price was wrong. We are making it right.',
      detail: `${count} liquidations executed more than ${fmtPct(bandPct)} from the reference median. We owe ${fmtUSD(total)}.`,
    };
  } else {
    verdict = {
      tone: 'border-green/50',
      headline: 'The market moved. Our price did not.',
      detail: `All ${liquidations.length} liquidations executed within the ${fmtPct(bandPct)} band. No makegoods are owed.`,
    };
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span className="font-semibold tracking-wider text-ink uppercase">status.mochatrade.example</span>
        <span className="num">Updated {phase === 'setup' ? '—' : fmtT(simTime)}</span>
      </div>

      <div className={`rounded-xl border bg-surface-2/50 p-5 ${verdict.tone}`}>
        <div className="text-[11px] font-semibold tracking-widest text-cyan uppercase">Verdict</div>
        <h3 className="mt-1 text-xl font-semibold text-ink">{verdict.headline}</h3>
        <p className="mt-1 text-sm text-muted">{verdict.detail}</p>
      </div>

      <section>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h4 className="text-sm font-semibold text-ink">Three reference feeds vs our execution price</h4>
          <PriceLegend />
        </div>
        <div className="rounded-xl border border-line bg-navy/40 p-3">
          <PriceChart height={260} />
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          Reference price = median of three independent feeds. Shaded area = the ±{fmtPct(bandPct)} deviation band.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Deviation band" value={`±${fmtPct(bandPct)}`} sub="Published before launch" />
        <Stat
          label="Makegoods"
          value={tested ? String(count) : '—'}
          sub={tested ? (count > 0 ? `${paid} of ${count} paid` : 'None owed') : `Tested at ${fmtT(T.deviationTest)}`}
          accent={tested && count > 0 ? 'text-orange' : 'text-ink'}
        />
        <Stat label="Total owed" value={tested ? fmtUSD(total) : '—'} sub="Restores positions; never pays profit" />
        <Stat
          label="Integrity Reserve"
          value={fmtUSD(reserveBalance)}
          sub={reserveBalance < reserveStart ? `Paid out ${fmtUSD(reserveStart - reserveBalance)} · live balance` : 'Live balance · 10% of gross fees'}
          accent="text-green"
        />
      </div>

      {latest && (
        <section className="rounded-xl border border-line bg-surface-2/40 p-4">
          <div className="num text-[11px] text-muted">Latest update · {fmtT(latest.t)}</div>
          <div className="mt-0.5 text-sm font-semibold text-ink">{latest.title}</div>
          <p className="mt-1 text-xs leading-relaxed text-ink/80">{latest.body}</p>
        </section>
      )}

      <div className="rounded-xl border border-cyan/25 bg-cyan/5 p-4 text-sm text-ink">
        <p className="font-medium">&ldquo;We pay when our price was wrong. We never pay because the market was.&rdquo;</p>
        <p className="mt-1 text-xs text-muted">
          This rule was published on {RULE_PUBLISHED_ON} and did not change during the incident.
        </p>
      </div>
    </div>
  );
}
