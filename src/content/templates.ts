// OWNER: Agent B (Kaustubh). STUB shipped by Agent A so the engine compiles.
// Replace the copy freely, but keep the export name and the Template shape.
import type { Template, TemplateContext } from '../core/types';
import { fmtPct, fmtUSD } from '../core/format';

export type { TemplateContext };

export const TEMPLATES: Template[] = [
  {
    id: 'status_initial',
    channel: 'status_page',
    fireAt: 300,
    scenarios: 'all',
    build: () => ({
      title: 'Investigating unusual price movement',
      body: 'We detected a disagreement between our price feeds. New leveraged positions are paused. Top-up, reduce, close and withdraw remain open.',
    }),
  },
  {
    id: 'push_initial',
    channel: 'push',
    fireAt: 300,
    scenarios: 'all',
    build: () => ({
      title: 'Your position is safe to manage',
      body: 'New leverage is paused while we check our prices. You can still top up, reduce, close or withdraw.',
    }),
  },
  {
    id: 'email_affected',
    channel: 'email',
    fireAt: 330,
    scenarios: 'all',
    build: (ctx) => ({
      title: 'About the price movement just now',
      body: `We are testing every liquidation against a ${fmtPct(ctx.bandPct)} band published before launch. If our price was wrong, you will be made whole automatically.`,
    }),
  },
  {
    id: 'status_update',
    channel: 'status_page',
    fireAt: 1800,
    scenarios: 'all',
    build: (ctx) => ({
      title: 'Deviation test complete',
      body:
        ctx.makegoodCount > 0
          ? `${ctx.makegoodCount} liquidations executed more than ${fmtPct(ctx.bandPct)} from the reference median. Makegoods totalling ${fmtUSD(ctx.totalOwed)} are queued.`
          : `Every liquidation executed within the ${fmtPct(ctx.bandPct)} band. No makegoods are owed.`,
    }),
  },
  {
    id: 'x_post_final',
    channel: 'x_post',
    fireAt: 3600,
    scenarios: 'all',
    build: (ctx) => ({
      title: ctx.makegoodCount > 0 ? 'Our price was wrong. Here is what we owe.' : 'The market moved. Our price did not.',
      body:
        ctx.makegoodCount > 0
          ? `We owe ${fmtUSD(ctx.totalOwed)} to ${ctx.makegoodCount} users, paid from the Integrity Reserve (balance ${fmtUSD(ctx.reserveBalance)}).`
          : `Our price stayed within the ${fmtPct(ctx.bandPct)} band. No makegoods. Full feed data is on our status page.`,
    }),
  },
];
