// @ts-ignore
import { useStore } from '../../core/store';
// @ts-ignore
import type { PricePoint, Liquidation, CommsMessage } from '../../core/types';
import { X } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `T+${m}:${s}`;
};

export const PublicPageDrawer = () => {
  // @ts-ignore
  const activeDrawer = useStore(s => s.activeDrawer);
  // @ts-ignore
  const closeDrawer = useStore(s => s.closeDrawer);
  // @ts-ignore
  const prices = useStore(s => s.prices) as PricePoint[];
  // @ts-ignore
  const bandPct = useStore(s => s.bandPct) as number;
  // @ts-ignore
  const liquidations = useStore(s => s.liquidations) as Liquidation[];
  // @ts-ignore
  const reserveBalance = useStore(s => s.reserveBalance) as number;
  // @ts-ignore
  const comms = useStore(s => s.comms) as CommsMessage[];

  if (activeDrawer !== 'public_page') return null;

  const chartData = prices?.map(p => ({
    ...p,
    timeLabel: formatTime(p.t)
  })) || [];

  const makegoodCount = liquidations?.filter(l => l.verdict === 'makegood').length || 0;
  const totalOwed = liquidations?.reduce((sum, l) => sum + (l.amountOwed || 0), 0) || 0;

  const formattedTotalOwed = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalOwed);
  const formattedReserve = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(reserveBalance);

  // Find the verdict message if it exists
  const verdictMsg = comms?.find(c => c.channel === 'x_post' && c.status === 'sent');
  const hasIncidentConcluded = !!verdictMsg;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0A1020] shadow-2xl border-l border-[#8A97B0]/20 z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      <div className="flex justify-between items-center p-6 border-b border-[#8A97B0]/20 bg-[#0F1A30]">
        <h2 className="text-2xl font-bold text-white tracking-wide">Mocha Trade Public Incident Record</h2>
        <button onClick={closeDrawer} className="text-[#8A97B0] hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 text-gray-300">
        
        {/* Headline Verdict */}
        <div className="bg-[#0F1A30] p-6 rounded-xl border border-[#3DD68C]/30 text-center">
          <h3 className="text-[#22C3D6] font-semibold tracking-widest uppercase text-sm mb-2">Verdict</h3>
          <p className="text-xl font-medium text-white">
            {hasIncidentConcluded 
              ? makegoodCount > 0 
                ? "Execution divergence detected. Makegoods issued."
                : "Market movement confirmed. System operated correctly."
              : "Incident is currently under investigation."}
          </p>
        </div>

        {/* Chart */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Reference Feeds vs. Execution Price</h3>
          <div className="h-72 w-full bg-[#0F1A30] p-4 rounded-xl border border-[#8A97B0]/20">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8A97B0" opacity={0.2} />
                <XAxis dataKey="timeLabel" stroke="#8A97B0" fontSize={12} />
                <YAxis stroke="#8A97B0" fontSize={12} domain={['dataMin - 10', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A1020', border: '1px solid #22C3D6' }}
                  labelStyle={{ color: '#8A97B0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="feedA" name="Feed A" stroke="#8A97B0" strokeWidth={1} dot={false} opacity={0.5} />
                <Line type="monotone" dataKey="feedB" name="Feed B" stroke="#8A97B0" strokeWidth={1} dot={false} opacity={0.5} />
                <Line type="monotone" dataKey="feedC" name="Feed C" stroke="#8A97B0" strokeWidth={1} dot={false} opacity={0.5} />
                <Line type="stepAfter" dataKey="ours" name="Our Price" stroke="#22C3D6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="median" name="Reference Median" stroke="#FF8C42" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0F1A30] p-6 rounded-xl border border-[#8A97B0]/20">
            <p className="text-[#8A97B0] text-sm mb-1 uppercase tracking-wider">Deviation Band</p>
            <p className="text-2xl font-mono text-white">{bandPct.toFixed(2)}%</p>
          </div>
          <div className="bg-[#0F1A30] p-6 rounded-xl border border-[#8A97B0]/20">
            <p className="text-[#8A97B0] text-sm mb-1 uppercase tracking-wider">Makegoods Owed</p>
            <p className="text-2xl font-mono text-white">{makegoodCount}</p>
          </div>
          <div className="bg-[#0F1A30] p-6 rounded-xl border border-[#8A97B0]/20">
            <p className="text-[#8A97B0] text-sm mb-1 uppercase tracking-wider">Total Amount Owed</p>
            <p className="text-2xl font-mono text-[#3DD68C]">{formattedTotalOwed}</p>
          </div>
          <div className="bg-[#0F1A30] p-6 rounded-xl border border-[#8A97B0]/20">
            <p className="text-[#8A97B0] text-sm mb-1 uppercase tracking-wider">Integrity Reserve</p>
            <p className="text-2xl font-mono text-white">{formattedReserve}</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 border-t border-[#8A97B0]/20 pt-6">
          <p className="text-xs text-[#8A97B0] text-center italic">
            This rule was published on September 1, 2025 and did not change during the incident. 
            "We pay when our price was wrong. We never pay because the market was."
          </p>
        </div>

      </div>
    </div>
  );
};
