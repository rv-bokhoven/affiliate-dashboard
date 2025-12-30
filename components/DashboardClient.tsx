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
import { CalendarDays, ArrowUpRight, ArrowDownRight, Info, ChevronDown, Check } from 'lucide-react';
import PageContainer from './PageContainer';

registerLocale('nl', nl);

// ... Interfaces blijven hetzelfde ...
interface DashboardData {
  date: string;
  spend: number;
  revenue: number;
  leads: number; 
  sales: number; 
  profit: number;
  roi: number;
  googleSpend?: number;
  microsoftSpend?: number;
}
export interface TopOffer { id: number; name: string; network: string; leads: number; sales: number; revenue: number; capLeads?: number | null; capRevenue?: number | null; }
interface DashboardClientProps {
  data: DashboardData[]; topOffers: TopOffer[]; capOffers: TopOffer[];
  totals: { spend: number; revenue: number; profit: number; roi: number; googleSpend: number; microsoftSpend: number; leads: number; sales: number; revShare: number; };
  campaignName: string; campaignType: string;
}

const formatPrice = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);

// --- NIEUW COMPONENT: Custom Date Filter Dropdown ---
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
  
    // Sluit dropdown als je ernaast klikt
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
          {/* TRIGGER BUTTON */}
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
  
          {/* DROPDOWN MENU */}
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

