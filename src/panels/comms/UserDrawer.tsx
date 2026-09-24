// @ts-ignore
import { useStore } from '../../core/store';
// @ts-ignore
import type { Liquidation, CommsMessage } from '../../core/types';
import { X, Smartphone, Bell } from 'lucide-react';

export const UserDrawer = () => {
  // @ts-ignore
  const activeDrawer = useStore(s => s.activeDrawer);
  // @ts-ignore
  const closeDrawer = useStore(s => s.closeDrawer);
  // @ts-ignore
  const selectedUserId = useStore(s => s.selectedUserId);
  // @ts-ignore
  const liquidations = useStore(s => s.liquidations) as Liquidation[];
  // @ts-ignore
  const comms = useStore(s => s.comms) as CommsMessage[];

  if (activeDrawer !== 'user' || !selectedUserId) return null;

  const userLiquidation = liquidations?.find(l => l.userId === selectedUserId);
  
  if (!userLiquidation) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0A1020] shadow-2xl border-l border-[#8A97B0]/20 z-50 flex items-center justify-center">
        <p className="text-[#8A97B0]">Liquidation details not found.</p>
        <button onClick={closeDrawer} className="absolute top-6 right-6 text-[#8A97B0]"><X size={24} /></button>
      </div>
    );
  }

  const pushMsg = comms?.find(c => c.channel === 'push');

  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(userLiquidation.amountOwed || 0);
  const formattedExecution = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(userLiquidation.executionPrice);
  const formattedMedian = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(userLiquidation.referenceMedian);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0A1020] shadow-2xl border-l border-[#8A97B0]/20 z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      <div className="flex justify-between items-center p-6 border-b border-[#8A97B0]/20 bg-[#0F1A30]">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Smartphone className="text-[#22C3D6]" size={20} />
          User View: {userLiquidation.userName}
        </h2>
        <button onClick={closeDrawer} className="text-[#8A97B0] hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0A1020]">
        
        {/* Phone Mockup for Push Notification */}
        <div>
          <h3 className="text-sm font-semibold text-[#8A97B0] uppercase tracking-wider mb-3">Push Notification Received</h3>
          <div className="mx-auto w-64 h-[120px] bg-black rounded-[2rem] border-4 border-gray-800 p-3 shadow-lg relative overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-gray-800 rounded-b-xl"></div>
            
            {pushMsg && pushMsg.status === 'sent' ? (
              <div className="mt-4 bg-[#0F1A30]/90 rounded-xl p-3 backdrop-blur-sm border border-white/10 text-white shadow-xl">
                <div className="flex items-center gap-2 mb-1">
                  <Bell size={12} className="text-[#22C3D6]" />
                  <span className="text-[10px] font-semibold text-gray-300 tracking-wide uppercase">Mocha Trade</span>
                </div>
                <h4 className="text-[11px] font-bold mb-1">{pushMsg.title}</h4>
                <p className="text-[10px] text-gray-300 leading-tight line-clamp-3">{pushMsg.body}</p>
              </div>
            ) : (
              <div className="mt-8 text-center text-[10px] text-gray-500">No push notification sent yet</div>
            )}
          </div>
        </div>

        {/* Liquidation Details */}
        <div>
          <h3 className="text-sm font-semibold text-[#8A97B0] uppercase tracking-wider mb-3">Liquidation Assessment</h3>
          
          <div className="bg-[#0F1A30] rounded-xl border border-[#8A97B0]/20 overflow-hidden">
            <div className="p-4 border-b border-[#8A97B0]/20 flex justify-between items-center bg-[#0A1020]/50">
              <span className="text-sm text-gray-300">Position</span>
              <span className={`font-mono font-bold ${userLiquidation.side === 'long' ? 'text-[#3DD68C]' : 'text-[#FF8C42]'}`}>
                {userLiquidation.qty}x {userLiquidation.side.toUpperCase()}
              </span>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A97B0]">Reference Median</span>
                <span className="font-mono text-white">{formattedMedian}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A97B0]">Execution Price</span>
                <span className="font-mono text-white">{formattedExecution}</span>
              </div>
              
              <div className="h-px bg-[#8A97B0]/20 w-full my-2"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8A97B0]">Calculated Deviation</span>
                <span className={`font-mono ${userLiquidation.deviationPct && userLiquidation.deviationPct > 0 ? 'text-[#FF8C42]' : 'text-gray-300'}`}>
                  {userLiquidation.deviationPct !== null ? `${userLiquidation.deviationPct.toFixed(2)}%` : 'Pending'}
                </span>
              </div>

              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-[#8A97B0]">Verdict</span>
                {userLiquidation.verdict === 'pending' && <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs font-semibold uppercase">Pending</span>}
                {userLiquidation.verdict === 'makegood' && <span className="px-2 py-1 bg-[#3DD68C]/20 text-[#3DD68C] rounded text-xs font-semibold uppercase">Makegood Owed</span>}
                {userLiquidation.verdict === 'no_makegood' && <span className="px-2 py-1 bg-[#8A97B0]/20 text-[#8A97B0] rounded text-xs font-semibold uppercase">Within Band</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Message */}
        {userLiquidation.verdict !== 'pending' && (
          <div className={`p-4 rounded-xl border ${userLiquidation.verdict === 'makegood' ? 'bg-[#3DD68C]/10 border-[#3DD68C]/30 text-[#3DD68C]' : 'bg-[#0F1A30] border-[#8A97B0]/20 text-gray-300'}`}>
            {userLiquidation.verdict === 'makegood' ? (
              <p className="text-sm">
                Your execution price deviated significantly from the reference median. We are restoring your position value by issuing a makegood of <span className="font-bold">{formattedAmount}</span> to your account.
              </p>
            ) : (
              <p className="text-sm">
                Your execution price was within the published acceptable deviation band of the reference median. The market moved sharply, but our pricing was accurate. No compensation is owed.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
