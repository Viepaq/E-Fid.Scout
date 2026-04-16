'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function LockPage() {
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const router                    = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.refresh();
        router.push('/');
      } else {
        setError('Incorrect password. Try again.');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">

      {/* Card */}
      <div className="w-full max-w-sm bg-[#111111] border border-[#222222] rounded-2xl p-8 shadow-2xl">
        <div className="mb-6 text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-[#e8143c]/10 border border-[#e8143c]/20 flex items-center justify-center mx-auto mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8143c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">Private Access</h1>
          <p className="text-sm text-[#666]">Enter the access password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[#e8143c]/10 border border-[#e8143c]/30 rounded-lg px-4 py-3 text-[#e8143c] text-sm">
              {error}
            </div>
          )}

          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoFocus
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-[#444] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8143c] focus:border-transparent transition-all"
          />

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#e8143c] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 text-sm transition-opacity shadow-[0_0_24px_-6px_rgba(232,20,60,0.55)]"
          >
            {loading ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
