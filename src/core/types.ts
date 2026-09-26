// SHARED CONTRACT. Owned by Agent A. Do not edit unless you are Agent A;
// if you need a change, ask the owner.

export type ScenarioId = 'system_fault' | 'market_move' | 'historical_replay';
export type Phase = 'setup' | 'running' | 'paused' | 'ended';
export type Stage = 'detect' | 'contain' | 'decide' | 'disclose';
export type Speed = 1 | 20 | 60 | 120;
export type FeedStatus = 'agree' | 'diverging' | 'liquidations_paused';
export type DrawerName = 'none' | 'comparison' | 'public_page' | 'user' | 'report';

/** t = sim seconds since crash */
export interface PricePoint {
  t: number;
  feedA: number;
  feedB: number;
  feedC: number;
  median: number;
  ours: number;
}

export interface SignalPoint {
  t: number;
  liquidationsPerMin: number;
  ticketsPerMin: number;
  socialMentionsPerMin: number;
}

/** true = open */
export interface OrderTypes {
  newLeverage: boolean;
  topUp: boolean;
  reduce: boolean;
  close: boolean;
  withdraw: boolean;
}

export interface Liquidation {
  id: string;
  t: number;
  userId: string;
  userName: string;
  side: 'long' | 'short';
  qty: number;
  referenceMedian: number;
  executionPrice: number;
  deviationPct: number | null;
  verdict: 'pending' | 'makegood' | 'no_makegood';
  amountOwed: number;
  status: 'untested' | 'tested' | 'queued' | 'confirmed' | 'paid';
}

export type Channel = 'status_page' | 'push' | 'x_post' | 'email';

export interface CommsMessage {
  id: string;
  templateId: string;
  t: number;
  channel: Channel;
  title: string;
  body: string;
  status: 'scheduled' | 'sent';
}

export interface LogEntry {
  id: string;
  t: number;
  actor: 'system' | 'responder' | 'human';
  stage: Stage;
  text: string;
}

export interface Responder {
  status: 'idle' | 'paged' | 'acknowledged' | 'on_it';
  pagedAt?: number;
  ackAt?: number;
  /** Not in the original contract: when the responder moved to 'on_it'. */
  onItAt?: number;
  name: string;
}

export interface TemplateContext {
  scenario: ScenarioId;
  simTime: number;
  median: number;
  ours: number;
  bandPct: number;
  makegoodCount: number;
  totalOwed: number;
  reserveBalance: number;
  /** Added by Agent A: amount actually paid out so far (less than owed if the reserve ran short). */
  totalPaid: number;
  /** Added by Agent A: fraction of each makegood paid (1 = in full, <1 = pro-rata). */
  paidRatio: number;
  /** Added by Agent A: when new leveraged opens reopened automatically (null = still halted). */
  leverageReopenedAt: number | null;
}

export interface Template {
  id: string;
  channel: Channel;
  /** sim seconds */
  fireAt: number;
  scenarios: ScenarioId[] | 'all';
  /** Added by Agent A: what the message is, shown while it is still scheduled. */
  label?: string;
  build: (ctx: TemplateContext) => { title: string; body: string };
}

/** Everything in the store except the actions. */
export interface SimState {
  phase: Phase;
  scenario: ScenarioId;
  speed: Speed;
  /** seconds, 0-3600 */
  simTime: number;
  stage: Stage;
  bandPct: number;
  bandLocked: boolean;
  feedStatus: FeedStatus;
  prices: PricePoint[];
  signals: SignalPoint[];
  orderTypes: OrderTypes;
  liquidations: Liquidation[];
  comms: CommsMessage[];
  log: LogEntry[];
  responder: Responder;
  reserveStart: number;
  reserveBalance: number;
  /** 0 or 1 */
  humanCallsUsed: number;
  makegoodButtonVisible: boolean;
  selectedUserId: string | null;
  activeDrawer: DrawerName;
  /** Not in the original contract: sim time the human pressed "Confirm makegoods". */
  makegoodsConfirmedAt: number | null;
  /** Added by Agent A: when the breaker last halted new leveraged opens (null = never). */
  leverageHaltedAt: number | null;
  /** Added by Agent A: when new leveraged opens reopened automatically (null = still halted / never halted). */
  leverageReopenedAt: number | null;
  /** Added by Agent A: start of the current unbroken run of all three feeds agreeing (null = they disagree now). */
  feedsAgreeSince: number | null;
}

export interface SimActions {
  setScenario: (id: ScenarioId) => void;
  /** ignored if bandLocked */
  setBand: (pct: number) => void;
  setSpeed: (speed: Speed) => void;
  /** locks the band */
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  /** humanCallsUsed=1, queued->confirmed->paid, reserve drops, logs a 'human' entry */
  confirmMakegoods: () => void;
  selectUser: (id: string | null) => void;
  openDrawer: (name: DrawerName) => void;
  closeDrawer: () => void;
}

export type Store = SimState & SimActions;
