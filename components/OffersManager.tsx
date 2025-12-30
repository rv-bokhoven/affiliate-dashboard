'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import PageContainer from './PageContainer';

interface Offer { id: number; name: string; network: { id: number; name: string } | null; networkId?: number | null; status: string; payoutLead: number; payoutSale: number; capLeads?: number | null; capRevenue?: number | null; }
interface Network { id: number; name: string; }
interface OffersManagerProps { initialOffers: Offer[]; networks: Network[]; campaignId: number; campaignName: string; }

export default function OffersManager({ initialOffers, networks, campaignId, campaignName }: OffersManagerProps) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [networkId, setNetworkId] = useState<string>(''); 
  const [payoutLead, setPayoutLead] = useState('');
  const [payoutSale, setPayoutSale] = useState('');
  const [capLeads, setCapLeads] = useState('');
  const [capRevenue, setCapRevenue] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  const handleEditClick = (offer: Offer) => {
    setEditingId(offer.id); setName(offer.name);
    setNetworkId(offer.network?.id.toString() || offer.networkId?.toString() || '');
    setPayoutLead(offer.payoutLead.toString()); setPayoutSale(offer.payoutSale.toString());
    setCapLeads(offer.capLeads ? offer.capLeads.toString() : '');
    setCapRevenue(offer.capRevenue ? offer.capRevenue.toString() : '');
    setStatus(offer.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const resetForm = () => { setEditingId(null); setName(''); setNetworkId(''); setPayoutLead(''); setPayoutSale(''); setCapLeads(''); setCapRevenue(''); setStatus('ACTIVE'); };
  const handleSave = async () => {
    if (!name) { toast.error('Offer naam is verplicht'); return; }
    const payload = { id: editingId, name, networkId: networkId ? parseInt(networkId) : null, campaignId, payoutLead: parseFloat(payoutLead) || 0, payoutSale: parseFloat(payoutSale) || 0, capLeads: capLeads ? parseInt(capLeads) : null, capRevenue: capRevenue ? parseFloat(capRevenue) : null, status };
    try { const res = await fetch('/api/offers', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (res.ok) { toast.success('Opgeslagen!'); window.location.reload(); } else { toast.error('Fout bij opslaan'); } } catch (e) { toast.error('Er ging iets mis'); }
  };
  const inputClass = "w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none placeholder:text-neutral-700 transition-colors";

  return (
    <PageContainer title="Offers" subtitle={`Beheer offers voor ${campaignName}`}>
        
        {/* FORMULIER */}
        <div className={`border border-neutral-800 rounded-xl p-6 mb-8 transition-colors ${editingId ? 'bg-blue-900/10 border-blue-800/30' : 'bg-neutral-900/50'}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-neutral-200">{editingId ? `Offer #${editingId} wijzigen` : 'Nieuwe Offer Toevoegen'}</h2>
                {editingId && <button onClick={resetForm} className="text-xs text-neutral-400 hover:text-white underline">Annuleren</button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="md:col-span-2">
                    <label className="text-xs text-neutral-500 font-medium uppercase mb-1.5 block">Offer Naam</label>
                    <input type="text" className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Bijv. Dating Smartlink" />
                </div>
                <div>
                    <label className="text-xs text-neutral-500 font-medium uppercase mb-1.5 block">Netwerk</label>
                    <select className={inputClass} value={networkId} onChange={e => setNetworkId(e.target.value)}>
                        <option value="">-- Geen Netwerk --</option>
                        {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-neutral-500 font-medium uppercase mb-1.5 block">Status</label>
                    <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-neutral-500 font-medium uppercase mb-1.5 block">Payout Lead ($)</label>
                    <input type="number" step="0.01" className={inputClass} value={payoutLead} onChange={e => setPayoutLead(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                    <label className="text-xs text-neutral-500 font-medium uppercase mb-1.5 block">Payout Sale ($)</label>
                    <input type="number" step="0.01" className={inputClass} value={payoutSale} onChange={e => setPayoutSale(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                    <label className="text-xs text-yellow-600/80 font-medium uppercase mb-1.5 block">Cap (Leads)</label>
                    <input type="number" className={`${inputClass} focus:border-yellow-600/30`} value={capLeads} onChange={e => setCapLeads(e.target.value)} placeholder="Unlimited" />
                </div>
                <div>
                    <label className="text-xs text-yellow-600/80 font-medium uppercase mb-1.5 block">Cap (Revenue $)</label>
                    <input type="number" step="0.01" className={`${inputClass} focus:border-yellow-600/30`} value={capRevenue} onChange={e => setCapRevenue(e.target.value)} placeholder="Unlimited" />
                </div>
            </div>
            <button onClick={handleSave} className={`w-full py-2.5 rounded text-sm font-medium transition-colors ${editingId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white hover:bg-neutral-200 text-black'}`}>
                {editingId ? 'Wijzigingen Opslaan' : '+ Offer Toevoegen'}
            </button>
        </div>

        {/* LIJST */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-neutral-400">
                <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-300">
                    <tr>
                        <th className="p-4 font-medium">Naam</th>
                        <th className="p-4 font-medium">Netwerk</th>
                        <th className="p-4 font-medium text-right">Payout</th>
                        <th className="p-4 font-medium text-right">Caps</th>
                        <th className="p-4 font-medium text-center">Status</th>
                        <th className="p-4 font-medium text-right">Actie</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                    {offers.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center">Geen offers gevonden.</td></tr>
                    ) : (
                        offers.map(offer => (
                            <tr key={offer.id} className="hover:bg-neutral-800/50 transition-colors group">
                                <td className="p-4 text-neutral-200 font-medium">{offer.name}</td>
                                <td className="p-4">{offer.network ? offer.network.name : '-'}</td>
                                <td className="p-4 text-right">${offer.payoutLead} / ${offer.payoutSale}</td>
                                <td className="p-4 text-right text-xs">
                                    {offer.capLeads ? <div>L: {offer.capLeads}</div> : null}
                                    {offer.capRevenue ? <div>$: {offer.capRevenue}</div> : null}
                                    {!offer.capLeads && !offer.capRevenue && <span className="text-neutral-600">-</span>}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${offer.status === 'ACTIVE' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-neutral-500/10 border-neutral-500/20 text-neutral-500'}`}>{offer.status}</span>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleEditClick(offer)} className="text-neutral-400 hover:text-white text-xs border border-neutral-700 bg-neutral-800 px-3 py-1.5 rounded transition-colors">Wijzig</button>
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