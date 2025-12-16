'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

interface LogItem {
  id: number;
  type: 'spend' | 'conversion';
  date: string;
  description: string;
  value: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const res = await fetch('/api/logs');
    const data = await res.json();
    setLogs(data);
    setLoading(false);
  };

    const handleDelete = async (id: number, type: string) => {
      if (!confirm('Are you sure to remove this?')) return;

      try {
        await fetch('/api/logs', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, type }),
        });

        // NIEUW:
        toast.success('Item successfully removed from the database.');
        
        fetchLogs();
      } catch (e) {
        // OUD: alert('Kon niet verwijderen');
        // NIEUW:
        toast.error('Not able to remove item.');
      }
    };

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-100">Logs & Corrections</h1>
          <Link href="/" className="text-sm text-neutral-400 hover:text-white transition">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-[#171717] border border-[#262626] rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-neutral-200 border-b border-[#262626] pb-4 mb-4">
            Recent Input (Last 40 items)
          </h2>

          {loading ? (
            <p className="text-neutral-500 text-sm">Loading...</p>
          ) : (
            <div className="space-y-2">
              {logs.map((item, index) => (
                <div key={`${item.type}-${item.id}-${index}`} className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#262626] rounded-lg">
                  
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      item.type === 'spend' ? 'bg-red-900/30 text-red-500' : 'bg-green-900/30 text-green-500'
                    }`}>
                      {item.type === 'spend' ? '€' : 'L'}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-neutral-200">
                        {new Date(item.date).toLocaleDateString('nl-NL')}
                        <span className="text-neutral-500 mx-2">|</span>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-neutral-300">{item.value}</span>
                    <button 
                      onClick={() => handleDelete(item.id, item.type)}
                      className="text-neutral-600 hover:text-red-500 p-2 transition"
                      title="Verwijderen"
                    >
                      🗑️
                    </button>
                  </div>

                </div>
              ))}
              {logs.length === 0 && <p className="text-neutral-500">No data found.</p>}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}