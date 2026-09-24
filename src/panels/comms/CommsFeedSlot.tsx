// OWNER: Agent B (Kaustubh). Vertical timeline of every automatic message.
import { useState } from 'react';
import { Bell, ChevronDown, ChevronUp, Globe, Mail, MessageCircle } from 'lucide-react';
import { useStore } from '../../core/store';
import { fmtT } from '../../core/format';
import type { Channel, CommsMessage } from '../../core/types';
import { Panel, Pill } from '../../ui/Panel';

const CHANNEL: Record<Channel, { label: string; Icon: typeof Mail }> = {
  status_page: { label: 'Status page', Icon: Globe },
  push: { label: 'Push', Icon: Bell },
  email: { label: 'Email', Icon: Mail },
  x_post: { label: 'Post on X', Icon: MessageCircle },
};

function CommsItem({ msg }: { msg: CommsMessage }) {
  const [expanded, setExpanded] = useState(false);
  const sent = msg.status === 'sent';
  const { label, Icon } = CHANNEL[msg.channel];

  return (
    <li className="relative pl-7">
      <span
        className={`absolute top-2.5 left-0 grid h-5 w-5 place-items-center rounded-full border ${
          sent ? 'border-green/50 bg-green/15 text-green' : 'border-line bg-surface text-muted'
        }`}
      >
        <Icon size={11} strokeWidth={2.25} />
      </span>
      <button
        type="button"
        disabled={!sent}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
          sent ? 'border-line bg-surface-2/50 hover:border-cyan/40' : 'cursor-default border-dashed border-line/70 opacity-55'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-medium text-muted">{label}</span>
          <span className="num text-muted">{sent ? fmtT(msg.t) : `Fires at ${fmtT(msg.t)}`}</span>
        </div>
        <div className={`mt-0.5 text-[13px] leading-snug font-semibold ${sent ? 'text-ink' : 'text-muted'}`}>{msg.title}</div>
        {sent && (
          <>
            <p className={`mt-1 text-xs leading-relaxed whitespace-pre-line text-ink/75 ${expanded ? '' : 'line-clamp-2'}`}>{msg.body}</p>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-green">Sent automatically</span>
              <span className="flex items-center gap-0.5 text-cyan">
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Less' : 'Full text'}
              </span>
            </div>
          </>
        )}
      </button>
    </li>
  );
}

export function CommsFeedSlot() {
  const comms = useStore((s) => s.comms);
  const sent = comms.filter((c) => c.status === 'sent').length;

  return (
    <Panel
      title="Comms feed"
      subtitle="Written in advance, sent by the protocol"
      right={comms.length > 0 ? <Pill tone={sent === comms.length ? 'green' : 'muted'}>{sent} / {comms.length} sent</Pill> : undefined}
    >
      {comms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
          Messages are scheduled when the incident starts.
        </div>
      ) : (
        <ol className="relative max-h-[180px] space-y-2 overflow-y-auto pr-1 before:absolute before:top-3 before:bottom-3 before:left-[9px] before:w-px before:bg-line">
          {comms.map((m) => (
            <CommsItem key={m.id} msg={m} />
          ))}
        </ol>
      )}
    </Panel>
  );
}
