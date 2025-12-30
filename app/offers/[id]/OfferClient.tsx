'use client';

import PageContainer from '@/components/PageContainer';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const formatPrice = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export default function OfferClient({ offer, chartData, totals, campaignType }: any) {
  return (
    <PageContainer 
      title={offer.name} 
      subtitle={`Detail overzicht - ${offer.network?.name || 'Unknown Network'}`}
      actions={
        <Link href="/offers" className="text-sm text-neutral-400 hover:text-white flex items-center gap-1 transition-colors">
            <ArrowLeft size={16} /> Terug
        </Link>
      }
    >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
                 <p className="text-sm text-neutral-500 mb-1">Total Revenue</p>
                 <h3 className="text-2xl font-bold text-white">{formatPrice(totals.revenue)}</h3>
             </div>
             <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
                 <p className="text-sm text-neutral-500 mb-1">Leads / Sales</p>
                 <h3 className="text-2xl font-bold text-white">{totals.leads} / {totals.sales}</h3>
             </div>
             <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-xl">
                 <p className="text-sm text-neutral-500 mb-1">Payouts</p>
                 <div className="flex gap-4 text-sm">
                     <span className="text-neutral-300">Lead: {formatPrice(offer.payoutLead)}</span>
                     <span className="text-neutral-300">Sale: {formatPrice(offer.payoutSale)}</span>
                 </div>
             </div>
        </div>

        <div className="h-[400px] bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-200 mb-4">Performance</h3>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="date" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} />
                    <YAxis yAxisId="left" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} />
                    <YAxis yAxisId="right" orientation="right" stroke="#525252" tick={{fill: '#737373', fontSize: 12}} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#f5f5f5' }} 
                        formatter={(val: number, name: string) => [name === 'revenue' ? formatPrice(val) : val, name]}
                    />
                    <Legend />
                    
                    {/* Logica: Bij SEO focus op aantallen, bij PAID focus op geld, maar hier tonen we alles even netjes */}
                    <Bar yAxisId="left" dataKey="leads" name="Leads" fill="#eab308" maxBarSize={50} radius={[4,4,0,0]} />
                    <Bar yAxisId="left" dataKey="sales" name="Sales" fill="#22c55e" maxBarSize={50} radius={[4,4,0,0]} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} dot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    </PageContainer>
  );
}