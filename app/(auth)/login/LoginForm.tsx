'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { login, type AuthState } from '../actions';

const initialState: AuthState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-fid-accent hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition-opacity text-sm shadow-[0_0_24px_-6px_rgba(203,60,51,0.55)]"
    >
      {pending ? 'Signing in…' : 'Sign In'}
    </button>
  );
}

export default function LoginForm() {
  const [state, action] = useFormState(login, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="bg-[#e8143c]/10 border border-[#e8143c]/30 rounded-lg px-4 py-3 text-[#e8143c] text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm text-[#aaa] mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-[#444] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8143c] focus:border-transparent transition-all"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm text-[#aaa] mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-[#444] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8143c] focus:border-transparent transition-all"
        />
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-[#666]">
        No account yet?{' '}
        <Link href="/register" className="text-[#e8143c] hover:text-[#ff2d52] transition-colors">
          Register
        </Link>
      </p>
    </form>
  );
}
