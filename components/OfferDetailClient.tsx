'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { nl } from 'date-fns/locale';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { CalendarDays, ChevronLeft, ChevronDown, Check, ExternalLink } from 'lucide-react';
import PageContainer from './PageContainer';

registerLocale('nl', nl);

// --- TYPES ---
interface OfferDetailProps {
  offer: { id: number; name: string; network: string; status: string; currency: string; payoutLead: number; payoutSale: number; capLeads?: number; capRevenue?: number; };
  stats: { leads: number; sales: number; revenue: number; epc: number; cr: number; clicks: number; }; // Clicks is optioneel/fictief als je die niet trackt
  chartData: any[];
  currencySymbol: string;
  currentCurrency: string;
}

// --- DATE FILTER COMPONENT (Hergebruikt) ---
function DateFilter({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const options = [
      { label: 'This Week', value: 'this_week' },
      { label: 'Last Week', value: 'last_week' },
      { label: 'This Month', value: 'this_month' },
      { label: 'Last Month', value: 'last_month' },
      { label: 'This Year', value: 'this_year' },
      { label: 'All Time', value: 'all' },
      { label: 'Custom...', value: 'custom' },
    ];
    const currentLabel = options.find(o => o.value === value)?.label || 'This Month';
  
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) { setIsOpen(false); }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
  
    return (
      <div className="relative" ref={containerRef}>
          <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white px-3 py-2 rounded-lg transition-all text-sm font-medium min-w-[160px] justify-between group shadow-sm hover:bg-neutral-800">
              <div className="flex items-center gap-2"><CalendarDays size={16} className="text-neutral-500 group-hover:text-neutral-300 transition-colors" /><span>{currentLabel}</span></div>
              <ChevronDown size={14} className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden p-1.5">
                  {options.map((opt) => (
                      <button key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${value === opt.value ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'}`}>
                          <span>{opt.label}</span>{value === opt.value && <Check size={14} className="text-white" />}
                      </button>
                  ))}
              </div>
          )}
      </div>
    );
}

