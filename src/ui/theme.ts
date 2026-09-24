// Colour tokens for places Tailwind classes can't reach (Recharts props).
// Keep in sync with @theme in src/index.css.
export const C = {
  navy: '#0A1020',
  surface: '#0F1A30',
  surface2: '#142340',
  line: '#1F2E4D',
  ink: '#E6ECF5',
  muted: '#8A97B0',
  cyan: '#22C3D6',
  orange: '#FF8C42',
  green: '#3DD68C',
  feedA: '#8B7CF6',
  feedB: '#D46AA8',
  feedC: '#C7CEDB',
} as const;

/** Shared axis props for dark Recharts charts. */
export const axisProps = {
  stroke: C.line,
  tick: { fill: C.muted, fontSize: 11 },
  tickLine: false,
} as const;
