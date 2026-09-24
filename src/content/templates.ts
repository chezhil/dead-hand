// OWNER: Agent B (Kaustubh). Message templates the engine sends automatically.
// Every number comes from ctx; nothing is hard-coded. Tone: calm, factual, non-defensive.
import type { Template, TemplateContext } from '../core/types';
import { fmtPct, fmtUSD } from '../core/format';

export type { TemplateContext };

const users = (n: number) => `${n} ${n === 1 ? 'user' : 'users'}`;

export const TEMPLATES: Template[] = [
  {
    id: 'status_page_initial',
    channel: 'status_page',
    fireAt: 300, // T+05:00
    scenarios: 'all',
    build: (ctx) => ({
      title: 'Unusual price movement: new leverage paused, exits open',
      body:
        'Our watchdog flagged unusual movement across our three reference price feeds. ' +
        'As a precaution, opening new leveraged positions is paused. ' +
        'Top-up, reduce, close and withdraw are all open and working normally. ' +
        `Every liquidation from this period will be checked against the reference median using our published ${fmtPct(ctx.bandPct)} band. ` +
        'Next update by T+30:00.',
    }),
  },
  {
    id: 'push_initial',
    channel: 'push',
    fireAt: 300, // T+05:00
    scenarios: 'all',
    build: () => ({
      title: 'MochaTrade: your exits are open',
      body: 'New leverage is paused while we check prices. You can still top up, reduce, close or withdraw at any time.',
    }),
  },
  {
    id: 'email_initial',
    channel: 'email',
    fireAt: 330, // T+05:30
    scenarios: 'all',
    build: (ctx) => ({
      title: 'About the price movement on MochaTrade',
      body:
        'Hello,\n\n' +
        'A few minutes ago our reference price feeds moved sharply. We paused new leveraged positions as a precaution; ' +
        'you can still top up, reduce, close and withdraw.\n\n' +
        `If one of your positions was liquidated, we will compare its execution price with the median of three independent feeds. ` +
        `If the difference is more than ${fmtPct(ctx.bandPct)}, we restore the position automatically. You do not need to do anything.\n\n` +
        'MochaTrade',
    }),
  },
  {
    id: 'status_page_update',
    channel: 'status_page',
    fireAt: 1800, // T+30:00
    scenarios: 'all',
    build: (ctx) =>
      ctx.makegoodCount > 0
        ? {
            title: `Deviation test complete: ${ctx.makegoodCount} makegoods queued`,
            body:
              `We tested every liquidation against the reference median. ${users(ctx.makegoodCount)} were liquidated more than ` +
              `${fmtPct(ctx.bandPct)} away from it, so our price was wrong for them. Makegoods totalling ${fmtUSD(ctx.totalOwed)} ` +
              `are queued and will be paid from the Integrity Reserve (balance ${fmtUSD(ctx.reserveBalance)}).` +
              (ctx.totalOwed > ctx.reserveBalance
                ? ` That is less than we owe, so every makegood will be paid pro-rata (${fmtPct((ctx.reserveBalance / ctx.totalOwed) * 100, 1)}) and the shortfall disclosed.`
                : ''),
          }
        : {
            title: 'Deviation test complete: no makegoods owed',
            body:
              `We tested every liquidation against the reference median. All executions were within the published ` +
              `${fmtPct(ctx.bandPct)} band: the market moved, our price did not. No makegoods are owed. Full feed data follows at T+60:00.`,
          },
  },
  {
    // One version per outcome: if any makegood is owed, our price was wrong.
    id: 'x_post_final',
    channel: 'x_post',
    fireAt: 3600, // T+60:00
    scenarios: 'all',
    build: (ctx) => {
      if (ctx.makegoodCount > 0) {
        const payment =
          ctx.totalPaid === 0
            ? `being paid from the Integrity Reserve (balance ${fmtUSD(ctx.reserveBalance)})`
            : ctx.paidRatio < 1
              ? `but the Integrity Reserve covered only ${fmtUSD(ctx.totalPaid)}. We paid every user pro-rata (${fmtPct(ctx.paidRatio * 100, 1)}) ` +
                `and owe the ${fmtUSD(ctx.totalOwed - ctx.totalPaid)} shortfall`
              : `paid in full from the Integrity Reserve (balance now ${fmtUSD(ctx.reserveBalance)})`;
        return {
          title: 'Our price was wrong. Here is the data and what we owe.',
          body:
            `During today's move, ${users(ctx.makegoodCount)} were liquidated more than ${fmtPct(ctx.bandPct)} from the ` +
            `3-feed reference median. We owe them ${fmtUSD(ctx.totalOwed)}, ${payment}. Makegoods restore positions; they never pay profit. ` +
            'Feed data and every verdict are on our status page.',
        };
      }
      return {
        title: 'The market moved. Our price did not.',
        body:
          `Every liquidation executed within our published ${fmtPct(ctx.bandPct)} band of the 3-feed reference median, ` +
          `so no makegoods are owed. Integrity Reserve untouched at ${fmtUSD(ctx.reserveBalance)}. ` +
          'Feed data and every verdict are on our status page.',
      };
    },
  },
];
