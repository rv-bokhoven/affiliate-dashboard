'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import PageContainer from './PageContainer';

interface Offer { id: number; name: string; network: { id: number; name: string } | null; }
interface Adjustment { id: number; amount: number; offerId: number | null; }
interface Props { offers: Offer[]; campaignId: number; campaignName: string; }

export default function FinanceManager({ offers, campaignId, campaignName }: Props) {
  const [revShares, setRevShares] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/adjustments?campaignId=${campaignId}`);
        const data: Adjustment[] = await res.json();
        const initialMap: Record<number, string> = {};
        data.forEach(item => { if (item.offerId) initialMap[item.offerId] = item.amount.toString(); });
        setRevShares(initialMap);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, [campaignId]);

  const handleChange = (offerId: number, val: string) => { setRevShares(prev => ({ ...prev, [offerId]: val })); };
  const handleSave = async (offer: Offer) => {
    const amount = revShares[offer.id]; if (!amount) return;
    setSavingId(offer.id);
    try {
      const res = await fetch('/api/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, offerId: offer.id, networkId: offer.network?.id || 1, campaignId }), });
      if (res.ok) { toast.success('Opgeslagen!'); } else { toast.error('Foutje'); }
    } catch (e) { toast.error('Netwerk fout'); } finally { setSavingId(null); }
  };

  return (
    <PageContainer title="Finance & RevShare" subtitle={`Beheer inkomsten voor ${campaignName}`}>
        {/* GEEN max-w beperking meer, gewoon w-full */}
        <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Offer</span>
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Huidige Maand ($)</span>
            </div>

            <div className="divide-y divide-neutral-800">
                {loading ? (
                    <div className="p-8 text-center text-neutral-500">Data laden...</div>
                ) : offers.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500">
                        Geen offers gevonden. <Link href="/offers" className="text-neutral-100 underline hover:no-underline">Maak er eentje aan</Link>.
                    </div>
                ) : (
                    offers.map(offer => (
                        <div key={offer.id} className="flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors group">
                            <div>
                                <p className="text-sm font-medium text-neutral-200">{offer.name}</p>
                                <p className="text-xs text-neutral-500">{offer.network?.name || 'Unknown Network'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-neutral-500 text-sm font-medium">$</span>
                                <input 
                                    type="number" step="0.01" placeholder="0.00"
                                    className="bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-right text-neutral-200 w-32 focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-all"
                                    value={revShares[offer.id] || ''}
                                    onChange={(e) => handleChange(offer.id, e.target.value)}
                                    onBlur={() => handleSave(offer)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { handleSave(offer); (e.currentTarget as HTMLInputElement).blur(); } }}
                                />
                                <div className="w-4 flex justify-center">
                                    {savingId === offer.id && <span className="block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="p-3 bg-neutral-950/50 text-[10px] text-neutral-600 text-center border-t border-neutral-800">
                Wijzigingen worden direct opgeslagen bij het verlaten van het veld.
            </div>
        </div>
    </PageContainer>
  );
}