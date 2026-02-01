'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { nl } from 'date-fns/locale';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { CalendarDays, ArrowUpRight, ArrowDownRight, Info, ChevronDown, Check, AlertTriangle, MessageSquare } from 'lucide-react';
import PageContainer from './PageContainer';

registerLocale('nl', nl);

// --- Interfaces ---
interface DashboardData {
  date: string;
  spend: number;
  revenue: number;
  leads: number; 
  sales: number; 
  profit: number;
  roi: number | null;
  googleSpend?: number;
  microsoftSpend?: number;
}

export interface TopOffer { 
    id: number; 
    name: string; 
    network: string; 
    leads: number; 
    sales: number; 
    revenue: number; 
    capLeads?: number | null; 
    capRevenue?: number | null; 
}

interface DashboardClientProps {
  data: DashboardData[]; 
  topOffers: TopOffer[]; 
  capOffers: TopOffer[];
  totals: { 
      spend: number; 
      revenue: number; 
      profit: number; 
      roi: number; 
      googleSpend: number; 
      microsoftSpend: number; 
      leads: number; 
      sales: number; 
      revShare: number; 
  };
  trends: {
      revenue: number;
      profit: number;
      spend: number;
  };
  annotations: { id: number; date: string; text: string }[];
  campaignName: string; 
  campaignType: string;
  currencySymbol: string;
  currentCurrency: string;
}

