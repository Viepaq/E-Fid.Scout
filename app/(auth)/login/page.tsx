import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — Kaimann Racing',
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl">
        <div className="mb-7">
          <h1 className="text-xl font-bold text-white">Welcome back</h1>
          <p className="text-[#666] text-sm mt-1">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
