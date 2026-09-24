import React, { useState } from 'react';
// @ts-ignore - Mocking the store import as we don't have the core files yet
import { useStore } from '../../core/store';
// @ts-ignore
import { CommsMessage } from '../../core/types';
import { Mail, Bell, Globe, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `T+${m}:${s}`;
};

const ChannelIcon = ({ channel, className }: { channel: CommsMessage['channel'], className?: string }) => {
  switch (channel) {
    case 'email': return <Mail className={className} />;
    case 'push': return <Bell className={className} />;
    case 'status_page': return <Globe className={className} />;
    case 'x_post': return <MessageCircle className={className} />;
    default: return <Globe className={className} />;
  }
};

const CommsFeedItem = ({ msg }: { msg: CommsMessage }) => {
  const [expanded, setExpanded] = useState(false);
  const isScheduled = msg.status === 'scheduled';

  return (
    <div className={`relative pl-8 py-4 border-l-2 ${isScheduled ? 'border-[#3DD68C]/30' : 'border-[#3DD68C]'}`}>
      <div className="absolute left-[-17px] top-4 bg-[#0F1A30] p-1 rounded-full">
        <ChannelIcon channel={msg.channel} className={`w-6 h-6 ${isScheduled ? 'text-[#8A97B0]' : 'text-[#3DD68C]'}`} />
      </div>
      
      <div className={`rounded-lg p-4 bg-[#0F1A30] border ${isScheduled ? 'border-[#8A97B0]/20 opacity-60' : 'border-[#3DD68C]/30'}`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-mono text-[#8A97B0]">
            {isScheduled ? `Fires at ${formatTime(msg.t)}` : formatTime(msg.t)}
          </span>
          {!isScheduled && <span className="text-xs text-[#8A97B0]">Sent automatically</span>}
        </div>
        
        <h4 className={`font-semibold mb-2 ${isScheduled ? 'text-[#8A97B0]' : 'text-[#22C3D6]'}`}>{msg.title}</h4>
        
        <div className="relative cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <p className={`text-sm text-gray-300 ${!expanded ? 'line-clamp-2' : ''}`}>
            {msg.body}
          </p>
          {!expanded && msg.body.length > 100 && (
            <div className="absolute bottom-0 right-0 bg-[#0F1A30] pl-2 flex items-center text-[#22C3D6]">
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
          {expanded && (
            <div className="mt-2 text-right text-[#22C3D6] flex justify-end">
              <ChevronUp className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommsFeedSlot = () => {
  // @ts-ignore
  const comms = useStore((s) => s.comms) as CommsMessage[];

  return (
    <div className="bg-[#0A1020] text-white p-6 rounded-xl h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-6 text-[#22C3D6]">Communications Feed</h2>
      <div className="flex-1 overflow-y-auto pr-4 space-y-4">
        {comms && comms.length > 0 ? (
          <div className="ml-4 border-l-2 border-transparent">
            {comms.map((msg) => (
              <CommsFeedItem key={msg.id} msg={msg} />
            ))}
          </div>
        ) : (
          <div className="text-[#8A97B0] text-center mt-10">No messages yet.</div>
        )}
      </div>
    </div>
  );
};