export default function OfferDetailClient({ offer, stats, chartData, currencySymbol, currentCurrency }: OfferDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('range') || 'this_month';
  const currentInterval = searchParams.get('interval') || 'day';
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  // Format helpers
  const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currentCurrency }).format(val);
  const toLocalYMD = (date: Date) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };

  // Handlers
  const handleFilterChange = (range: string) => { const p = new URLSearchParams(searchParams); p.set('range', range); if (range !== 'custom') { p.delete('from'); p.delete('to'); } router.replace(`?${p.toString()}`); };
  const handleCustomDateApply = () => { if (!startDate || !endDate) return; const p = new URLSearchParams(searchParams); p.set('range', 'custom'); p.set('from', toLocalYMD(startDate)); p.set('to', toLocalYMD(endDate)); router.push(`?${p.toString()}`); };
  const toggleCurrency = () => { const p = new URLSearchParams(searchParams); p.set('currency', currentCurrency === 'USD' ? 'EUR' : 'USD'); router.replace(`?${p.toString()}`); };

  return (
    <PageContainer
        title={offer.name}
        subtitle={<div className="flex items-center gap-2"><Link href="/" className="hover:text-white transition">Dashboard</Link> <span>/</span> <span className="text-neutral-200">{offer.network}</span></div>}
        actions={
            <div className="flex items-center gap-3">
                <button onClick={toggleCurrency} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition h-[38px]" title="Wissel Valuta">
                    <span className={currentCurrency === 'EUR' ? 'text-white font-bold' : 'text-neutral-500'}>€</span>
                    <div className="w-8 h-4 bg-neutral-800 rounded-full relative border border-neutral-700"><div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 transition-all ${currentCurrency === 'USD' ? 'left-[18px]' : 'left-0.5'}`}></div></div>
                    <span className={currentCurrency === 'USD' ? 'text-white font-bold' : 'text-neutral-500'}>$</span>
                </button>
                <DateFilter value={currentFilter} onChange={handleFilterChange} />
            </div>
        }
    >
        {/* Custom Date Picker */}
        {currentFilter === 'custom' && (
             <div className="flex justify-end mb-6"><div className="flex items-center gap-2"><div className="relative z-50"><DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)} locale="nl" dateFormat="dd/MM/yyyy" placeholderText="Kies periode" isClearable={true} customInput={<button className="bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">📅 {startDate ? startDate.toLocaleDateString() : 'Start'} - {endDate ? endDate.toLocaleDateString() : 'Eind'}</button>} /></div>{startDate && endDate && <button onClick={handleCustomDateApply} className="bg-white text-black text-xs px-3 py-2 rounded font-medium hover:bg-neutral-200 transition">Toepassen</button>}</div></div>
        )}

        {/* INFO BAR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-neutral-900/30 border border-neutral-800 p-4 rounded-lg">
                <p className="text-xs text-neutral-500 uppercase mb-1">Status</p>
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${offer.status === 'ACTIVE' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-neutral-500/10 border-neutral-500/20 text-neutral-500'}`}>{offer.status}</span>
            </div>
            <div className="bg-neutral-900/30 border border-neutral-800 p-4 rounded-lg">
                <p className="text-xs text-neutral-500 uppercase mb-1">Payout (Origineel)</p>
                <p className="text-neutral-200 font-medium text-sm">{offer.currency === 'EUR' ? '€' : '$'}{offer.payoutLead} / {offer.currency === 'EUR' ? '€' : '$'}{offer.payoutSale}</p>
            </div>
            <div className="bg-neutral-900/30 border border-neutral-800 p-4 rounded-lg">
                 <p className="text-xs text-neutral-500 uppercase mb-1">Cap Leads</p>
                 <p className="text-neutral-200 font-medium text-sm">{offer.capLeads ? offer.capLeads : 'Unlimited'}</p>
            </div>
            <div className="bg-neutral-900/30 border border-neutral-800 p-4 rounded-lg">
                 <p className="text-xs text-neutral-500 uppercase mb-1">Cap Revenue</p>
                 <p className="text-neutral-200 font-medium text-sm">{offer.capRevenue ? `${offer.currency === 'EUR' ? '€' : '$'}${offer.capRevenue}` : 'Unlimited'}</p>
            </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <KpiCard title="Leads" value={stats.leads.toString()} />
            <KpiCard title="Sales" value={stats.sales.toString()} />
            <KpiCard title="Conversion Rate" value={`${stats.cr.toFixed(2)}%`} />
            <KpiCard title="Revenue" value={formatMoney(stats.revenue)} highlight />
        </div>

        {/* CHART */}
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 h-[400px]">
            <h3 className="text-lg font-semibold text-neutral-200 mb-6">Performance</h3>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="date" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} tickFormatter={(val) => new Date(val).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} />
                    <YAxis yAxisId="left" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} />
                    <YAxis yAxisId="right" orientation="right" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} />
                    <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5' }} labelFormatter={(label) => new Date(label).toLocaleDateString('nl-NL')} formatter={(val, name) => [name === 'Revenue' ? formatMoney(val as number) : val, name]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#eab308" maxBarSize={50} radius={[4,4,0,0]} />
                    <Bar yAxisId="left" dataKey="sales" name="Sales" fill="#22c55e" maxBarSize={50} radius={[4,4,0,0]} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    </PageContainer>
  );
}

function KpiCard({ title, value, highlight }: { title: string, value: string, highlight?: boolean }) {
    return (
        <div className={`border p-6 rounded-xl flex flex-col justify-between ${highlight ? 'bg-blue-500/10 border-blue-500/20' : 'bg-neutral-900/50 border-neutral-800'}`}>
            <p className={`text-sm font-medium mb-2 ${highlight ? 'text-blue-400' : 'text-neutral-500'}`}>{title}</p>
            <h3 className={`text-2xl font-bold ${highlight ? 'text-blue-100' : 'text-neutral-100'}`}>{value}</h3>
        </div>
    );
}