'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, subMonths, addMonths, parseISO, startOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

interface Adjustment { id: number; amount: number; description: string; type: string; date: string; }

export default function FinanceManager({ campaignId }: { campaignId: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Haal maand uit URL of pak huidige maand
  const urlMonth = searchParams.get('month');
  const [currentMonth, setCurrentMonth] = useState(urlMonth ? parseISO(`${urlMonth}-01`) : startOfMonth(new Date()));
  
  const [items, setItems] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('BONUS');

  // 1. Data Ophalen als maand verandert
  useEffect(() => {
    fetchData();
  }, [currentMonth, campaignId]);

  const fetchData = async () => {
      setLoading(true);
      const monthStr = format(currentMonth, 'yyyy-MM');
      try {
          const res = await fetch(`/api/finance?campaignId=${campaignId}&month=${monthStr}`);
          if (res.ok) {
              setItems(await res.json());
          }
      } catch (e) { console.error(e); }
      setLoading(false);
  };

  // 2. Maand Wisselen
  const changeMonth = (offset: number) => {
      const newDate = offset > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1);
      setCurrentMonth(newDate);
      
      // Update URL zonder reload
      const params = new URLSearchParams(searchParams);
      params.set('month', format(newDate, 'yyyy-MM'));
      router.replace(`/finance?${params.toString()}`);
  };

  // 3. Toevoegen
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        body: JSON.stringify({
            amount: parseFloat(amount),
            description,
            type,
            campaignId,
            // BELANGRIJK: We sturen de datum van de GESELECTEERDE maand mee
            date: currentMonth.toISOString() 
        })
      });

      if (res.ok) {
        toast.success('Toegevoegd!');
        setAmount('');
        setDescription('');
        fetchData(); // Herlaad lijst
        router.refresh(); // Update eventuele totals in sidebar/header
      } else {
        const err = await res.json();
        toast.error(err.error || 'Er ging iets mis');
      }
    } catch (e) { toast.error('Netwerk fout'); }
  };

  // 4. Verwijderen
  const handleDelete = async (id: number) => {
      if(!confirm('Zeker weten?')) return;
      await fetch(`/api/finance?id=${id}`, { method: 'DELETE' });
      toast.success('Verwijderd');
      fetchData();
      router.refresh();
  };

  const total = items.reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="max-w-4xl mx-auto">
      
      {/* HEADER MET MAAND SELECTIE */}
      <div className="flex items-center justify-between mb-8 bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition"><ChevronLeft size={20} /></button>
        
        <div className="text-center">
            <h2 className="text-xl font-bold text-white capitalize">{format(currentMonth, 'MMMM yyyy', { locale: nl })}</h2>
            <p className="text-xs text-neutral-500 font-mono mt-1">Netto resultaat: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}</p>
        </div>

        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition"><ChevronRight size={20} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FORMULIER */}
        <div className="md:col-span-1">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 sticky top-6">
                <h3 className="font-semibold text-neutral-200 mb-4">Toevoegen</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setType('BONUS')} className={`px-3 py-2 text-sm font-medium rounded-md border transition ${type === 'BONUS' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Bonus (+)</button>
                            <button type="button" onClick={() => setType('DEDUCTION')} className={`px-3 py-2 text-sm font-medium rounded-md border transition ${type === 'DEDUCTION' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>Correctie (-)</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Omschrijving</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:border-neutral-600 outline-none" placeholder="Bijv. Netwerk Bonus" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-500 uppercase mb-1">Bedrag ($)</label>
                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-white focus:border-neutral-600 outline-none" placeholder="0.00" />
                    </div>
                    <button type="submit" className="w-full bg-white text-black font-medium py-2 rounded-md hover:bg-neutral-200 transition flex items-center justify-center gap-2">
                        <Plus size={16} /> Opslaan
                    </button>
                </form>
            </div>
        </div>

        {/* LIJST */}
        <div className="md:col-span-2 space-y-3">
            {loading ? (
                <div className="text-neutral-500 text-center py-10">Laden...</div>
            ) : items.length === 0 ? (
                <div className="text-neutral-500 text-center py-10 bg-neutral-900/30 border border-neutral-800/50 rounded-xl border-dashed">
                    Geen items gevonden voor deze maand.
                </div>
            ) : (
                items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg group hover:border-neutral-700 transition">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.amount >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {item.amount >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div>
                                <p className="font-medium text-neutral-200">{item.description}</p>
                                <p className="text-xs text-neutral-500">{format(new Date(item.date), 'dd MMM yyyy', { locale: nl })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`font-mono font-medium ${item.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {item.amount >= 0 ? '+' : ''}{item.amount.toFixed(2)}
                            </span>
                            <button onClick={() => handleDelete(item.id)} className="text-neutral-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}