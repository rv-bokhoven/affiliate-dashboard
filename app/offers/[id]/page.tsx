'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
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

// 1. De Filter opties (die hadden we net gefixt)
type FilterRange = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

// 2. Definieer hoe het 'Offer' eruit ziet
interface Offer {
  id: number;
  name: string;
  payoutLead: number;
  payoutSale: number;
  // Voeg hier eventueel andere velden toe als TS daarom zeurt (bijv. capLeads)
}

// 3. Definieer hoe de HELE API response eruit ziet (DEZE miste je!)
interface ApiData {
  offer: Offer;
  chartData: any[]; // We houden dit even simpel op any[]
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
  
  // Nieuwe Filter State
  const [filter, setFilter] = useState<FilterRange>('this_month');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // We sturen nu de filter mee in de URL
        const res = await fetch(`/api/stats/offer?id=${offerId}&range=${filter}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [offerId, filter]); // <--- Update als filter verandert

  if (!data || !data.offer) {
    return <div className="p-8 text-neutral-500">{loading ? 'Laden...' : 'Offer niet gevonden.'}</div>;
  }

  const totalLeads = data.chartData.reduce((acc, curr) => acc + curr.leads, 0);
  const totalSales = data.chartData.reduce((acc, curr) => acc + curr.sales, 0);
  const totalRev = data.chartData.reduce((acc, curr) => acc + curr.revenue, 0);

  // Helper voor de knoppen (dezelfde stijl als dashboard)
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

        {/* Filter Balk */}
        <div className="flex justify-center md:justify-start">
          <div className="bg-[#171717] p-1 rounded-lg border border-[#262626] flex gap-1">
            {filterBtn('this_week', 'This Week')}
            {filterBtn('last_week', 'Last Week')}
            {filterBtn('this_month', 'This Month')}
            {filterBtn('last_month', 'Last Month')}
            {filterBtn('this_year', 'This Year')}
            {filterBtn('all', 'Alles')}
          </div>
        </div>

        {/* Loading overlay of content */}
        {loading ? (
            <div className="h-64 flex items-center justify-center text-neutral-500">Data bijwerken...</div>
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
                    <p className="text-2xl font-bold text-neutral-100 mt-2">{formatPrice(data.totals.revenue)}</p>
                </div>
                </div>

                {/* Grafiek */}
                <div className="bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6 h-[500px]">
                <h2 className="text-xl font-semibold mb-6 text-neutral-200">
                    Performance: {
                        filter === 'this_week' ? 'Deze Week' : 
                        filter === 'last_week' ? 'Vorige Week' : 
                        filter === 'this_month' ? 'Deze Maand' : 
                        filter === 'this_year' ? 'Dit Jaar' : 'Alles'
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
                        <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5' }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar yAxisId="left" dataKey="sales" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" name="Omzet (€)" stroke="#fbbf24" strokeWidth={3} dot={true} />
                        </ComposedChart>
                    </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500">
                    No data in this period.
                    </div>
                )}
                </div>
            </>
        )}
      </div>
    </main>
  );
}