// --- Datum Filter Dropdown ---
function DateFilter({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
  
    const options = [
      { label: 'Yesterday', value: 'yesterday' },
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
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
  
    return (
      <div className="relative" ref={containerRef}>
          <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white px-3 py-2 rounded-lg transition-all text-sm font-medium min-w-[160px] justify-between group shadow-sm hover:bg-neutral-800"
          >
              <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-neutral-500 group-hover:text-neutral-300 transition-colors" />
                  <span>{currentLabel}</span>
              </div>
              <ChevronDown size={14} className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
  
          {isOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1.5">
                  {options.map((opt) => (
                      <button
                          key={opt.value}
                          onClick={() => { onChange(opt.value); setIsOpen(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${value === opt.value ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'}`}
                      >
                          <span>{opt.label}</span>
                          {value === opt.value && <Check size={14} className="text-white" />}
                      </button>
                  ))}
              </div>
          )}
      </div>
    );
}

// --- Custom Tooltip Component ---
const CustomTooltip = ({ active, payload, label, annotations, formatMoney }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0].payload;
    const note = annotations.find((n: any) => n.date === label);

    return (
        <div className="bg-[#171717] border border-[#262626] rounded-lg p-3 shadow-xl max-w-[250px] z-50">
            <p className="text-neutral-200 font-bold mb-2 border-b border-neutral-800 pb-1">
                {new Date(label).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            
            <div className="space-y-1">
                {payload.map((entry: any) => (
                    <div key={entry.name} className="flex justify-between items-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            {/* Gebruik gradient icoontje voor ROI of vaste kleur voor de rest */}
                            <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ 
                                    background: entry.name.includes('ROI') 
                                        ? 'linear-gradient(180deg, #10b981 0%, #ef4444 100%)' 
                                        : entry.color 
                                }} 
                            />
                            <span className="text-neutral-400">{entry.name}</span>
                        </div>
                        <span className="text-white font-mono font-medium">
                            {entry.name.includes('ROI') 
                                ? `${entry.value.toFixed(1)}%` 
                                : formatMoney(entry.value)}
                        </span>
                    </div>
                ))}

                {/* Net Profit Regel */}
                <div className="flex justify-between items-center gap-4 text-xs pt-1 mt-1 border-t border-dashed border-neutral-800">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dataPoint.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-neutral-400">Net Profit</span>
                    </div>
                    <span className={`font-mono font-bold ${dataPoint.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatMoney(dataPoint.profit)}
                    </span>
                </div>
            </div>

            {note && (
                <div className="mt-3 pt-2 border-t border-neutral-800 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-2">
                        <MessageSquare size={14} className="text-blue-400 mt-0.5 shrink-0" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-blue-400 block mb-0.5">Annotatie</span>
                            <p className="text-xs text-neutral-300 italic leading-relaxed">
                                "{note.text}"
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function DashboardClient({ 
    data, topOffers, capOffers, totals, trends, annotations,
    campaignName, campaignType, currencySymbol, currentCurrency 
}: DashboardClientProps) {
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('range') || 'yesterday';
  const currentInterval = searchParams.get('interval') || 'day';
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [chartType, setChartType] = useState<'line' | 'heatmap'>('line');

  // --- NIEUW: Bereken het omslagpunt voor de gradient ---
  const gradientOffset = () => {
    if (!data || data.length === 0) return 0;
    
    // Zoek max en min ROI
    const dataMax = Math.max(...data.map((i) => i.roi || 0));
    const dataMin = Math.min(...data.map((i) => i.roi || 0));
  
    // Als alles positief is: offset = 1 (helemaal groen)
    if (dataMax <= 0) return 0;
    // Als alles negatief is: offset = 0 (helemaal rood)
    if (dataMin >= 0) return 1;
  
    // Anders: bereken percentage waar '0' ligt
    return dataMax / (dataMax - dataMin);
  };
  
  const off = gradientOffset();

  // DEBUGGING
  useEffect(() => {
    if (annotations.length > 0 && data.length > 0) {
        // console.log("--- DEBUG ANNOTATIONS ---");
        // annotations.forEach(note => {
        //     const match = data.find(d => d.date === note.date);
        //     if(!match) console.log(`❌ GEEN MATCH voor ${note.date}`);
        // });
    }
  }, [annotations, data]);

  const formatMoney = (amount: number) => {
      return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: currentCurrency, 
          minimumFractionDigits: 2 
      }).format(amount);
  };

  const handleFilterChange = (range: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('range', range);
    if (range !== 'custom') { params.delete('from'); params.delete('to'); }
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const handleIntervalChange = (newInterval: string) => { 
      const params = new URLSearchParams(searchParams); 
      params.set('interval', newInterval); 
      router.replace(`/?${params.toString()}`, { scroll: false }); 
  };
  
  const toggleCurrency = () => {
      const params = new URLSearchParams(searchParams);
      const newCurrency = currentCurrency === 'USD' ? 'EUR' : 'USD';
      params.set('currency', newCurrency);
      router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const toLocalYMD = (date: Date) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
  const handleCustomDateApply = () => { if (!startDate || !endDate) return; const params = new URLSearchParams(searchParams); params.set('range', 'custom'); params.set('from', toLocalYMD(startDate)); params.set('to', toLocalYMD(endDate)); router.push(`/?${params.toString()}`); };
  const getPercent = (part: number, total: number) => total === 0 ? '0' : ((part / total) * 100).toFixed(0);

  const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? { diff: 100, label: 'New' } : { diff: 0, label: '0%' };
      const diff = ((current - previous) / Math.abs(previous)) * 100;
      return { diff, label: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` };
  };

  const revenueTrend = calculateTrend(totals.revenue, trends.revenue);
  const profitTrend = calculateTrend(totals.profit, trends.profit);

  return (
    <PageContainer 
      title="Dashboard"
      subtitle={
        <div className="flex items-center gap-2">
            <span>Overview for <span className="text-neutral-100 font-medium">{campaignName}</span></span>
            <span className={`text-[10px] px-2 py-0.5 rounded mb-1 ${campaignType === 'SEO' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                {campaignType}
            </span>
        </div>
      }
      actions={
        <div className="flex items-center gap-3">
            <button 
                onClick={toggleCurrency}
                className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition shadow-sm h-[38px]"
                title="Wissel Valuta"
            >
                <span className={currentCurrency === 'EUR' ? 'text-white font-bold' : 'text-neutral-500'}>€</span>
                <div className="w-8 h-4 bg-neutral-800 rounded-full relative border border-neutral-700">
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 transition-all shadow-sm ${currentCurrency === 'USD' ? 'left-[18px]' : 'left-0.5'}`}></div>
                </div>
                <span className={currentCurrency === 'USD' ? 'text-white font-bold' : 'text-neutral-500'}>$</span>
            </button>
            <DateFilter value={currentFilter} onChange={handleFilterChange} />
        </div>
      }
    >
      {/* 1. Custom Date Picker */}
      {currentFilter === 'custom' && (
             <div className="flex justify-end mb-6 animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center gap-2">
                  <div className="relative z-50">
                    <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)} locale="nl" dateFormat="dd/MM/yyyy" placeholderText="Kies periode" isClearable={true}
                        customInput={<button className="bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"> {startDate ? startDate.toLocaleDateString() : 'Start'} - {endDate ? endDate.toLocaleDateString() : 'End'}</button>}
                    />
                  </div>
                  {startDate && endDate && <button onClick={handleCustomDateApply} className="bg-white text-black text-xs px-3 py-2 rounded font-medium hover:bg-neutral-200 transition">Apply</button>}
               </div>
             </div>
      )}

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {campaignType === 'SEO' ? (
            <>
                <StatsCard title="Total Leads" value={totals.leads.toString()} trend="neutral" />
                <StatsCard title="Total Sales" value={totals.sales.toString()} trend="positive" />
                <StatsCard title="RevShare" value={formatMoney(totals.revShare)} trend="neutral" />
                <StatsCard title="Total Revenue" value={formatMoney(totals.revenue)} trend={revenueTrend.diff >= 0 ? 'positive' : 'negative'} trendLabel={revenueTrend.label} />
            </>
        ) : (
            <>
                <div className="bg-neutral-900/50 border border-neutral-800 p-4 md:p-6 rounded-xl shadow-sm relative group overflow-visible">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-medium text-neutral-500">Total Spend</p>
                        <div className="relative">
                            <Info size={14} className="text-neutral-600 cursor-help" />
                            <div className="absolute right-0 top-6 w-56 bg-neutral-950 border border-neutral-800 rounded-lg shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <p className="text-xs text-neutral-400 mb-2 font-medium uppercase border-b border-neutral-800 pb-1">Platform Split</p>
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-blue-400">Google</span>
                                            <span className="text-neutral-300">{formatMoney(totals.googleSpend)}</span>
                                        </div>
                                        <div className="w-full bg-neutral-800 rounded-full h-1"><div className="bg-blue-500 h-1 rounded-full" style={{ width: `${getPercent(totals.googleSpend, totals.spend)}%` }}></div></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-cyan-400">Microsoft</span>
                                            <span className="text-neutral-300">{formatMoney(totals.microsoftSpend)}</span>
                                        </div>
                                        <div className="w-full bg-neutral-800 rounded-full h-1"><div className="bg-cyan-400 h-1 rounded-full" style={{ width: `${getPercent(totals.microsoftSpend, totals.spend)}%` }}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-100">{formatMoney(totals.spend)}</h3>
                </div>

                <StatsCard 
                    title="Total Revenue" 
                    value={formatMoney(totals.revenue)} 
                    trend={revenueTrend.diff >= 0 ? 'positive' : 'negative'} 
                    trendLabel={revenueTrend.label}
                />
                
                <StatsCard 
                    title="Net Profit" 
                    value={formatMoney(totals.profit)} 
                    trend={profitTrend.diff >= 0 ? 'positive' : 'negative'}
                    trendLabel={profitTrend.label} 
                />
                
                <StatsCard 
                    title="ROI" 
                    value={`${totals.roi.toFixed(1)}%`} 
                    trend={totals.roi >= 0 ? 'positive' : 'negative'} 
                />
            </>
        )}
      </div>

      {/* 3. CHART */}
      <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6 mb-6 min-w-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-neutral-200">{chartType === 'line' ? 'Performance Overview' : 'Profit Heatmap'}</h3>
                <div className="flex gap-4 self-end sm:self-auto">
                    <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                        <button onClick={() => setChartType('line')} className={`px-2 py-1 text-xs rounded transition ${chartType === 'line' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>📈</button>
                        <button onClick={() => setChartType('heatmap')} className={`px-2 py-1 text-xs rounded transition ${chartType === 'heatmap' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>📅</button>
                    </div>
                    {chartType === 'line' && (
                        <div className="flex bg-neutral-900 border border-neutral-800 rounded-lg p-1">
                            {['day', 'week', 'month'].map((t) => (
                                <button key={t} onClick={() => handleIntervalChange(t)} className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${currentInterval === t ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>{t}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="relative w-full h-[400px]">
                {data.length > 0 ? (
                    chartType === 'line' ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <ComposedChart data={data}>
                            
                            {/* --- GRADIENT DEFINITIE (NIEUW) --- */}
                            <defs>
                                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={off} stopColor="#10b981" stopOpacity={1} /> {/* Groen (Top) */}
                                    <stop offset={off} stopColor="#ef4444" stopOpacity={1} /> {/* Rood (Bottom) */}
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                            
                            <XAxis 
                                dataKey="date" 
                                stroke="#525252" 
                                tick={{fill: '#737373', fontSize: 12}} 
                                tickFormatter={(val) => { const d = new Date(val); if (currentInterval === 'month') return d.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' }); return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }); }} 
                            />
                            
                            <YAxis yAxisId="left" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} tickFormatter={(val) => `${currencySymbol}${val}`} />
                            <YAxis yAxisId="right" orientation="right" stroke="#525252" unit={campaignType === 'SEO' ? '' : '%'} tick={{fill: '#737373', fontSize: 12}} />
                            
                            <Tooltip 
                                content={<CustomTooltip annotations={annotations} formatMoney={formatMoney} />}
                                cursor={{ fill: '#ffffff', opacity: 0.05 }}
                            />
                            <Legend />

                            {campaignType === 'SEO' ? (
                                <>
                                    <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar yAxisId="left" dataKey="sales" name="Sales" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                </>
                            ) : (
                                <>
                                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#FF5F00" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar yAxisId="left" dataKey="spend" name="Costs" fill="#E6E6E6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Line 
                                        yAxisId="right" 
                                        type="monotone" 
                                        dataKey="roi" 
                                        name="ROI %" 
                                        stroke="url(#splitColor)" // <--- HIER DE GRADIENT
                                        strokeWidth={4} 
                                        dot={false} 
                                    />
                                </>
                            )}

                            {/* ANNOTATIES */}
                            {annotations.map((note) => {
                                const hasMatch = data.some(d => d.date === note.date);
                                if (!hasMatch) return null;

                                return (
                                    <ReferenceLine 
                                        key={note.id} 
                                        x={note.date}
                                        yAxisId="left"
                                        stroke="#3b82f6" 
                                        strokeDasharray="3 3"
                                        ifOverflow="visible"
                                        strokeWidth={2}
                                        label={{ 
                                            value: '!', 
                                            position: 'insideTop', 
                                            fill: '#3b82f6', 
                                            fontSize: 16, 
                                            fontWeight: 'bold',
                                        }} 
                                    />
                                );
                            })}
                            
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : <Heatmap data={data} currencySymbol={currencySymbol} />
                ) : <div className="h-full flex items-center justify-center text-neutral-500">Geen data beschikbaar.</div>}
            </div>
      </div>

      {/* 4. CAP MONITOR & OFFER TABLE */}
      <div className="w-full space-y-6">
          {capOffers.length > 0 && (
             <CapMonitor offers={capOffers} formatMoney={formatMoney} />
          )}

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6">
            <h3 className="text-lg font-semibold text-neutral-200 mb-4">Top Offers</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-400">
                    <thead className="bg-neutral-900/50 text-xs uppercase font-medium text-neutral-500 border-b border-neutral-800">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Rank</th>
                            <th className="px-4 py-3 font-semibold">Offer Name</th>
                            <th className="px-4 py-3 font-semibold text-right">Leads</th>
                            <th className="px-4 py-3 font-semibold text-right">Sales</th>
                            <th className="px-4 py-3 font-semibold text-right">Total Revenue</th>
                            <th className="px-4 py-3 font-semibold text-right">Share</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {topOffers.map((offer, index) => {
                            const sharePercent = totals.revenue > 0 ? (offer.revenue / totals.revenue) * 100 : 0;
                            return (
                                <tr key={offer.id} className="hover:bg-neutral-800/30 transition-colors group">
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : index === 1 ? 'bg-neutral-500/20 text-neutral-400' : index === 2 ? 'bg-orange-500/20 text-orange-500' : 'text-neutral-600'}`}>
                                            {index + 1}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link href={`/offers/${offer.id}?${searchParams.toString()}`} className="text-neutral-200 font-medium hover:text-blue-400 hover:underline decoration-blue-400/50 underline-offset-4 transition-all">
                                            {offer.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-right text-neutral-300 font-mono">{offer.leads}</td>
                                    <td className="px-4 py-3 text-right text-neutral-300 font-mono">{offer.sales}</td>
                                    <td className="px-4 py-3 text-right text-white font-bold font-mono">{formatMoney(offer.revenue)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-bold text-neutral-300">{sharePercent.toFixed(1)}%</span>
                                            <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(sharePercent, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {topOffers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-neutral-600 italic">Geen offers gevonden in deze periode.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
      </div>
    </PageContainer>
  );
}

// ... HULPCOMPONENTEN ...
function StatsCard({ title, value, trend, trendLabel }: { title: string, value: string, trend?: 'positive' | 'negative' | 'neutral', trendLabel?: string }) {
    const valueColor = trend === 'positive' ? 'text-neutral-100' : trend === 'negative' ? 'text-neutral-100' : 'text-neutral-100';
    return ( <div className="bg-neutral-900/50 border border-neutral-800 p-4 md:p-6 rounded-xl shadow-sm hover:border-neutral-700 transition-colors flex flex-col justify-between h-full"> <p className="text-sm font-medium text-neutral-500 mb-2">{title}</p> <div className="flex items-end justify-between"> <h3 className={`text-2xl font-bold ${valueColor}`}>{value}</h3> {trend && trendLabel && ( <span className={`flex items-center px-2 py-1 rounded mb-1 text-xs font-medium ${trend === 'positive' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}> {trend === 'positive' ? <ArrowUpRight size={12} className="mr-1"/> : <ArrowDownRight size={12} className="mr-1"/>} {trendLabel} </span> )} </div> </div> );
}
function CapMonitor({ offers, formatMoney }: { offers: TopOffer[], formatMoney: (val: number) => string }) { if (!offers || offers.length === 0) return null; return ( <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6 shadow-sm"> <div className="flex items-center gap-2 mb-4"> <AlertTriangle size={18} className="text-orange-500" /> <h2 className="text-base font-bold text-neutral-200">Active Cap Monitors</h2> </div> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {offers.map(offer => { let percent = 0; let current = 0; let max = 0; let label = ''; let capType = ''; if (offer.capLeads) { current = offer.leads; max = offer.capLeads; percent = (current / max) * 100; label = `${current} / ${max}`; capType = 'Leads Cap'; } else if (offer.capRevenue) { current = offer.revenue; max = offer.capRevenue; percent = (current / max) * 100; label = `${formatMoney(current)} / ${formatMoney(max)}`; capType = 'Revenue Cap'; } let barColor = 'bg-blue-600'; let textColor = 'text-blue-400'; if (percent >= 100) { barColor = 'bg-red-500'; textColor = 'text-red-400'; } else if (percent >= 85) { barColor = 'bg-orange-500'; textColor = 'text-orange-400'; } return ( <div key={offer.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg"> <div className="flex justify-between items-start mb-2"><div className="overflow-hidden"><span className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-0.5">{capType}</span><h4 className="font-medium text-neutral-300 text-sm truncate" title={offer.name}>{offer.name}</h4></div><span className={`text-sm font-bold ${textColor}`}>{percent.toFixed(0)}%</span></div> <div className="w-full bg-neutral-800 rounded-full h-2 mb-2 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${Math.min(percent, 100)}%` }}></div></div> <div className="flex justify-between items-center text-xs"><span className="text-neutral-500">{offer.network}</span><span className="text-neutral-300 font-mono font-medium">{label}</span></div> </div> ); })} </div> </div> ); }
function Heatmap({ data, currencySymbol }: { data: DashboardData[], currencySymbol: string }) { if (!data || data.length === 0) return <div className="text-neutral-500">Geen data</div>; const maxProfit = Math.max(...data.map(d => d.profit)); const minProfit = Math.min(...data.map(d => d.profit)); const formatDate = (dateStr: string) => { const d = new Date(dateStr); return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', weekday: 'short' }); }; const firstDate = new Date(data[0].date); const dayOfWeek = firstDate.getDay(); const emptySlots = dayOfWeek === 0 ? 6 : dayOfWeek - 1; const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']; return ( <div className="h-full flex flex-col overflow-hidden"> <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">{weekDays.map(day => <div key={day} className="text-[10px] text-neutral-500 font-medium text-center uppercase tracking-wider">{day}</div>)}</div> <div className="grid grid-cols-7 gap-1 md:gap-2 overflow-y-auto pr-2 pb-10 content-start custom-scrollbar"> {Array.from({ length: emptySlots }).map((_, i) => <div key={`empty-${i}`} className="w-full aspect-square" />)} {data.map((day, index) => { const isProfit = day.profit >= 0; let opacity = 0.1; if (isProfit && maxProfit > 0) opacity = 0.2 + (0.8 * (day.profit / maxProfit)); else if (!isProfit && minProfit < 0) opacity = 0.2 + (0.8 * (day.profit / minProfit)); const bgColor = isProfit ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`; const borderColor = isProfit ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'; const tooltipPosition = (index + emptySlots) < 7 ? "top-full mt-2" : "bottom-full mb-2"; return ( <div key={day.date} className="group relative"> <div className="w-full aspect-square rounded-md border flex items-center justify-center transition hover:scale-105 cursor-pointer" style={{ backgroundColor: bgColor, borderColor: borderColor }}><span className="text-[10px] font-medium text-white/80 drop-shadow-md">{new Date(day.date).getDate()}</span></div> <div className={`absolute left-1/2 -translate-x-1/2 w-32 bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-200 opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 shadow-xl ${tooltipPosition}`}><p className="font-bold text-center border-b border-neutral-800 pb-1 mb-1">{formatDate(day.date)}</p><div className="flex justify-between"><span>Winst:</span><span className={day.profit >= 0 ? "text-green-400" : "text-red-400"}>{currencySymbol}{day.profit.toFixed(0)}</span></div><div className="flex justify-between text-neutral-500"><span>ROI:</span><span>{day.roi !== null ? day.roi.toFixed(0) : 0}%</span></div></div> </div> ); })} </div> </div> ); }