export default function DashboardClient({ data, topOffers, capOffers, totals, campaignName, campaignType }: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('range') || 'this_month';
  const currentInterval = searchParams.get('interval') || 'day';
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [chartType, setChartType] = useState<'line' | 'heatmap'>('line');

  const handleFilterChange = (range: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('range', range);
    if (range !== 'custom') { params.delete('from'); params.delete('to'); }
    router.push(`/?${params.toString()}`);
  };

  const handleIntervalChange = (newInterval: string) => { const params = new URLSearchParams(searchParams); params.set('interval', newInterval); router.push(`/?${params.toString()}`); };
  const toLocalYMD = (date: Date) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
  const handleCustomDateApply = () => { if (!startDate || !endDate) return; const params = new URLSearchParams(searchParams); params.set('range', 'custom'); params.set('from', toLocalYMD(startDate)); params.set('to', toLocalYMD(endDate)); router.push(`/?${params.toString()}`); };
  const getPercent = (part: number, total: number) => total === 0 ? '0' : ((part / total) * 100).toFixed(0);

  return (
    <PageContainer 
      title="Dashboard"
      subtitle={
        <div className="flex items-center gap-2">
            <span>Overzicht voor <span className="text-neutral-100 font-medium">{campaignName}</span></span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${campaignType === 'SEO' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                {campaignType}
            </span>
        </div>
      }
      actions={
        // HIER GEBRUIKEN WE NU HET NIEUWE COMPONENT
        <DateFilter value={currentFilter} onChange={handleFilterChange} />
      }
    >
      {/* 1. Custom Date Picker */}
      {currentFilter === 'custom' && (
             <div className="flex justify-end mb-6 animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center gap-2">
                  <div className="relative z-50">
                    <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update) => setDateRange(update)} locale="nl" dateFormat="dd/MM/yyyy" placeholderText="Kies periode" isClearable={true}
                        customInput={<button className="bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">📅 {startDate ? startDate.toLocaleDateString() : 'Start'} - {endDate ? endDate.toLocaleDateString() : 'Eind'}</button>}
                    />
                  </div>
                  {startDate && endDate && <button onClick={handleCustomDateApply} className="bg-white text-black text-xs px-3 py-2 rounded font-medium hover:bg-neutral-200 transition">Toepassen</button>}
               </div>
             </div>
      )}

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {campaignType === 'SEO' ? (
            <>
                <StatsCard title="Total Leads" value={totals.leads.toString()} trend="neutral" />
                <StatsCard title="Total Sales" value={totals.sales.toString()} trend="positive" />
                <StatsCard title="RevShare" value={formatPrice(totals.revShare)} trend="neutral" />
                <StatsCard title="Total Revenue" value={formatPrice(totals.revenue)} trend="positive" />
            </>
        ) : (
            <>
                <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl shadow-sm relative group overflow-visible">
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
                                            <span className="text-neutral-300">{formatPrice(totals.googleSpend)}</span>
                                        </div>
                                        <div className="w-full bg-neutral-800 rounded-full h-1"><div className="bg-blue-500 h-1 rounded-full" style={{ width: `${getPercent(totals.googleSpend, totals.spend)}%` }}></div></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-cyan-400">Microsoft</span>
                                            <span className="text-neutral-300">{formatPrice(totals.microsoftSpend)}</span>
                                        </div>
                                        <div className="w-full bg-neutral-800 rounded-full h-1"><div className="bg-cyan-400 h-1 rounded-full" style={{ width: `${getPercent(totals.microsoftSpend, totals.spend)}%` }}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-neutral-100">{formatPrice(totals.spend)}</h3>
                </div>

                <StatsCard title="Total Revenue" value={formatPrice(totals.revenue)} trend="positive" />
                <StatsCard title="Net Profit" value={formatPrice(totals.profit)} trend={totals.profit >= 0 ? 'positive' : 'negative'} />
                <StatsCard title="ROI" value={`${totals.roi.toFixed(1)}%`} trend={totals.roi >= 0 ? 'positive' : 'negative'} />
            </>
        )}
      </div>

      {/* 3. CHARTS & LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
         <div className="lg:col-span-2 bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-neutral-200">{chartType === 'line' ? 'Performance Overview' : 'Profit Heatmap'}</h3>
                <div className="flex gap-4">
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
            <div className="flex-1 w-full min-h-0">
                {data.length > 0 ? (
                    chartType === 'line' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                            <XAxis 
                                dataKey="date" 
                                stroke="#525252" 
                                tick={{fill: '#737373', fontSize: 12}} 
                                tickFormatter={(val) => { const d = new Date(val); if (currentInterval === 'month') return d.toLocaleDateString('nl-NL', { month: 'short', year: '2-digit' }); return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' }); }} 
                            />
                            <YAxis yAxisId="left" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} />
                            <YAxis yAxisId="right" orientation="right" stroke="#525252" unit={campaignType === 'SEO' ? '' : '%'} tick={{fill: '#737373', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5', borderRadius: '8px' }} 
                                labelFormatter={(label) => new Date(label).toLocaleDateString('nl-NL')}
                                formatter={(value, name) => [(name === 'Revenue' || name === 'Costs') ? formatPrice(value as number) : value, name]}
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
                                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar yAxisId="left" dataKey="spend" name="Costs" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Line yAxisId="right" type="monotone" dataKey="roi" name="ROI %" stroke="#10b981" strokeWidth={2} dot={false} />
                                </>
                            )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : <Heatmap data={data} />
                ) : <div className="h-full flex items-center justify-center text-neutral-500">Geen data beschikbaar.</div>}
            </div>
         </div>

         <div className="lg:col-span-1 bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 flex flex-col overflow-hidden">
            <h3 className="text-lg font-semibold text-neutral-200 mb-4">Offer Performance</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="mb-8"><CapMonitor offers={capOffers} /></div>
                <div>
                    <h4 className="text-xs font-bold text-neutral-500 uppercase mb-3">Toplijst</h4>
                    <div className="space-y-2">
                        {topOffers.map((offer, index) => (
                            <Link href={`/offers/${offer.id}`} key={offer.id} className="block group">
                                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-800/50 border border-transparent hover:border-neutral-800 transition-all cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <span className={`flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : index === 1 ? 'bg-neutral-500/20 text-neutral-400' : index === 2 ? 'bg-orange-500/20 text-orange-500' : 'text-neutral-600'}`}>{index + 1}</span>
                                        <div><p className="text-sm font-medium text-neutral-200 truncate max-w-[120px] group-hover:text-blue-400 transition-colors">{offer.name}</p><p className="text-xs text-neutral-500">{offer.leads} Leads</p></div>
                                    </div>
                                    <div className="text-right"><p className="text-sm font-bold text-neutral-100">{formatPrice(offer.revenue)}</p></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
         </div>
      </div>
    </PageContainer>
  );
}

// ... Hulpfuncties StatsCard, CapMonitor en Heatmap blijven ongewijzigd ...
function StatsCard({ title, value, trend }: { title: string, value: string, trend?: 'positive' | 'negative' | 'neutral' }) {
    return (
        <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl shadow-sm hover:border-neutral-700 transition-colors flex flex-col justify-between h-full">
            <p className="text-sm font-medium text-neutral-500 mb-2">{title}</p>
            <div className="flex items-end justify-between">
                <h3 className="text-2xl font-bold text-neutral-100">{value}</h3>
                {trend && trend !== 'neutral' && (
                    <span className={`flex items-center px-2 py-1 rounded-full text-xs font-medium border ${trend === 'positive' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                        {trend === 'positive' ? <ArrowUpRight size={12} className="mr-1"/> : <ArrowDownRight size={12} className="mr-1"/>}
                        {trend === 'positive' ? '+12%' : '-4%'}
                    </span>
                )}
            </div>
        </div>
    );
}

function CapMonitor({ offers }: { offers: TopOffer[] }) {
    if (!offers || offers.length === 0) return null;
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 shadow-inner">
        <div className="flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
          <span className="text-base">⚠️</span>
          <div><h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wide">Cap Monitor</h2></div>
        </div>
        <div className="flex flex-col gap-4">
          {offers.map(offer => {
            let percent = 0; let current = 0; let max = 0; let label = '';
            if (offer.capLeads) { current = offer.leads; max = offer.capLeads; percent = (current / max) * 100; label = `${current} / ${max} Leads`; } 
            else if (offer.capRevenue) { current = offer.revenue; max = offer.capRevenue; percent = (current / max) * 100; label = `${formatPrice(current)} / ${formatPrice(max)}`; }
            let barColor = 'bg-blue-600'; let textColor = 'text-blue-400';
            if (percent >= 100) { barColor = 'bg-red-500'; textColor = 'text-red-400'; } else if (percent >= 85) { barColor = 'bg-orange-500'; textColor = 'text-orange-400'; }
            return (
              <div key={offer.id}>
                <div className="flex justify-between items-center mb-1.5"><span className="font-medium text-neutral-400 text-xs truncate pr-2 max-w-[150px]" title={offer.name}>{offer.name}</span><span className={`text-xs font-bold ${textColor}`}>{percent.toFixed(0)}%</span></div>
                <div className="w-full bg-neutral-800 rounded-full h-1.5 mb-1 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${Math.min(percent, 100)}%` }}></div></div>
                <div className="text-[10px] text-neutral-600 text-right font-mono">{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
}

function Heatmap({ data }: { data: DashboardData[] }) {
    if (!data || data.length === 0) return <div className="text-neutral-500">Geen data</div>;
    const maxProfit = Math.max(...data.map(d => d.profit)); const minProfit = Math.min(...data.map(d => d.profit));
    const formatDate = (dateStr: string) => { const d = new Date(dateStr); return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', weekday: 'short' }); };
    const firstDate = new Date(data[0].date); const dayOfWeek = firstDate.getDay(); const emptySlots = dayOfWeek === 0 ? 6 : dayOfWeek - 1; const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 gap-2 mb-2">{weekDays.map(day => <div key={day} className="text-[10px] text-neutral-500 font-medium text-center uppercase tracking-wider">{day}</div>)}</div>
        <div className="grid grid-cols-7 gap-2 overflow-y-auto pr-2 pb-10 content-start custom-scrollbar">
          {Array.from({ length: emptySlots }).map((_, i) => <div key={`empty-${i}`} className="w-full aspect-square" />)}
          {data.map((day, index) => {
            const isProfit = day.profit >= 0; let opacity = 0.1;
            if (isProfit && maxProfit > 0) opacity = 0.2 + (0.8 * (day.profit / maxProfit)); else if (!isProfit && minProfit < 0) opacity = 0.2 + (0.8 * (day.profit / minProfit));
            const bgColor = isProfit ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`;
            const borderColor = isProfit ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
            const tooltipPosition = (index + emptySlots) < 7 ? "top-full mt-2" : "bottom-full mb-2";
            return (
              <div key={day.date} className="group relative">
                <div className="w-full aspect-square rounded-md border flex items-center justify-center transition hover:scale-105 cursor-pointer" style={{ backgroundColor: bgColor, borderColor: borderColor }}><span className="text-[10px] font-medium text-white/80 drop-shadow-md">{new Date(day.date).getDate()}</span></div>
                <div className={`absolute left-1/2 -translate-x-1/2 w-32 bg-neutral-950 border border-neutral-800 rounded p-2 text-xs text-neutral-200 opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 shadow-xl ${tooltipPosition}`}><p className="font-bold text-center border-b border-neutral-800 pb-1 mb-1">{formatDate(day.date)}</p><div className="flex justify-between"><span>Winst:</span><span className={day.profit >= 0 ? "text-green-400" : "text-red-400"}>${day.profit.toFixed(0)}</span></div><div className="flex justify-between text-neutral-500"><span>ROI:</span><span>{day.roi.toFixed(0)}%</span></div></div>
              </div>
            );
          })}
        </div>
      </div>
    );
}