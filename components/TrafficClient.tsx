'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { nl } from 'date-fns/locale';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart
} from 'recharts';
import { CalendarDays, ChevronDown, Check, MousePointer2, ExternalLink } from 'lucide-react';
import PageContainer from './PageContainer';

registerLocale('nl', nl);

// --- Types ---
interface TrafficData {
  date: string;
  googleClicks: number;
  microsoftClicks: number;
  totalClicks: number;
  avgCpc: number;
}

interface PlatformStats {
    clicks: number;
    spend: number;
}

interface TrafficClientProps {
  data: TrafficData[];
  platforms: { google: PlatformStats; microsoft: PlatformStats };
  totals: { clicks: number; spend: number; revenue: number };
  campaignName: string;
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

export default function TrafficClient({ 
    data, platforms, totals, campaignName, currencySymbol, currentCurrency 
}: TrafficClientProps) {
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('range') || 'yesterday';
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const formatMoney = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currentCurrency, minimumFractionDigits: 2 }).format(amount);
  const formatCPC = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currentCurrency, minimumFractionDigits: 3 }).format(amount);

  const handleFilterChange = (range: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('range', range);
    if (range !== 'custom') { params.delete('from'); params.delete('to'); }
    router.replace(`/traffic?${params.toString()}`, { scroll: false });
  };

  const toLocalYMD = (date: Date) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; };
  
  const handleCustomDateApply = () => { 
      if (!startDate || !endDate) return; 
      const params = new URLSearchParams(searchParams); 
      params.set('range', 'custom'); 
      params.set('from', toLocalYMD(startDate)); 
      params.set('to', toLocalYMD(endDate)); 
      router.push(`/traffic?${params.toString()}`); 
  };

  const toggleCurrency = () => {
    const params = new URLSearchParams(searchParams);
    params.set('currency', currentCurrency === 'USD' ? 'EUR' : 'USD');
    router.replace(`/traffic?${params.toString()}`, { scroll: false });
  };

  const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const epc = totals.clicks > 0 ? totals.revenue / totals.clicks : 0;
  const epcDiff = epc - avgCpc; 

  const googleCpc = platforms.google.clicks > 0 ? platforms.google.spend / platforms.google.clicks : 0;
  const microCpc = platforms.microsoft.clicks > 0 ? platforms.microsoft.spend / platforms.microsoft.clicks : 0;
  
  const getPercent = (part: number, total: number) => total === 0 ? '0' : ((part / total) * 100).toFixed(1);

  const googlePercent = getPercent(platforms.google.clicks, totals.clicks);
  const microPercent = getPercent(platforms.microsoft.clicks, totals.clicks);

  return (
    <PageContainer 
      title="Traffic Overview"
      subtitle={
        <div className="flex items-center gap-2">
            <span>Performance voor <span className="text-neutral-100 font-medium">{campaignName}</span></span>
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

      {/* 2. KPI CARDS (Rij 1) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl relative overflow-hidden group">
              <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <p className="text-sm font-medium text-neutral-500 mb-2">Total Clicks</p>
              <h3 className="text-2xl font-bold text-neutral-100">{totals.clicks.toLocaleString()}</h3>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
              <p className="text-sm font-medium text-neutral-500 mb-2">Avg. Cost Per Click</p>
              <h3 className="text-2xl font-bold text-neutral-100">{formatCPC(avgCpc)}</h3>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl relative">
              <p className="text-sm font-medium text-neutral-500 mb-2">Earnings Per Click (EPC)</p>
              <div className="flex items-end gap-3">
                <h3 className={`text-2xl font-bold ${epc >= avgCpc ? 'text-green-400' : 'text-red-400'}`}>{formatCPC(epc)}</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded mb-1 ${epcDiff >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {epcDiff > 0 ? '+' : ''}{formatCPC(epcDiff)}
                </span>
              </div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
              <p className="text-sm font-medium text-neutral-500 mb-2">Total Spend</p>
              <h3 className="text-2xl font-bold text-neutral-100">{formatMoney(totals.spend)}</h3>
          </div>
      </div>

      {/* 3. PLATFORM SPLIT (Rij 2 - Naast elkaar) */}
      <div className="mb-8">
         <h3 className="text-lg font-semibold text-neutral-200 mb-4">Platform Performance</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Google Card */}
             <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                 <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
                     <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                         <span className="font-bold text-lg text-neutral-200">Google Ads</span>
                     </div>
                     
                 </div>
                 
                 <div className="grid grid-cols-2 gap-y-6 mb-6">
                     <div>
                         <p className="text-xs text-neutral-500 mb-1">Clicks</p>
                         <p className="text-2xl font-bold text-white">{platforms.google.clicks.toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                         <p className="text-xs text-neutral-500 mb-1">Spend</p>
                         <p className="text-2xl font-bold text-white">{formatMoney(platforms.google.spend)}</p>
                     </div>
                     <div className="col-span-2 bg-neutral-950/50 border border-neutral-800/50 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-xs text-neutral-400 font-medium">Avg. CPC</span>
                        <span className="text-base font-mono font-bold text-blue-400">{formatCPC(googleCpc)}</span>
                     </div>
                 </div>

                 {/* Volume Bar */}
                 <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Share of Volume</span>
                        <span className="text-sm font-bold text-blue-400">{googlePercent}%</span>
                    </div>
                    <div className="w-full bg-neutral-800 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${googlePercent}%` }}></div>
                    </div>
                 </div>
             </div>

             {/* Microsoft Card */}
             <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                 <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-3">
                     <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                         <span className="font-bold text-lg text-neutral-200">Microsoft Ads</span>
                     </div>
                     
                 </div>
                 
                 <div className="grid grid-cols-2 gap-y-6 mb-6">
                     <div>
                         <p className="text-xs text-neutral-500 mb-1">Clicks</p>
                         <p className="text-2xl font-bold text-white">{platforms.microsoft.clicks.toLocaleString()}</p>
                     </div>
                     <div className="text-right">
                         <p className="text-xs text-neutral-500 mb-1">Spend</p>
                         <p className="text-2xl font-bold text-white">{formatMoney(platforms.microsoft.spend)}</p>
                     </div>
                     <div className="col-span-2 bg-neutral-950/50 border border-neutral-800/50 p-3 rounded-lg flex justify-between items-center">
                        <span className="text-xs text-neutral-400 font-medium">Avg. CPC</span>
                        <span className="text-base font-mono font-bold text-cyan-400">{formatCPC(microCpc)}</span>
                     </div>
                 </div>

                 {/* Volume Bar */}
                 <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Share of Volume</span>
                        <span className="text-sm font-bold text-cyan-400">{microPercent}%</span>
                    </div>
                    <div className="w-full bg-neutral-800 rounded-full h-2">
                        <div className="bg-cyan-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${microPercent}%` }}></div>
                    </div>
                 </div>
             </div>
         </div>
      </div>

      {/* 4. CHARTS (Rij 3 - Naast elkaar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Chart 1: Traffic Volume Trend */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 flex flex-col h-[400px]">
              <h3 className="text-lg font-semibold text-neutral-200 mb-6">Traffic Volume</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorGoogle" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorMicro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                        <XAxis dataKey="date" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} tickFormatter={(val) => new Date(val).toLocaleDateString('nl-NL', { day: 'numeric', month: 'numeric' })} />
                        <YAxis stroke="#525252" tick={{fill: '#737373', fontSize: 12}} />
                        <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px' }} labelFormatter={(label) => new Date(label).toLocaleDateString('nl-NL')} />
                        <Legend />
                        <Area type="monotone" dataKey="googleClicks" name="Google Clicks" stackId="1" stroke="#3b82f6" fill="url(#colorGoogle)" />
                        <Area type="monotone" dataKey="microsoftClicks" name="Microsoft Clicks" stackId="1" stroke="#22d3ee" fill="url(#colorMicro)" />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Chart 2: CPC Trend */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 flex flex-col h-[400px]">
             <h3 className="text-lg font-semibold text-neutral-200 mb-6">Cost Per Click (CPC)</h3>
             <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                        <XAxis dataKey="date" hide />
                        <YAxis stroke="#525252" tick={{fill: '#737373', fontSize: 12}} tickFormatter={(val) => `${currencySymbol}${val.toFixed(2)}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px' }} 
                            labelFormatter={(label) => new Date(label).toLocaleDateString('nl-NL')}
                            formatter={(value: number) => [formatCPC(value), 'Avg CPC']}
                        />
                        <Line type="monotone" dataKey="avgCpc" stroke="#10b981" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
             </div>
          </div>

      </div>
    </PageContainer>
  );
}