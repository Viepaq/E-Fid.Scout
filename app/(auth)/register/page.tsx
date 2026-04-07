import type { Metadata } from 'next';
import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account — FID-Scout',
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl">
        <div className="mb-7">
          <h1 className="text-xl font-bold text-white">Create your account</h1>
          <p className="text-[#666] text-sm mt-1">Start your scouting journey</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
