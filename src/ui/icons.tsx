// Tiny inline icons (stroke = currentColor).
const base = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const LockIcon = () => (
  <svg {...base} aria-hidden>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
export const CheckIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M5 12l5 5L20 7" />
  </svg>
);
export const PauseIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M9 5v14M15 5v14" />
  </svg>
);
export const PlayIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M7 5l12 7-12 7z" />
  </svg>
);
export const ResetIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
export const CloseIcon = () => (
  <svg {...base} aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const ArrowIcon = () => (
  <svg {...base} width={12} height={12} aria-hidden>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
