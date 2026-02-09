'use client';

import { useState } from 'react';
import { addManualLog, deleteManualLog, updateManualLog } from '@/app/actions';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Check } from 'lucide-react';

// --- HOOFD COMPONENT ---
export default function ManualEntryManager({ 
    campaignId, 
    logs, 
    offers 
}: { 
    campaignId: number, 
    logs: any[], 
    offers: { id: number, name: string }[] 
}) {
  // State voor TOEVOEGEN formulier
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('Google');
  const [externalCampaign, setExternalCampaign] = useState('');
  const [offerName, setOfferName] = useState('');
  const [leads, setLeads] = useState(0);
  const [sales, setSales] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalCampaign) return toast.error("Vul een campagne naam in");

    setLoading(true);
    try {
      await addManualLog(campaignId, date, platform, externalCampaign, offerName, leads, sales, revenue);
      toast.success('Toegevoegd');
      // Reset velden
      setExternalCampaign('');
      setOfferName('');
      setLeads(0);
      setSales(0);
      setRevenue(0);
    } catch {
      toast.error('Mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. INPUT BALK (TOEVOEGEN) */}
      <div className="bg-neutral-900/50 border border-neutral-800 p-5 rounded-xl">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Plus size={18} className="text-blue-500" /> New Input
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-3 xl:items-end">
            <div className="w-full xl:w-32">
                <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none [color-scheme:dark]" />
            </div>
            <div className="w-full xl:w-40">
                <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none appearance-none">
                    <option value="Google">Google Ads</option>
                    <option value="Microsoft">Microsoft Ads</option>
                    <option value="Facebook">Facebook / Meta</option>
                </select>
            </div>
            <div className="w-full xl:flex-1">
                <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Campaign name</label>
                <input type="text" placeholder="Eg. Best accounting software" value={externalCampaign} onChange={(e) => setExternalCampaign(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="w-full xl:flex-1 relative">
                <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Offer</label>
                <input list="offer-options" type="text" placeholder="Choose or type..." value={offerName} onChange={(e) => setOfferName(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                <datalist id="offer-options">{offers.map(o => <option key={o.id} value={o.name} />)}</datalist>
            </div>
            <div className="flex gap-2 w-full xl:w-auto">
                <div className="w-1/3 xl:w-20"><label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Leads</label><input type="number" min="0" value={leads} onChange={(e) => setLeads(parseInt(e.target.value))} className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" /></div>
                <div className="w-1/3 xl:w-20"><label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Sales</label><input type="number" min="0" value={sales} onChange={(e) => setSales(parseInt(e.target.value))} className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" /></div>
                <div className="w-1/3 xl:w-24"><label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Revenue</label><input type="number" min="0" step="0.01" value={revenue} onChange={(e) => setRevenue(parseFloat(e.target.value))} className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" /></div>
            </div>
            <button type="submit" disabled={loading} className="w-full xl:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded text-sm transition h-[38px]">Add</button>
        </form>
      </div>

      {/* 2. TABEL (Weergave & Bewerken) */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-neutral-950/50 text-xs uppercase font-medium text-neutral-500 border-b border-neutral-800">
                <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Offer</th>
                    <th className="px-4 py-3 text-right">Leads</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right w-24">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
                {logs.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 italic">Nog geen invoer.</td></tr>
                ) : logs.map((log) => (
                    <ManualLogRow key={log.id} log={log} offers={offers} />
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

// --- SUB COMPONENT VOOR DE RIJ (BEVAT EDIT LOGICA) ---
function ManualLogRow({ log, offers }: { log: any, offers: any[] }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Edit State
    const [date, setDate] = useState(new Date(log.date).toISOString().split('T')[0]);
    const [platform, setPlatform] = useState(log.platform);
    const [externalCampaign, setExternalCampaign] = useState(log.externalCampaign);
    const [offerName, setOfferName] = useState(log.offerName || '');
    const [leads, setLeads] = useState(log.leads);
    const [sales, setSales] = useState(log.sales);
    const [revenue, setRevenue] = useState(log.revenue);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateManualLog(log.id, date, platform, externalCampaign, offerName, leads, sales, revenue);
            toast.success("Opgeslagen");
            setIsEditing(false);
        } catch {
            toast.error("Opslaan mislukt");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if(!confirm("Weet je het zeker?")) return;
        await deleteManualLog(log.id);
        toast.success("Verwijderd");
    };

    const getPlatformStyle = (p: string) => {
        const low = p.toLowerCase();
        if (low.includes('google')) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
        if (low.includes('microsoft') || low.includes('bing')) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
        if (low.includes('facebook') || low.includes('meta')) return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
        if (low.includes('tiktok')) return 'text-pink-400 border-pink-500/30 bg-pink-500/10';
        return 'text-neutral-400 border-neutral-700 bg-neutral-800';
    }

    if (isEditing) {
        return (
            <tr className="bg-blue-500/5">
                <td className="px-2 py-3"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs w-full text-white" /></td>
                <td className="px-2 py-3">
                    <select value={platform} onChange={e => setPlatform(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs w-full text-white">
                        <option value="Google">Google</option><option value="Microsoft">Microsoft</option><option value="Facebook">Facebook</option><option value="TikTok">TikTok</option><option value="Other">Overig</option>
                    </select>
                </td>
                <td className="px-2 py-3"><input type="text" value={externalCampaign} onChange={e => setExternalCampaign(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs w-full text-white" /></td>
                <td className="px-2 py-3"><input list="offer-options" type="text" value={offerName} onChange={e => setOfferName(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs w-full text-white" /></td>
                <td className="px-2 py-3"><input type="number" value={leads} onChange={e => setLeads(parseInt(e.target.value))} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs w-full text-white text-right" /></td>
                <td className="px-2 py-3"><input type="number" value={sales} onChange={e => setSales(parseInt(e.target.value))} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs w-full text-white text-right" /></td>
                <td className="px-2 py-3"><input type="number" step="0.01" value={revenue} onChange={e => setRevenue(parseFloat(e.target.value))} className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs w-full text-white text-right" /></td>
                <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <button onClick={handleSave} disabled={isLoading} className="text-green-500 hover:text-green-400 p-1 bg-green-500/10 rounded"><Check size={14} /></button>
                    <button onClick={() => setIsEditing(false)} className="text-neutral-500 hover:text-neutral-300 p-1 hover:bg-neutral-800 rounded"><X size={14} /></button>
                </td>
            </tr>
        );
    }

    return (
        <tr className="hover:bg-neutral-800/30 transition-colors group">
            <td className="px-4 py-3 text-neutral-300 font-mono text-xs">{new Date(log.date).toLocaleDateString('nl-NL')}</td>
            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-medium border ${getPlatformStyle(log.platform)}`}>{log.platform}</span></td>
            <td className="px-4 py-3 text-white font-medium">{log.externalCampaign}</td>
            <td className="px-4 py-3 text-neutral-400">{log.offerName || '-'}</td>
            <td className="px-4 py-3 text-right font-mono">{log.leads > 0 ? log.leads : '-'}</td>
            <td className="px-4 py-3 text-right font-mono text-white">{log.sales > 0 ? log.sales : '-'}</td>
            <td className="px-4 py-3 text-right font-mono text-green-400 font-bold">{log.revenue > 0 ? `€${log.revenue.toFixed(2)}` : '-'}</td>
            <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                <button onClick={() => setIsEditing(true)} className="text-blue-500 hover:text-blue-400 p-1 hover:bg-blue-500/10 rounded"><Edit2 size={14} /></button>
                <button onClick={handleDelete} className="text-neutral-600 hover:text-red-500 p-1 hover:bg-red-500/10 rounded"><Trash2 size={14} /></button>
            </td>
        </tr>
    );
}