import { ScenarioId, Channel } from '../core/types';

export interface TemplateContext {
  scenario: ScenarioId;
  simTime: number;
  median: number;
  ours: number;
  bandPct: number;
  makegoodCount: number;
  totalOwed: number;
  reserveBalance: number;
}

export const TEMPLATES: {
  id: string;
  channel: Channel;
  fireAt: number; // sim seconds
  scenarios: ScenarioId[] | 'all';
  build: (ctx: TemplateContext) => { title: string; body: string };
}[] = [
  {
    id: 'status_page_initial',
    channel: 'status_page',
    fireAt: 300, // T+05:00
    scenarios: 'all',
    build: (ctx) => ({
      title: 'Incident Update: Feed Divergence Detected',
      body: `We are investigating a potential pricing divergence in our reference feeds. To protect our users, we have proactively paused all NEW leveraged position opens. All other operations—including top-ups, reduces, closes, and withdrawals—remain fully operational. The deviation protocol has been engaged.`,
    }),
  },
  {
    id: 'push_initial',
    channel: 'push',
    fireAt: 300, // T+05:00
    scenarios: 'all',
    build: (ctx) => ({
      title: 'Mocha Trade: Service Update',
      body: 'New leveraged opens are temporarily paused due to a pricing divergence. All exits, top-ups, and withdrawals remain open.',
    }),
  },
  {
    id: 'email_initial',
    channel: 'email',
    fireAt: 330, // T+05:30
    scenarios: 'all',
    build: (ctx) => ({
      title: 'Action Required: Service Update for Mocha Trade Users',
      body: `Dear User,\n\nWe have detected a pricing divergence across our reference feeds. As a precaution, we have temporarily halted all new leveraged opens. Please note that you can still top up, reduce, close, and withdraw your funds normally. We will provide another update soon once the deviation protocol completes its assessment.`,
    }),
  },
  {
    id: 'status_page_update',
    channel: 'status_page',
    fireAt: 1800, // T+30:00
    scenarios: 'all',
    build: (ctx) => ({
      title: 'Incident Update: Deviation Test Complete',
      body: `The deviation test has been completed for all affected liquidations. We have identified ${ctx.makegoodCount} positions that require makegoods under the Deviation Doctrine. The automatic makegood process has queued these for confirmation.`,
    }),
  },
  {
    id: 'x_post_system_fault',
    channel: 'x_post',
    fireAt: 3600, // T+60:00
    scenarios: ['system_fault', 'historical_replay'], // Treat historical replay like a system fault in terms of resolution if there are makegoods
    build: (ctx) => {
      const formattedTotalOwed = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ctx.totalOwed);
      const formattedReserve = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ctx.reserveBalance);
      return {
        title: 'Post-Incident Report',
        body: `Our price execution was incorrect. Under the Deviation Doctrine, we pay when our price was wrong. Median feed price: $${ctx.median.toFixed(2)}. Our execution price: $${ctx.ours.toFixed(2)}. We owe ${formattedTotalOwed} to ${ctx.makegoodCount} users. This has been paid in full from the Integrity Reserve (remaining balance: ${formattedReserve}).`,
      };
    },
  },
  {
    id: 'x_post_market_move',
    channel: 'x_post',
    fireAt: 3600, // T+60:00
    scenarios: ['market_move'],
    build: (ctx) => ({
      title: 'Post-Incident Report',
      body: `A sharp market movement occurred. Our execution price ($${ctx.ours.toFixed(2)}) stayed within the ${ctx.bandPct.toFixed(2)}% band of the reference median ($${ctx.median.toFixed(2)}). As per the Deviation Doctrine, no makegoods are owed. All operations will resume shortly.`,
    }),
  },
];
