'use client';

import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import PageContainer from './PageContainer';

interface DailyLog {
  id: number;
  date: Date;
  type: string;
  data: string;
  createdAt: Date;
}

interface LogsViewerProps {
  logs: DailyLog[];
  campaignName: string;
  offerMap: Record<number, string>; // <--- Nieuwe prop
}

export default function LogsViewer({ logs, campaignName, offerMap }: LogsViewerProps) {
  
  const renderDetails = (log: DailyLog) => {
    let data: any = {};
    try {
      data = JSON.parse(log.data);
    } catch (e) {
      return <span className="text-red-500 text-xs">Data error</span>;
    }

    // --- SPEND LOGS ---
    if (log.type === 'spend') {
      return (
        <div className="flex gap-4 text-xs">
          {data.google && Number(data.google) > 0 && (
            <span className="flex items-center gap-1 text-neutral-400">
              Google: <span className="text-neutral-200 font-medium">${Number(data.google).toFixed(2)}</span>
            </span>
          )}
          {data.microsoft && Number(data.microsoft) > 0 && (
            <span className="flex items-center gap-1 text-neutral-400">
              Microsoft: <span className="text-neutral-200 font-medium">${Number(data.microsoft).toFixed(2)}</span>
            </span>
          )}
        </div>
      );
    } 
    
    // --- CONVERSION LOGS (AANGEPAST) ---
    if (log.type === 'conversions') {
      const items = Array.isArray(data) ? data : [];
      
      if (items.length === 0) return <span className="text-neutral-600 text-xs">Geen wijzigingen</span>;

      return (
        <div className="flex flex-col gap-1">
            {items.map((item: any, idx: number) => {
                const offerName = offerMap[item.offerId] || `Offer #${item.offerId}`; // <--- Naam opzoeken
                const leads = parseInt(item.leads || 0);
                const sales = parseInt(item.sales || 0);
                
                return (
                    <div key={idx} className="text-xs flex items-center gap-2">
                        <span className="text-neutral-300 font-medium">{offerName}:</span>
                        <span className="text-neutral-500">
                            {leads > 0 && `${leads} Leads`}
                            {leads > 0 && sales > 0 && ', '}
                            {sales > 0 && `${sales} Sales`}
                        </span>
                    </div>
                );
            })}
        </div>
      );
    }

    return <span className="text-neutral-600">-</span>;
  };

  return (
    <PageContainer title="Logs & History" subtitle={`Recente invoer voor ${campaignName}`}>
      
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-neutral-400">
          <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-300">
            <tr>
              <th className="p-4 font-medium w-48">Datum Data</th>
              <th className="p-4 font-medium w-32">Type</th>
              <th className="p-4 font-medium">Details</th>
              <th className="p-4 font-medium text-right w-48">Ingevoerd op</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-neutral-500">Nog geen logs gevonden voor dit project.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors align-top">
                  <td className="p-4 text-neutral-200 font-medium">
                    {format(new Date(log.date), 'dd MMM yyyy', { locale: nl })}
                  </td>
                  
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                      log.type === 'spend' 
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                        : 'bg-green-500/10 border-green-500/20 text-green-400'
                    }`}>
                      {log.type}
                    </span>
                  </td>

                  <td className="p-4">
                    {renderDetails(log)}
                  </td>

                  <td className="p-4 text-right text-xs text-neutral-600">
                    {format(new Date(log.createdAt), 'dd-MM HH:mm')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </PageContainer>
  );
}