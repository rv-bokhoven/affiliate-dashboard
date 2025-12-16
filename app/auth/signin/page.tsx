'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // We roepen NextAuth aan
    const res = await signIn('credentials', {
      password,
      redirect: false, // We regelen de redirect zelf
    });

    if (res?.error) {
      setError('Verkeerd wachtwoord!');
      setLoading(false);
    } else {
      router.push('/'); // Stuur door naar dashboard
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#171717] border border-[#262626] rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-100">Welkom terug 👋</h1>
          <p className="text-neutral-500 text-sm mt-2">Log in om je dashboard te bekijken</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="password" 
              placeholder="Wachtwoord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-md px-3 py-3 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>
          
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-md transition disabled:opacity-50"
          >
            {loading ? 'Bezig met inloggen...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}