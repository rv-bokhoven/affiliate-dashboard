'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Offer {
  id: number;
  name: string;
  network: string;
  payoutLead: number;
  payoutSale: number;
  capLeads?: number;    // Nieuw
  capRevenue?: number;  // Nieuw
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit State: Als dit null is, zijn we nieuw aan het maken. Anders updaten we dit ID.
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form inputs
  const [name, setName] = useState('');
  const [network, setNetwork] = useState('');
  const [payoutLead, setPayoutLead] = useState('');
  const [payoutSale, setPayoutSale] = useState('');

  const [capLeads, setCapLeads] = useState('');
  const [capRevenue, setCapRevenue] = useState('');

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    const res = await fetch('/api/offers');
    const data = await res.json();
    setOffers(data);
  };

  // Functie die het formulier vult met bestaande data
  const handleEditClick = (offer: Offer) => {
  setEditingId(offer.id);
  setName(offer.name);
  setNetwork(offer.network || '');
  setPayoutLead(offer.payoutLead.toString());
  setPayoutSale(offer.payoutSale.toString());
  // NIEUW:
  setCapLeads(offer.capLeads ? offer.capLeads.toString() : '');
  setCapRevenue(offer.capRevenue ? offer.capRevenue.toString() : '');
  };

  // Functie om formulier te resetten naar "Nieuw" modus
  const resetForm = () => {
  setEditingId(null);
  setName('');
  setNetwork('');
  setPayoutLead('');
  setPayoutSale('');
  // NIEUW:
  setCapLeads('');
  setCapRevenue('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        // --- UPDATE MODUS (PUT) ---
        const res = await fetch('/api/offers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: editingId,
            name, 
            network, 
            payoutLead, 
            payoutSale,
            capLeads,
            capRevenue
          }),
        });
        if (res.ok) {
          // Reset formulier en ververs lijst...
          resetForm(); 
          // ...
          
          // NIEUW: Voeg de toast toe
          toast.success(editingId ? 'Offer Successfully Updated!' : 'New Offer Created!');
          
          fetchOffers();
        } else {
          toast.error('Could not save offer.');
        }
      } else {
        // --- CREATE MODUS (POST) ---
        const res = await fetch('/api/offers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, network, payoutLead, payoutSale, capLeads, capRevenue }),
        });
        if (res.ok) resetForm();
      }
      
      // Ververs de lijst
      fetchOffers();

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[#0a0a0a] border border-[#262626] rounded-md px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-700 placeholder:text-neutral-600";
  const labelClass = "block text-xs font-medium text-neutral-400 mb-1.5 uppercase tracking-wide";

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-8">
        
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-100">Manage Offers</h1>
          <Link href="/" className="text-sm text-neutral-400 hover:text-white transition">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* LINKERKANT: FORMULIER */}
          <div className="bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6 h-fit sticky top-8">
            <div className="flex justify-between items-center border-b border-[#262626] pb-4 mb-4">
              <h2 className="text-lg font-semibold text-neutral-200">
                {editingId ? 'Offer Bewerken ✏️' : 'Add New Deal'}
              </h2>
              {editingId && (
                <button 
                  onClick={resetForm}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Offer Name</label>
                <input 
                  type="text" required placeholder="e.g. Netsuite US"
                  value={name} onChange={e => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Network</label>
                <input 
                  type="text" placeholder="e.g. Daisycon"
                  value={network} onChange={e => setNetwork(e.target.value)}
                  className={inputClass}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Lead Payout ($)</label>
                  <input 
                    type="number" step="0.01" placeholder="0.00"
                    value={payoutLead} onChange={e => setPayoutLead(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Sale Payout ($)</label>
                  <input 
                    type="number" step="0.01" placeholder="0.00"
                    value={payoutSale} onChange={e => setPayoutSale(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

                <div className="pt-4 border-t border-[#262626]">
                    <p className="text-xs text-neutral-500 mb-3 font-medium uppercase">Monthly Caps (Optional)</p>
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className={labelClass}>Max Leads</label>
                    <input 
                    type="number" placeholder="No limit"
                    value={capLeads} onChange={e => setCapLeads(e.target.value)}
                    className={inputClass}
                    />
                    </div>
                  <div>
                  <label className={labelClass}>Max Budget ($)</label>
                  <input 
                        type="number" step="0.01" placeholder="No limit"
                        value={capRevenue} onChange={e => setCapRevenue(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

              <button 
                type="submit" disabled={loading}
                className={`w-full font-medium px-4 py-2 rounded-md transition-colors text-sm mt-2 ${
                  editingId 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white' // Blauw voor update
                    : 'bg-neutral-100 hover:bg-neutral-300 text-neutral-900' // Wit voor nieuw
                }`}
              >
                {loading ? 'Bezig...' : (editingId ? 'Save & Update' : '+ Add Offer')}
              </button>
            </form>
          </div>

          {/* RECHTERKANT: LIJST */}
          <div className="bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-neutral-200 border-b border-[#262626] pb-4 mb-4">
              Active Offers ({offers.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {offers.map((offer) => (
                <div 
                  key={offer.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    editingId === offer.id 
                      ? 'bg-blue-900/20 border-blue-500/50' // Highlight als je deze bewerkt
                      : 'bg-[#0a0a0a] border-[#262626] hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{offer.name}</p>
                    <p className="text-xs text-neutral-500">{offer.network || 'Geen netwerk'}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right flex flex-col items-end gap-0.5">
                      {offer.payoutLead > 0 && (
                        <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                          L: €{offer.payoutLead.toFixed(2)}
                        </span>
                      )}
                      {offer.payoutSale > 0 && (
                        <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                          S: €{offer.payoutSale.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {/* EDIT KNOP */}
                    <button 
                      onClick={() => handleEditClick(offer)}
                      className="text-neutral-500 hover:text-white p-2 rounded-md hover:bg-neutral-800 transition"
                      title="Bewerken"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              ))}
              
              {offers.length === 0 && (
                <p className="text-neutral-500 text-sm italic">No offers created yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}