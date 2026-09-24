// @ts-ignore
import { useStore } from '../../core/store';
// @ts-ignore
import type { LogEntry, CommsMessage, Liquidation } from '../../core/types';
import { X, Download, Printer, FileText } from 'lucide-react';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `T+${m}:${s}`;
};

export const ReportDrawer = () => {
  // @ts-ignore
  const activeDrawer = useStore(s => s.activeDrawer);
  // @ts-ignore
  const closeDrawer = useStore(s => s.closeDrawer);
  
  // @ts-ignore
  const log = useStore(s => s.log) as LogEntry[];
  // @ts-ignore
  const comms = useStore(s => s.comms) as CommsMessage[];
  // @ts-ignore
  const liquidations = useStore(s => s.liquidations) as Liquidation[];
  // @ts-ignore
  const reserveStart = useStore(s => s.reserveStart) as number;
  // @ts-ignore
  const reserveBalance = useStore(s => s.reserveBalance) as number;
  // @ts-ignore
  const humanCallsUsed = useStore(s => s.humanCallsUsed) as number;
  // @ts-ignore
  const scenario = useStore(s => s.scenario) as string;

  if (activeDrawer !== 'report') return null;

  const makegoodCount = liquidations?.filter(l => l.verdict === 'makegood').length || 0;
  const noMakegoodCount = liquidations?.filter(l => l.verdict === 'no_makegood').length || 0;
  const totalOwed = liquidations?.reduce((sum, l) => sum + (l.amountOwed || 0), 0) || 0;

  const formattedTotalOwed = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalOwed);
  const formattedReserveStart = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(reserveStart);
  const formattedReserveEnd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(reserveBalance);

  const sentComms = comms?.filter(c => c.status === 'sent') || [];

  const generateMarkdown = () => {
    let md = `# Post-Incident Report: Mocha Trade\n\n`;
    md += `**Scenario:** ${scenario}\n`;
    md += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;

    md += `## Executive Summary\n`;
    md += `- **Human Calls Used:** ${humanCallsUsed} / 1\n`;
    md += `- **Total Liquidations Assessed:** ${liquidations?.length || 0}\n`;
    md += `- **Makegoods Issued:** ${makegoodCount}\n`;
    md += `- **Makegoods Denied (Within Band):** ${noMakegoodCount}\n`;
    md += `- **Total Compensation Paid:** ${formattedTotalOwed}\n`;
    md += `- **Integrity Reserve (Before):** ${formattedReserveStart}\n`;
    md += `- **Integrity Reserve (After):** ${formattedReserveEnd}\n\n`;

    md += `## Timeline (System Logs)\n`;
    log?.forEach(entry => {
      md += `- **${formatTime(entry.t)}** [${entry.actor.toUpperCase()}] (${entry.stage.toUpperCase()}): ${entry.text}\n`;
    });
    md += `\n`;

    md += `## Communications Dispatched\n`;
    sentComms.forEach(c => {
      md += `- **${formatTime(c.t)}** [${c.channel.toUpperCase()}]: ${c.title}\n`;
    });
    md += `\n`;

    md += `*Generated automatically by the Dead-Hand Console.*\n`;
    return md;
  };

  const handleDownload = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident_report_${scenario}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#0A1020] shadow-2xl border-l border-[#8A97B0]/20 z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
      <div className="flex justify-between items-center p-6 border-b border-[#8A97B0]/20 bg-[#0F1A30]">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="text-[#22C3D6]" size={24} />
          Post-Incident Report
        </h2>
        <button onClick={closeDrawer} className="text-[#8A97B0] hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 text-gray-300 print:text-black print:bg-white">
        
        {/* Header Actions */}
        <div className="flex gap-4 print:hidden">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F1A30] hover:bg-[#1A2942] border border-[#22C3D6]/50 text-[#22C3D6] rounded transition-colors"
          >
            <Download size={16} /> Download .md
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F1A30] hover:bg-[#1A2942] border border-[#8A97B0]/50 text-white rounded transition-colors"
          >
            <Printer size={16} /> Print
          </button>
        </div>

        {/* Report Content */}
        <div className="space-y-6">
          <section className="bg-[#0F1A30] p-6 rounded-xl border border-[#8A97B0]/20 print:border-none print:p-0">
            <h3 className="text-lg font-semibold text-white mb-4 print:text-black">Executive Summary</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
              <div className="flex justify-between border-b border-[#8A97B0]/10 pb-2 print:border-gray-200">
                <span className="text-[#8A97B0] print:text-gray-600">Human Calls Used</span>
                <span className={`font-bold ${humanCallsUsed > 1 ? 'text-[#FF8C42]' : 'text-white'} print:text-black`}>
                  {humanCallsUsed} / 1
                </span>
              </div>
              <div className="flex justify-between border-b border-[#8A97B0]/10 pb-2 print:border-gray-200">
                <span className="text-[#8A97B0] print:text-gray-600">Total Liquidations Assessed</span>
                <span className="font-bold text-white print:text-black">{liquidations?.length || 0}</span>
              </div>
              <div className="flex justify-between border-b border-[#8A97B0]/10 pb-2 print:border-gray-200">
                <span className="text-[#8A97B0] print:text-gray-600">Makegoods Issued</span>
                <span className="font-bold text-[#3DD68C] print:text-black">{makegoodCount}</span>
              </div>
              <div className="flex justify-between border-b border-[#8A97B0]/10 pb-2 print:border-gray-200">
                <span className="text-[#8A97B0] print:text-gray-600">Total Compensation</span>
                <span className="font-bold text-[#3DD68C] print:text-black">{formattedTotalOwed}</span>
              </div>
              <div className="flex justify-between border-b border-[#8A97B0]/10 pb-2 print:border-gray-200">
                <span className="text-[#8A97B0] print:text-gray-600">Reserve Start</span>
                <span className="font-mono text-white print:text-black">{formattedReserveStart}</span>
              </div>
              <div className="flex justify-between border-b border-[#8A97B0]/10 pb-2 print:border-gray-200">
                <span className="text-[#8A97B0] print:text-gray-600">Reserve End</span>
                <span className="font-mono text-white print:text-black">{formattedReserveEnd}</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4 print:text-black">Timeline (System Logs)</h3>
            <div className="space-y-3">
              {log?.map(entry => (
                <div key={entry.id} className="flex gap-4 text-sm bg-[#0F1A30] p-3 rounded-lg border border-l-4 border-[#8A97B0]/20 border-l-[#22C3D6] print:border-gray-300 print:bg-white print:border-l-4 print:border-l-black">
                  <div className="w-16 font-mono text-[#8A97B0] print:text-gray-600 shrink-0">{formatTime(entry.t)}</div>
                  <div className="w-20 font-semibold text-xs mt-0.5 text-[#22C3D6] uppercase tracking-wider print:text-black shrink-0">
                    {entry.actor}
                  </div>
                  <div className="text-gray-300 print:text-black">
                    <span className="text-[#8A97B0] print:text-gray-500 uppercase text-xs mr-2">[{entry.stage}]</span>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4 print:text-black">Communications Dispatched</h3>
            <div className="space-y-3">
              {sentComms.map(c => (
                <div key={c.id} className="flex gap-4 text-sm border-b border-[#8A97B0]/20 pb-3 print:border-gray-300">
                  <div className="w-16 font-mono text-[#8A97B0] print:text-gray-600 shrink-0">{formatTime(c.t)}</div>
                  <div className="w-24 font-semibold text-xs mt-0.5 text-[#8A97B0] uppercase tracking-wider print:text-black shrink-0">
                    {c.channel}
                  </div>
                  <div className="text-gray-300 print:text-black">{c.title}</div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
