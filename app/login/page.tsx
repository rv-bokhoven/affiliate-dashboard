'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        toast.success('Ingelogd!');
        router.push('/'); // Stuur naar dashboard
        router.refresh();
      } else {
        toast.error('Ongeldige gegevens');
      }
    } catch (e) {
      toast.error('Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Affiliate Pro</h1>
        <p className="text-neutral-500 text-center mb-6">Log in om verder te gaan</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase block mb-1.5">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 uppercase block mb-1.5">Wachtwoord</label>
            <input 
              type="password" 
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded p-2 text-white focus:border-blue-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-white text-black font-medium py-2 rounded hover:bg-neutral-200 transition disabled:opacity-50"
          >
            {loading ? 'Laden...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}