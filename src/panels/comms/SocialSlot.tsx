import { useMemo } from 'react';
// @ts-ignore
import { useStore } from '../../core/store';
// @ts-ignore
import type { CommsMessage, SignalPoint } from '../../core/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';
import { User } from 'lucide-react';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `T+${m}:${s}`;
};

const SocialPost = ({ handle, time, text, sentiment }: { handle: string, time: string, text: string, sentiment: 'worried' | 'calm' }) => (
  <div className="bg-[#0F1A30] p-3 rounded-lg border border-[#8A97B0]/20 flex gap-3">
    <div className={`mt-1 p-2 rounded-full h-8 w-8 flex items-center justify-center ${sentiment === 'worried' ? 'bg-[#FF8C42]/20 text-[#FF8C42]' : 'bg-[#3DD68C]/20 text-[#3DD68C]'}`}>
      <User size={16} />
    </div>
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-semibold text-sm text-gray-200">{handle}</span>
        <span className="text-xs text-[#8A97B0]">{time}</span>
      </div>
      <p className="text-sm text-gray-300">{text}</p>
    </div>
  </div>
);

export const SocialSlot = () => {
  // @ts-ignore
  const signals = useStore(s => s.signals) as SignalPoint[];
  // @ts-ignore
  const comms = useStore(s => s.comms) as CommsMessage[];

  const chartData = useMemo(() => {
    return (signals || []).map(s => ({
      ...s,
      timeLabel: formatTime(s.t)
    }));
  }, [signals]);

  const statusPageMsg = comms?.find(c => c.channel === 'status_page' && c.status === 'sent');
  const markerTime = statusPageMsg ? statusPageMsg.t : null;
  const showWorried = (signals?.length > 0 && signals[signals.length - 1].t > 120); // Show early
  const showCalm = markerTime && (signals?.length > 0 && signals[signals.length - 1].t > markerTime + 60);

  return (
    <div className="bg-[#0A1020] text-white p-6 rounded-xl h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-6 text-[#22C3D6]">Social Sentiment</h2>
      
      <div className="h-64 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#8A97B0" opacity={0.2} vertical={false} />
            <XAxis dataKey="timeLabel" stroke="#8A97B0" fontSize={12} tickMargin={10} />
            <YAxis stroke="#8A97B0" fontSize={12} tickFormatter={(val) => `${val}/m`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0F1A30', border: '1px solid #22C3D6', borderRadius: '8px' }}
              labelStyle={{ color: '#8A97B0' }}
              itemStyle={{ color: '#22C3D6' }}
            />
            {markerTime && (
              <ReferenceLine x={formatTime(markerTime)} stroke="#3DD68C" strokeDasharray="3 3" label={{ position: 'top', value: 'Status Page Live', fill: '#3DD68C', fontSize: 12 }} />
            )}
            <Line type="monotone" dataKey="socialMentionsPerMin" name="Mentions" stroke="#22C3D6" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#FF8C42' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        <h3 className="text-sm font-semibold text-[#8A97B0] mb-2 uppercase tracking-wider">Sample Mentions</h3>
        
        {showWorried && (
          <SocialPost 
            handle="@crypto_trader_99" 
            time="T+03:15" 
            text="Price feeds are frozen on Mocha Trade? Tried to open a 10x long and got an error. What is going on?!" 
            sentiment="worried"
          />
        )}
        
        {showCalm && (
          <SocialPost 
            handle="@defi_whale" 
            time={formatTime(markerTime + 45)} 
            text="Looks like they paused new leverage due to feed issues but I just closed my position fine. Good to see the Dead-Hand protocol working." 
            sentiment="calm"
          />
        )}

        {!showWorried && !showCalm && (
          <div className="text-center text-[#8A97B0] text-sm mt-8">
            Monitoring social feeds...
          </div>
        )}
      </div>
    </div>
  );
};
