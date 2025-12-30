'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import PageContainer from './PageContainer';

interface Offer { id: number; name: string; network: { name: string } | null; campaignId: number | null; }
interface DailyInputFormProps { campaignId: number; campaignName: string; }

export default function DailyInputForm({ campaignId, campaignName }: DailyInputFormProps) {
  const [activeTab, setActiveTab] = useState<'spend' | 'conversions'>('spend');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false); // Nieuwe state voor laden data
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [googleSpend, setGoogleSpend] = useState('');
  const [microsoftSpend, setMicrosoftSpend] = useState('');
  
  const [offers, setOffers] = useState<Offer[]>([]);
  const [convData, setConvData] = useState<Record<number, { leads: string, sales: string }>>({});

  // 1. Haal Offers op (eenmalig)
  useEffect(() => { fetch('/api/offers').then(res => res.json()).then(setOffers); }, []);

  // 2. NIEUW: Haal bestaande data op wanneer Datum of Project verandert
  useEffect(() => {
    const fetchDayData = async () => {
        setFetching(true);
        // Reset velden eerst (zodat je niet oude data ziet als er niks is)
        setGoogleSpend('');
        setMicrosoftSpend('');
        setConvData({});

        try {
            const res = await fetch(`/api/daily-log?date=${date}&campaignId=${campaignId}`);
            if (res.ok) {
                const data = await res.json();
                
                // Vul Spend in
                if (data.spend) {
                    setGoogleSpend(data.spend.google.toString());
                    setMicrosoftSpend(data.spend.microsoft.toString());
                }

                // Vul Conversies in
                if (data.conversions) {
                    const mappedConvs: Record<number, { leads: string, sales: string }> = {};
                    // De API geeft { [offerId]: { leads: 5, sales: 0 } }
                    // Wij maken er strings van voor de inputs
                    Object.entries(data.conversions).forEach(([offerId, val]: [string, any]) => {
                        mappedConvs[parseInt(offerId)] = { 
                            leads: val.leads.toString(), 
                            sales: val.sales.toString() 
                        };
                    });
                    setConvData(mappedConvs);
                }
            }
        } catch (e) {
            console.error("Kon dag data niet ophalen", e);
        } finally {
            setFetching(false);
        }
    };

    fetchDayData();
  }, [date, campaignId]); // Trigger als datum of id verandert

  const filteredOffers = offers.filter(o => o.campaignId === campaignId);

  const handleSave = async () => {
    setLoading(true);
    let payload = {};
    if (activeTab === 'spend') {
      payload = { type: 'spend', date, campaignId, data: { google: googleSpend, microsoft: microsoftSpend } };
    } else {
      const conversionsList = filteredOffers.map(offer => ({
        offerId: offer.id,
        leads: Number(convData[offer.id]?.leads || 0),
        sales: Number(convData[offer.id]?.sales || 0),
      })).filter(c => c.leads > 0 || c.sales > 0);
      payload = { type: 'conversions', date, campaignId, data: conversionsList };
    }

    try {
      const res = await fetch('/api/daily-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success('Opgeslagen!');
        // We hoeven niet meer te resetten, want de data IS nu wat er in de database staat
      } else { toast.error('Er ging iets mis.'); }
    } catch (e) { toast.error('Er ging iets mis.'); } finally { setLoading(false); }
  };

  const handleConvChange = (id: number, field: 'leads' | 'sales', val: string) => { setConvData(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } })); };

  const tabClass = (tab: string) => `flex-1 py-3 text-sm font-medium text-center cursor-pointer border-b-2 transition-colors ${activeTab === tab ? 'border-neutral-100 text-neutral-100 bg-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50'}`;
  const inputClass = "w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-600 placeholder:text-neutral-700 transition-colors";

  return (
    <PageContainer title="Daily Input" subtitle={`Handmatige invoer voor ${campaignName}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LINKER KOLOM: Controls */}
            <div className="space-y-6">
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
                    <label className="text-xs font-medium text-neutral-500 uppercase mb-2 block">Datum Selectie</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${inputClass} [color-scheme:dark] mb-4`} />
                    
                    <div className="flex flex-col border border-neutral-800 rounded-lg overflow-hidden">
                        <div onClick={() => setActiveTab('spend')} className={tabClass('spend')}>💰 Advertising Costs</div>
                        <div onClick={() => setActiveTab('conversions')} className={tabClass('conversions')}>📈 Leads & Sales</div>
                    </div>
                </div>

                <button onClick={handleSave} disabled={loading || fetching} className="w-full bg-white text-black hover:bg-neutral-200 font-medium py-3 rounded-md transition-colors text-sm shadow-sm disabled:opacity-50">
                    {loading ? 'Opslaan...' : fetching ? 'Data ophalen...' : `💾 Opslaan / Updaten`}
                </button>
            </div>

            {/* RECHTER KOLOM: Input Fields */}
            <div className={`lg:col-span-2 transition-opacity duration-200 ${fetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {activeTab === 'spend' && (
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                        <div className="flex justify-between items-center pb-4 border-b border-neutral-800 mb-4">
                            <h2 className="text-lg font-semibold text-neutral-200">Kosten invoeren</h2>
                            {fetching && <span className="text-xs text-neutral-500 animate-pulse">Data laden...</span>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-neutral-500 font-medium uppercase mb-2 block">Google Spend</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-neutral-600">$</span>
                                    <input type="number" step="0.01" className={`${inputClass} pl-6`} value={googleSpend} onChange={e => setGoogleSpend(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-neutral-500 font-medium uppercase mb-2 block">Microsoft Spend</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-neutral-600">$</span>
                                    <input type="number" step="0.01" className={`${inputClass} pl-6`} value={microsoftSpend} onChange={e => setMicrosoftSpend(e.target.value)} placeholder="0.00" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'conversions' && (
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                        <div className="flex justify-between items-center pb-4 border-b border-neutral-800 mb-4">
                            <h2 className="text-lg font-semibold text-neutral-200">Leads & Sales invoeren</h2>
                            {fetching && <span className="text-xs text-neutral-500 animate-pulse">Data laden...</span>}
                        </div>
                        
                        {filteredOffers.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-neutral-800 rounded-lg text-neutral-500 text-sm">Geen offers gevonden voor dit project.</div>
                        ) : (
                            <div className="space-y-3">
                                {filteredOffers.map(offer => (
                                    <div key={offer.id} className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors group">
                                        <div className="flex-1 pr-4">
                                            <p className="text-sm font-medium text-neutral-200">{offer.name}</p>
                                            <p className="text-xs text-neutral-500">{offer.network ? offer.network.name : 'Unknown Network'}</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-neutral-500 uppercase mb-1">Leads</span>
                                                <input type="number" className={`${inputClass} w-24 text-center`} placeholder="0" value={convData[offer.id]?.leads || ''} onChange={e => handleConvChange(offer.id, 'leads', e.target.value)} />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-green-600/80 uppercase mb-1">Sales</span>
                                                <input type="number" className={`${inputClass} w-24 text-center border-green-900/20 focus:border-green-800`} placeholder="0" value={convData[offer.id]?.sales || ''} onChange={e => handleConvChange(offer.id, 'sales', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </PageContainer>
  );
}