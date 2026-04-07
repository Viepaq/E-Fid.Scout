'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { register, type AuthState } from '../actions';

const initialState: AuthState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#e8143c] hover:bg-[#c4102f] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition-colors text-sm"
    >
      {pending ? 'Creating account…' : 'Create Account'}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[#e8143c] text-xs mt-1">{message}</p>;
}

export default function RegisterForm() {
  const [state, action] = useFormState(register, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="bg-[#e8143c]/10 border border-[#e8143c]/30 rounded-lg px-4 py-3 text-[#e8143c] text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="display_name" className="block text-sm text-[#aaa] mb-1.5">
          Display Name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          minLength={2}
          placeholder="Max Verstappen"
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-[#444] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8143c] focus:border-transparent transition-all"
        />
        <FieldError message={state.fieldErrors?.display_name} />
      </div>

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
        <FieldError message={state.fieldErrors?.email} />
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
          minLength={8}
          placeholder="Min. 8 characters"
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-[#444] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8143c] focus:border-transparent transition-all"
        />
        <FieldError message={state.fieldErrors?.password} />
      </div>

      <div>
        <label htmlFor="birth_date" className="block text-sm text-[#aaa] mb-1.5">
          Date of Birth
        </label>
        <input
          id="birth_date"
          name="birth_date"
          type="date"
          required
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8143c] focus:border-transparent transition-all [color-scheme:dark]"
        />
        <FieldError message={state.fieldErrors?.birth_date} />
      </div>

      <SubmitButton />

      <p className="text-center text-sm text-[#666]">
        Already registered?{' '}
        <Link href="/login" className="text-[#e8143c] hover:text-[#ff2d52] transition-colors">
          Sign in
        </Link>
      </p>
    </form>
  );
}
