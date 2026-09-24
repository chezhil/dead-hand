// OWNER: Agent B (Kaustubh). What one liquidated user saw, as a phone-shaped card.
// Rendered inside the shared drawer shell when activeDrawer === 'user'; reads selectedUserId.
import { Bell } from 'lucide-react';
import { useStore } from '../../core/store';
import { payoutSummary, T } from '../../core/engine';
import { exceedsBand, fmtPct, fmtT, fmtUSD } from '../../core/format';
import type { Liquidation } from '../../core/types';

function Row({ label, value, accent = 'text-ink' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-muted">{label}</span>
      <span className={`num font-medium ${accent}`}>{value}</span>
    </div>
  );
}

function plainLanguage(l: Liquidation, bandPct: number, paidRatio: number): { tone: string; text: string } {
  if (l.verdict === 'pending') {
    return {
      tone: 'border-line bg-surface-2/60 text-ink/85',
      text: `Your liquidation will be checked automatically at ${fmtT(T.deviationTest)}. If our price was more than ${fmtPct(bandPct)} away from the reference median, we restore your position. You don't need to do anything.`,
    };
  }
  if (l.verdict === 'makegood') {
    const status =
      l.status === 'paid'
        ? paidRatio < 1
          ? `The Integrity Reserve ran short, so every user was paid ${fmtPct(paidRatio * 100, 1)} (${fmtUSD(l.amountOwed * paidRatio)} to you). The shortfall has been publicly disclosed.`
          : 'It has been paid into your account from the Integrity Reserve.'
        : l.status === 'confirmed'
          ? 'Payment has been confirmed and is on its way.'
          : l.status === 'queued'
            ? 'It is queued and will be paid from the Integrity Reserve.'
            : `It will be queued at ${fmtT(T.makegoodsQueued)}.`;
    return {
      tone: 'border-orange/40 bg-orange/10 text-ink',
      text: `Our price was wrong for you. You were liquidated ${fmtPct(l.deviationPct ?? 0)} away from the fair reference price, more than our ${fmtPct(bandPct)} limit. We owe you ${fmtUSD(l.amountOwed)} to restore your position. ${status}`,
    };
  }
  const favourable = l.side === 'long' ? l.executionPrice >= l.referenceMedian : l.executionPrice <= l.referenceMedian;
  return {
    tone: 'border-green/30 bg-green/10 text-ink',
    text:
      exceedsBand(l.deviationPct ?? 0, bandPct) && favourable
        ? `Your liquidation price was ${fmtPct(l.deviationPct ?? 0)} from the reference, but in your favour, so no makegood is due. Makegoods restore losses; they never pay profit.`
        : `Your liquidation happened within ${fmtPct(l.deviationPct ?? 0)} of the fair reference price, inside our ${fmtPct(bandPct)} limit. The market moved; our price was right. No makegood is owed.`,
  };
}

export function UserDrawer() {
  const bandPct = useStore((s) => s.bandPct);
  const liquidations = useStore((s) => s.liquidations);
  const reserveStart = useStore((s) => s.reserveStart);
  const reserveBalance = useStore((s) => s.reserveBalance);
  const liq = useStore((s) => s.liquidations.find((l) => l.userId === s.selectedUserId));
  const push = useStore((s) => s.comms.find((c) => c.channel === 'push'));

  if (!liq) return <div className="py-10 text-center text-sm text-muted">Select a row in the liquidations table.</div>;

  const pushSeen = push && push.status === 'sent';
  const exceeds = liq.deviationPct !== null && exceedsBand(liq.deviationPct, bandPct);
  const msg = plainLanguage(liq, bandPct, payoutSummary({ liquidations, reserveStart, reserveBalance }).paidRatio);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="max-w-sm text-center text-xs text-muted">
        {liq.userName} ({liq.userId}) was liquidated at {fmtT(liq.t)}. This is what their phone showed.
      </p>

      {/* Phone */}
      <div className="w-[340px] rounded-[2.4rem] border-[6px] border-[#1B2744] bg-navy p-3 shadow-2xl">
        <div className="mx-auto mb-3 h-5 w-28 rounded-full bg-[#1B2744]" />

        {pushSeen ? (
          <div className="rounded-2xl border border-white/10 bg-surface-2/90 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
              <Bell size={11} className="text-cyan" /> MochaTrade · {fmtT(push.t)}
            </div>
            <div className="mt-1 text-[13px] font-semibold text-ink">{push.title}</div>
            <p className="mt-0.5 text-xs leading-snug text-ink/80">{push.body}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-3 text-center text-[11px] text-muted">
            Push notification goes out at {fmtT(T.statusPage)}
          </div>
        )}

        <div className="mt-3 rounded-2xl bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-ink">Your liquidation</div>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${liq.side === 'long' ? 'bg-green/10 text-green' : 'bg-orange/10 text-orange'}`}
            >
              {liq.side}
            </span>
          </div>
          <div className="mt-2 divide-y divide-line/60">
            <Row label="Size" value={`${liq.qty} units`} />
            <Row label="Fair reference price (median)" value={fmtUSD(liq.referenceMedian)} accent="text-cyan" />
            <Row label="Price we liquidated at" value={fmtUSD(liq.executionPrice)} accent="text-orange" />
            <Row
              label="Difference"
              value={liq.deviationPct === null ? 'Testing at T+15:00' : fmtPct(liq.deviationPct)}
              accent={exceeds ? 'text-orange' : liq.deviationPct === null ? 'text-muted' : 'text-ink'}
            />
            <Row label="Published limit" value={`±${fmtPct(bandPct)}`} />
            <Row
              label="Verdict"
              value={liq.verdict === 'pending' ? 'Pending' : liq.verdict === 'makegood' ? 'Makegood owed' : 'No makegood'}
              accent={liq.verdict === 'makegood' ? 'text-orange' : liq.verdict === 'no_makegood' ? 'text-green' : 'text-muted'}
            />
            {liq.verdict === 'makegood' && <Row label="We owe you" value={fmtUSD(liq.amountOwed)} accent="text-orange" />}
          </div>
        </div>

        <div className={`mt-3 rounded-2xl border p-3 text-xs leading-relaxed ${msg.tone}`}>{msg.text}</div>

        <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-[#1B2744]" />
      </div>
    </div>
  );
}
