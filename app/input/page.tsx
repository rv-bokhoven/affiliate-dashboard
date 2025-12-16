'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Offer { id: number; name: string; network: string; }

export default function InputPage() {
  const [activeTab, setActiveTab] = useState<'spend' | 'conversions'>('spend');
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Spend State
  const [googleSpend, setGoogleSpend] = useState('');
  const [microsoftSpend, setMicrosoftSpend] = useState('');

  // Conversion State
  const [offers, setOffers] = useState<Offer[]>([]);
  // We slaan op: { offerId: { leads: "5", sales: "1" } }
  const [convData, setConvData] = useState<Record<number, { leads: string, sales: string }>>({});

  useEffect(() => {
    fetch('/api/offers').then(res => res.json()).then(setOffers);
  }, []);

const handleSave = async () => {
    setLoading(true);
    let payload = {};

    if (activeTab === 'spend') {
      payload = {
        type: 'spend',
        date,
        // Let op de namen: 'google' en 'microsoft' (zonder Spend erachter)
        data: { 
          google: googleSpend, 
          microsoft: microsoftSpend 
        }
      };
    } else {
      const conversionsList = offers.map(offer => ({
        offerId: offer.id,
        leads: Number(convData[offer.id]?.leads || 0),
        sales: Number(convData[offer.id]?.sales || 0),
      })).filter(c => c.leads > 0 || c.sales > 0);

      payload = {
        type: 'conversions',
        date,
        data: conversionsList
      };
    }

    try {
      const res = await fetch('/api/daily-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`${activeTab === 'spend' ? 'Kosten' : 'Conversies'} succesvol opgeslagen!`);
      } else {
        toast.error('Er ging iets mis bij het opslaan.');
      }
      
    } catch (e) {
      console.error(e);
      toast.error('Er ging iets mis.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvChange = (id: number, field: 'leads' | 'sales', val: string) => {
    setConvData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: val }
    }));
  };

  const tabClass = (tab: string) => 
    `flex-1 py-3 text-sm font-medium text-center cursor-pointer border-b-2 transition-colors ${
      activeTab === tab ? 'border-blue-500 text-white bg-[#171717]' : 'border-transparent text-neutral-500 hover:text-neutral-300'
    }`;
    
  const inputClass = "w-full bg-[#0a0a0a] border border-[#262626] rounded-md px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-700 placeholder:text-neutral-600";

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-neutral-100">Daily Input</h1>
          <Link href="/" className="text-sm text-neutral-400 hover:text-white transition">← Back to Dashboard</Link>
        </div>

        {/* Datum Kiezer (Geldt voor beide tabs) */}
        <div className="mb-6">
           <label className="text-xs font-medium text-neutral-400 uppercase mb-1 block">Date</label>
           <input 
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className={`${inputClass} text-white [color-scheme:dark]`} 
            />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#262626] mb-6">
          <div onClick={() => setActiveTab('spend')} className={tabClass('spend')}>💰 Advertising costs</div>
          <div onClick={() => setActiveTab('conversions')} className={tabClass('conversions')}>📈 Leads & Sales</div>
        </div>

        {/* SPEND TAB */}
        {activeTab === 'spend' && (
          <div className="bg-[#171717] border border-[#262626] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-200 pb-2 border-b border-[#262626]">Costs data input</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Google Spend</label>
                <input type="number" step="0.01" className={inputClass} value={googleSpend} onChange={e => setGoogleSpend(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Microsoft Spend</label>
                <input type="number" step="0.01" className={inputClass} value={microsoftSpend} onChange={e => setMicrosoftSpend(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* CONVERSIONS TAB */}
        {activeTab === 'conversions' && (
          <div className="bg-[#171717] border border-[#262626] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-200 pb-2 border-b border-[#262626]">Leads & Sales input</h2>
            <div className="space-y-2">
              {offers.map(offer => (
                <div key={offer.id} className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#262626] rounded-lg">
                  <div className="w-1/3">
                    <p className="text-sm font-medium text-neutral-200">{offer.name}</p>
                    <p className="text-xs text-neutral-500">{offer.network}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-neutral-500 uppercase">Leads</span>
                      <input 
                        type="number" className={`${inputClass} w-16 text-center`} placeholder="0"
                        value={convData[offer.id]?.leads || ''}
                        onChange={e => handleConvChange(offer.id, 'leads', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-green-600 uppercase">Sales</span>
                      <input 
                        type="number" className={`${inputClass} w-16 text-center border-green-900/30 focus:ring-green-900`} placeholder="0"
                        value={convData[offer.id]?.sales || ''}
                        onChange={e => handleConvChange(offer.id, 'sales', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <button 
          onClick={handleSave} disabled={loading}
          className="mt-6 w-full bg-neutral-100 text-neutral-900 hover:bg-neutral-300 font-medium py-3 rounded-md transition-colors"
        >
          {loading ? 'Opslaan...' : `💾 Save: ${activeTab === 'spend' ? 'Costs' : 'Conversions'}`}
        </button>

      </div>
    </main>
  );
}