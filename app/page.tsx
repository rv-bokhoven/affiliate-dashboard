'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// Zorg dat je nl locale importeert als je Nederlandse namen wilt
import { registerLocale } from "react-datepicker";
// VERVANG DE OUDE REGEL HIERMEE:
import { nl } from 'date-fns/locale'; 

registerLocale('nl', nl);
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface DashboardData {
  date: string;
  spend: number;
  googleSpend: number;
  microsoftSpend: number;
  revenue: number;
  profit: number;
  roi: number;
}

interface TopOffer {
  id: number;
  name: string;
  network: string;
  leads: number;
  sales: number;
  revenue: number;
  // Prisma stuurt dit nu mee in het 'offer' object, maar in de frontend vlakken we het af:
  capLeads?: number | null;
  capRevenue?: number | null;
}

// Nieuw: Interface voor de vorige periode
interface PreviousTotals {
  spend: number;
  revenue: number;
  profit: number;
}

type FilterRange = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

export default function Home() {
  const [data, setData] = useState<DashboardData[]>([]);
  const [topOffers, setTopOffers] = useState<TopOffer[]>([]);
  const [prevTotals, setPrevTotals] = useState<PreviousTotals | null>(null); // <--- Nieuw
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'heatmap'>('line');
  const [filter, setFilter] = useState<FilterRange>('this_month');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [capOffers, setCapOffers] = useState<TopOffer[]>([]);
  const [startDate, endDate] = dateRange;

  useEffect(() => {
    fetchData();
  }, [filter]);

async function fetchData() {
  setLoading(true);
  try {
    // 1. De dynamische query voor je grafieken/lijsten (luistert naar filter)
    let query = `range=${filter}`;
    if (filter === 'custom' && startDate && endDate) {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      query += `&from=${startStr}&to=${endStr}`;
    }

    // 2. We doen nu 3 fetches in plaats van 2
    const [statsRes, offersRes, capsRes] = await Promise.all([
      fetch(`/api/stats?${query}`),           // Grafiek data (gefilterd)
      fetch(`/api/stats/top-offers?${query}`), // Toplijst rechts (gefilterd)
      fetch(`/api/stats/top-offers?range=this_month`) // Cap Monitor (ALTIJD deze maand)
    ]);

    const statsData = await statsRes.json();
    const offersData = await offersRes.json();
    const capsData = await capsRes.json(); // Data voor de monitor

    // Update de states
    setData(statsData.chartData || []);
    setPrevTotals(statsData.previousTotals || null);
    setTopOffers(offersData);
    
    // Filter voor de Cap Monitor: Alleen offers die ECHT een cap hebben ingesteld
    const activeCaps = capsData.filter((o: TopOffer) => o.capLeads || o.capRevenue);
    setCapOffers(activeCaps);

  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    setLoading(false);
  }
}

  const totals = data.reduce(
    (acc, curr) => ({
      spend: acc.spend + curr.spend,
      googleSpend: acc.googleSpend + (curr.googleSpend || 0),
      microsoftSpend: acc.microsoftSpend + (curr.microsoftSpend || 0),
      revenue: acc.revenue + curr.revenue,
      profit: acc.profit + curr.profit,
    }),
    { spend: 0, googleSpend: 0, microsoftSpend: 0, revenue: 0, profit: 0 }
  );

  const totalRoi = totals.spend > 0 ? ((totals.profit / totals.spend) * 100).toFixed(1) : '0';

  const getPercent = (part: number, total: number) => {
    if (total === 0) return '0';
    return ((part / total) * 100).toFixed(0);
  };

  // Functie om de trend (groei/krimp) te berekenen
  const getTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const filterBtn = (key: FilterRange, label: string) => (
    <button 
      onClick={() => setFilter(key)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        filter === key ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#262626]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h1 className="text-xl font-bold text-neutral-100">Top10.compare</h1>
             <p className="text-neutral-500 text-sm mt-1">Overview for your campaign(s)</p>
          </div>
          <div className="flex gap-3">
            <Link href="/logs"><button className="bg-[#262626] text-neutral-300 hover:text-white border border-[#404040] font-medium px-4 py-2 rounded-md text-sm">📋 Logs</button></Link>
            <Link href="/offers"><button className="bg-[#262626] text-neutral-300 hover:text-white border border-[#404040] font-medium px-4 py-2 rounded-md text-sm">⚙️ Offers</button></Link>
            <Link href="/input"><button className="bg-neutral-100 text-neutral-900 hover:bg-neutral-300 font-medium px-4 py-2 rounded-md text-sm">+ New Data</button></Link>
            <button 
      onClick={() => signOut()}
      className="bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-900/50 font-medium px-3 py-2 rounded-md transition-colors text-sm"
      title="Uitloggen"
    >
      🚪
    </button>
          </div>
        </div>

        {/* Filter */}
{/* Filter Balk & Date Picker */}
<div className="flex flex-col sm:flex-row gap-4 items-center justify-between">

  {/* De Knoppen */}
  <div className="bg-[#171717] p-1 rounded-lg border border-[#262626] flex gap-1 flex-wrap justify-center">
    {filterBtn('this_week', 'This Week')}
    {filterBtn('last_week', 'Last Week')}
    {filterBtn('this_month', 'This Month')}
    {filterBtn('last_month', 'Last Month')} {/* NIEUW */}
    {filterBtn('this_year', 'This Year')}
    {filterBtn('custom', 'Custom')}     {/* NIEUW */}
    {filterBtn('all', 'All')}
  </div>

  {/* De Kalenders (Alleen zichtbaar als 'custom' is geselecteerd) */}
  {filter === 'custom' && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ml-2">
            <div className="relative">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => {
                  setDateRange(update);
                }}
                locale="nl"
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecteer periode"
                isClearable={true}
                // We gebruiken een custom input component zodat het eruit ziet als onze knoppen
                customInput={
                  <button className="bg-[#171717] border border-[#262626] text-neutral-300 hover:text-white hover:bg-[#262626] px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2">
                    📅 {startDate ? startDate.toLocaleDateString() : 'Start'} 
                       - 
                       {endDate ? endDate.toLocaleDateString() : 'Eind'}
                  </button>
                }
              />
            </div>

            {/* Pas toe knop - Alleen tonen als beide datums gekozen zijn */}
            {startDate && endDate && (
              <button 
                onClick={() => fetchData()} 
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-medium transition shadow-lg shadow-blue-900/20"
              >
                Pas toe
              </button>
            )}
          </div>
          )}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-neutral-500">Loading Data...</div>
        ) : (
          <>
            {/* KPI Kaarten */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* TOTAL SPEND (Met Popover + Trend) */}
              <div className="bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6 relative overflow-visible">
                <div className="flex justify-between items-start">
                  <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Spend</h3>
                  <div className="relative group">
                    <div className="cursor-help text-neutral-500 hover:text-neutral-300 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                    </div>
                    <div className="absolute right-0 top-6 w-64 bg-[#0a0a0a] border border-[#404040] rounded-lg shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <p className="text-xs text-neutral-400 mb-2 font-medium uppercase border-b border-[#262626] pb-1">Verdeling</p>
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-blue-400">Google</span>
                          <span className="text-neutral-200">${totals.googleSpend.toFixed(0)} <span className="text-neutral-500">({getPercent(totals.googleSpend, totals.spend)}%)</span></span>
                        </div>
                        <div className="w-full bg-[#262626] rounded-full h-1"><div className="bg-blue-500 h-1 rounded-full" style={{ width: `${getPercent(totals.googleSpend, totals.spend)}%` }}></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-cyan-400">Microsoft</span>
                          <span className="text-neutral-200">${totals.microsoftSpend.toFixed(0)} <span className="text-neutral-500">({getPercent(totals.microsoftSpend, totals.spend)}%)</span></span>
                        </div>
                        <div className="w-full bg-[#262626] rounded-full h-1"><div className="bg-cyan-400 h-1 rounded-full" style={{ width: `${getPercent(totals.microsoftSpend, totals.spend)}%` }}></div></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-2xl font-bold text-neutral-100">{formatPrice(totals.spend)}</p>
                  {/* Trend Indicator Spend (Rood = kosten stijgen) */}
                  {prevTotals && (
                    <TrendBadge 
                      value={getTrend(totals.spend, prevTotals.spend)} 
                      reverse={true} // True want: Meer kosten = meestal "slecht" (Rood)
                    />
                  )}
                </div>
              </div>

              {/* REVENUE */}
              <KpiCard 
                title="Total Revenue" 
                value={formatPrice(totals.revenue)} 
                trend={prevTotals ? getTrend(totals.revenue, prevTotals.revenue) : undefined}
              />
              
              {/* PROFIT */}
              <KpiCard 
                title="Net Profit" 
                value={formatPrice(totals.profit)} 
                highlight={totals.profit >= 0} 
                color={totals.profit >= 0 ? 'text-green-500' : 'text-red-500'}
                trend={prevTotals ? getTrend(totals.profit, prevTotals.profit) : undefined}
              />
              
              {/* ROI (Geen trend hier, is lastig vergelijken met percentages) */}
              <KpiCard 
                title="ROI" 
                value={`${totalRoi}%`} 
                highlight={parseFloat(totalRoi) > 0} 
                color={parseFloat(totalRoi) > 0 ? 'text-green-500' : 'text-red-500'} 
              />
            </div>

            {/* Grafiek & Top Offers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
<div className="lg:col-span-2 bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6 h-[500px] flex flex-col">
  
  {/* Header met Toggle Knoppen */}
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-xl font-semibold text-neutral-200">
      {chartType === 'line' ? 'Performance over time' : 'Profit/Loss Heatmap'}
    </h2>
    <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-1 flex gap-1">
      <button 
        onClick={() => setChartType('line')}
        className={`px-3 py-1 text-xs font-medium rounded transition ${chartType === 'line' ? 'bg-[#262626] text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        📈 Graph
      </button>
      <button 
        onClick={() => setChartType('heatmap')}
        className={`px-3 py-1 text-xs font-medium rounded transition ${chartType === 'heatmap' ? 'bg-[#262626] text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
      >
        📅 Heatmap
      </button>
    </div>
  </div>

  {/* De Content: Grafiek OF Heatmap */}
  <div className="flex-1 w-full min-h-0">
    {data.length > 0 ? (
      <>
        {chartType === 'line' ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
              <XAxis dataKey="date" stroke="#737373" tick={{fill: '#737373'}} tickFormatter={(val) => new Date(val).getDate().toString()} />
              <YAxis yAxisId="left" orientation="left" stroke="#737373" tick={{fill: '#737373'}} />
              <YAxis yAxisId="right" orientation="right" stroke="#737373" unit="%" tick={{fill: '#737373'}} />
              <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5' }} />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="spend" name="Costs" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="roi" name="ROI %" stroke="#10b981" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Heatmap data={data} />
        )}
      </>
    ) : (
      <div className="h-full flex items-center justify-center text-neutral-500">No data available for this period.</div>
    )}
  </div>
</div>

              {/* ... Dit is het hele rechterblok (lg:col-span-1) ... */}
<div className="lg:col-span-1 bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6 overflow-hidden flex flex-col">
  <h2 className="text-xl font-semibold mb-6 text-neutral-200">Offer Performance</h2>
  
  {/* Cap Monitor Sectie */}
  <div className="flex-1 overflow-y-auto space-y-6 pr-2">
    <CapMonitor offers={capOffers} />
    {/* 2. De Gewone Toplijst */}
    <div className="space-y-3">
       <h3 className="text-xs font-bold text-neutral-500 uppercase mb-2">Toplijst</h3>
       {topOffers.map((offer, index) => (
          <Link href={`/offers/${offer.id}`} key={offer.id} className="block hover:bg-[#262626] transition rounded-lg">
            <div className="flex items-center justify-between p-3 border border-transparent hover:border-[#404040]">
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${index < 3 ? 'bg-yellow-500/20 text-yellow-500' : 'text-neutral-600'}`}>
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-200 line-clamp-1">{offer.name}</p>
                  <p className="text-xs text-neutral-500">{offer.leads} Leads / {offer.sales} Sales</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-neutral-100">{formatPrice(offer.revenue)}</span>
              </div>
            </div>
          </Link>
        ))}
    </div>
  </div>
</div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

// Klein hulp-componentje voor de groene/rode badges
function TrendBadge({ value, reverse = false }: { value: number, reverse?: boolean }) {
  if (Math.abs(value) < 0.1) return null; // Geen trend bij 0%
  
  const isPositive = value > 0;
  // Normaal: Positief = Groen. Reverse (voor kosten): Positief = Rood.
  const isGood = reverse ? !isPositive : isPositive;
  
  const colorClass = isGood 
    ? "text-green-400 bg-green-400/10" 
    : "text-red-400 bg-red-400/10";
    
  const arrow = isPositive ? "↑" : "↓";

  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${colorClass}`}>
      {arrow} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function KpiCard({ title, value, highlight, color, trend }: { title: string, value: string, highlight?: boolean, color?: string, trend?: number }) {
  return (
    <div className="bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6 flex flex-col justify-center">
      <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{title}</h3>
      <div className="flex items-center gap-2 mt-2">
        <p className={`text-2xl font-bold ${color ? color : 'text-neutral-100'}`}>{value}</p>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
    </div>
  );
}


function CapMonitor({ offers }: { offers: TopOffer[] }) {
  if (!offers || offers.length === 0) return null;

  return (
    // margin-bottom (mb-6) zorgt voor ruimte tussen dit blok en de Top Offers eronder
    <div className="bg-[#171717] border border-[#262626] rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-[#262626] pb-3">
        <span className="text-lg">⚠️</span>
        <div>
          <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wide">
            Cap Monitor
          </h2>
          <p className="text-[10px] text-neutral-500 font-medium">This month</p>
        </div>
      </div>

      {/* Verticale lijst in plaats van grid */}
      <div className="flex flex-col gap-4">
        {offers.map(offer => {
          let percent = 0;
          let current = 0;
          let max = 0;
          let label = '';

          if (offer.capLeads) {
            current = offer.leads;
            max = offer.capLeads;
            percent = (current / max) * 100;
            label = `${current} / ${max} Leads`;
          } else if (offer.capRevenue) {
            current = offer.revenue;
            max = offer.capRevenue;
            percent = (current / max) * 100;
            label = `${formatPrice(current)} / ${formatPrice(max)}`;
          }

          let color = 'bg-blue-600';
          let textColor = 'text-blue-400';
          
          if (percent >= 100) { color = 'bg-red-500'; textColor = 'text-red-400'; }
          else if (percent >= 85) { color = 'bg-yellow-500'; textColor = 'text-yellow-500'; }

          return (
            <div key={offer.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-neutral-300 text-xs truncate pr-2 max-w-[150px]" title={offer.name}>
                  {offer.name}
                </span>
                <span className={`text-xs font-bold ${textColor}`}>
                  {percent.toFixed(0)}%
                </span>
              </div>
              
              <div className="w-full bg-[#262626] rounded-full h-2 mb-1 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${color}`} 
                  style={{ width: `${Math.min(percent, 100)}%` }}
                ></div>
              </div>

              <div className="text-[10px] text-neutral-500 text-right">
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function Heatmap({ data }: { data: DashboardData[] }) {
  if (!data || data.length === 0) return <div className="text-neutral-500">Geen data</div>;

  const maxProfit = Math.max(...data.map(d => d.profit));
  const minProfit = Math.min(...data.map(d => d.profit));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  // 1. Bereken op welke dag van de week we beginnen
  const firstDate = new Date(data[0].date);
  const dayOfWeek = firstDate.getDay(); // 0 = Zondag, 1 = Maandag...
  
  // We willen dat Maandag de eerste kolom is.
  // Als dayOfWeek 1 (Ma) is -> 0 lege vakjes.
  // Als dayOfWeek 0 (Zo) is -> 6 lege vakjes.
  const emptySlots = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const weekDays = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      
      {/* 2. De Weekdagen Header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-[10px] text-neutral-500 font-medium text-center uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* 3. Het Grid */}
      <div className="grid grid-cols-7 gap-2 overflow-y-auto pr-2 pb-10 content-start">
        
        {/* Lege vakjes voor de startdatum (Padding) */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="w-full aspect-square" />
        ))}

        {/* De Data Vakjes */}
        {data.map((day, index) => {
          const isProfit = day.profit >= 0;
          
          let opacity = 0.1;
          if (isProfit && maxProfit > 0) {
            opacity = 0.2 + (0.8 * (day.profit / maxProfit));
          } else if (!isProfit && minProfit < 0) {
            opacity = 0.2 + (0.8 * (day.profit / minProfit));
          }

          const bgColor = isProfit ? `rgba(34, 197, 94, ${opacity})` : `rgba(239, 68, 68, ${opacity})`;
          const borderColor = isProfit ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';

          // Correctie voor de tooltip positie: We moeten de emptySlots meetellen
          const visualIndex = index + emptySlots;
          const isTopRow = visualIndex < 7;
          
          const tooltipPosition = isTopRow 
            ? "top-full mt-2" 
            : "bottom-full mb-2";

          return (
            <div key={day.date} className="group relative">
              <div 
                className="w-full aspect-square rounded-md border flex items-center justify-center transition hover:scale-105 cursor-pointer"
                style={{ backgroundColor: bgColor, borderColor: borderColor }}
              >
                <span className="text-[10px] font-medium text-white/80 drop-shadow-md">
                  {new Date(day.date).getDate()}
                </span>
              </div>

              <div className={`absolute left-1/2 -translate-x-1/2 w-32 bg-black border border-neutral-700 rounded p-2 text-xs text-neutral-200 opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 shadow-xl ${tooltipPosition}`}>
                <p className="font-bold text-center border-b border-neutral-800 pb-1 mb-1">{formatDate(day.date)}</p>
                <div className="flex justify-between">
                  <span>Winst:</span>
                  <span className={day.profit >= 0 ? "text-green-400" : "text-red-400"}>${day.profit.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span>ROI:</span>
                  <span>{day.roi.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}