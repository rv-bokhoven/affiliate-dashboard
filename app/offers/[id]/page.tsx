'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
// 1. NIEUWE IMPORTS VOOR DATUM FIX & KALENDER
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { nl } from 'date-fns/locale';
import { format } from 'date-fns';

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

type FilterRange = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

interface Offer {
  id: number;
  name: string;
  network: string;
  payoutLead: number;
  payoutSale: number;
  capLeads?: number;
  capRevenue?: number;
  status?: string;
}

interface ApiData {
  offer: Offer;
  chartData: any[];
  totals: {
    leads: number;
    sales: number;
    revenue: number;
  };
}

export default function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const offerId = resolvedParams.id;

  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [filter, setFilter] = useState<FilterRange>('this_month');
  
  // 2. NIEUWE STATES VOOR KALENDER
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Helper om datums te zetten
  const setDateRange = (update: [Date | null, Date | null]) => {
    const [start, end] = update;
    setStartDate(start);
    setEndDate(end);
  };

  // 3. FETCH FUNCTIE (MET TIMEZONE FIX)
  // We halen hem even uit de useEffect zodat we hem ook met de knop kunnen aanroepen
  const fetchData = async () => {
    setLoading(true);
    try {
      // Basis URL
      let url = `/api/stats/offer?id=${offerId}&range=${filter}`;

      // DE FIX: Als custom is gekozen, stuur harde datum strings (yyyy-MM-dd)
      if (filter === 'custom' && startDate && endDate) {
        const fromStr = format(startDate, 'yyyy-MM-dd');
        const toStr = format(endDate, 'yyyy-MM-dd');
        url += `&from=${fromStr}&to=${toStr}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 4. USE EFFECT UPDATED
  useEffect(() => {
    // Alleen automatisch fetchen als het NIET custom is.
    // Bij custom wachten we tot de gebruiker op "Pas toe" klikt.
    if (filter !== 'custom') {
      fetchData();
    }
  }, [offerId, filter]);

  // Helper voor filter knoppen
  const filterBtn = (key: FilterRange, label: string) => (
    <button 
      onClick={() => setFilter(key)}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        filter === key 
          ? 'bg-neutral-100 text-neutral-900' 
          : 'text-neutral-500 hover:text-neutral-300 hover:bg-[#262626]'
      }`}
    >
      {label}
    </button>
  );

  if (!data || !data.offer) {
    // Kleine check: als we aan het laden zijn maar nog geen data hebben, toon loading
    if(loading) return <div className="p-8 text-neutral-500">Laden...</div>;
    return <div className="p-8 text-neutral-500">Offer niet gevonden.</div>;
  }

  const totalLeads = data.chartData.reduce((acc, curr) => acc + curr.leads, 0);
  const totalSales = data.chartData.reduce((acc, curr) => acc + curr.sales, 0);
  // Revenue komt nu uit de totals van de API, of we tellen op:
  const totalRev = data.totals?.revenue || 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-100">{data.offer.name}</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Network: <span className="text-neutral-300">{data.offer.network}</span> • 
              Lead: ${data.offer.payoutLead} • Sale: ${data.offer.payoutSale}
            </p>
          </div>
          <Link href="/">
            <button className="bg-[#262626] text-neutral-300 hover:text-white border border-[#404040] font-medium px-4 py-2 rounded-md text-sm transition">
              ← Back to Dashboard
            </button>
          </Link>
        </div>

        {/* 5. FILTER BALK (MET KALENDER LOGICA) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#171717] p-1 rounded-lg border border-[#262626] flex gap-1">
            {filterBtn('this_week', 'This Week')}
            {filterBtn('last_week', 'Last Week')}
            {filterBtn('this_month', 'This Month')}
            {filterBtn('last_month', 'Last Month')}
            {filterBtn('this_year', 'This Year')}
            {filterBtn('all', 'Alles')}
            {filterBtn('custom', 'Custom')}
          </div>

          {/* De Kalender (Alleen zichtbaar als 'custom' is geselecteerd) */}
          {filter === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
              <div className="relative z-10">
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={setDateRange}
                  locale={nl}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Selecteer periode"
                  isClearable={true}
                  customInput={
                    <button className="bg-[#171717] border border-[#262626] text-neutral-300 hover:text-white hover:bg-[#262626] px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2">
                      📅 {startDate ? format(startDate, 'dd-MM-yyyy') : 'Start'} - {endDate ? format(endDate, 'dd-MM-yyyy') : 'Eind'}
                    </button>
                  }
                />
              </div>

              {/* Pas toe knop - verschijnt als beide datums zijn gekozen */}
              {startDate && endDate && (
                <button 
                  onClick={fetchData} 
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-medium shadow-lg shadow-blue-900/20 transition"
                >
                  Pas toe
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {loading && !data ? (
            <div className="h-64 flex items-center justify-center text-neutral-500">Data ophalen...</div>
        ) : (
            <>
                {/* Statistieken Kaarten */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#171717] border border-[#262626] rounded-xl p-6">
                    <h3 className="text-xs font-medium text-neutral-500 uppercase">Total Leads</h3>
                    <p className="text-2xl font-bold text-blue-400 mt-2">{totalLeads}</p>
                </div>
                <div className="bg-[#171717] border border-[#262626] rounded-xl p-6">
                    <h3 className="text-xs font-medium text-neutral-500 uppercase">Total Sales</h3>
                    <p className="text-2xl font-bold text-green-400 mt-2">{totalSales}</p>
                </div>
                <div className="bg-[#171717] border border-[#262626] rounded-xl p-6">
                    <h3 className="text-xs font-medium text-neutral-500 uppercase">Total Revenue</h3>
                    <p className="text-2xl font-bold text-neutral-100 mt-2">{formatPrice(totalRev)}</p>
                </div>
                </div>

                {/* Grafiek */}
                <div className="bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6 h-[500px]">
                <h2 className="text-xl font-semibold mb-6 text-neutral-200">
                    Performance: {
                        filter === 'this_week' ? 'Deze Week' : 
                        filter === 'last_week' ? 'Vorige Week' : 
                        filter === 'this_month' ? 'Deze Maand' : 
                        filter === 'this_year' ? 'Dit Jaar' : 
                        filter === 'custom' ? 'Aangepast' : 'Alles'
                    }
                </h2>
                {data.chartData.length > 0 ? (
                    <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                        <XAxis dataKey="date" stroke="#737373" tickFormatter={(val) => new Date(val).toLocaleDateString('nl-NL')} />
                        <YAxis yAxisId="left" orientation="left" stroke="#737373" />
                        <YAxis yAxisId="right" orientation="right" stroke="#737373" unit="€" />
                        <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5' }} labelFormatter={(label) => new Date(label).toLocaleDateString('nl-NL')} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar yAxisId="left" dataKey="sales" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" name="Omzet (€)" stroke="#fbbf24" strokeWidth={3} dot={true} />
                        </ComposedChart>
                    </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500">
                    Geen data gevonden in deze periode.
                    </div>
                )}
                </div>
            </>
        )}
      </div>
    </main>
  );
}