'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="w-12 h-12 rounded-full bg-[#e8143c]/10 border border-[#e8143c]/30 flex items-center justify-center mb-2">
        <span className="text-[#e8143c] text-xl">!</span>
      </div>
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="text-[#888888] text-sm max-w-xs">
        An unexpected error occurred.
        {error.digest && (
          <span className="block mt-1 text-xs text-[#555]">
            Error ID: {error.digest}
          </span>
        )}
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={reset}
          className="text-sm bg-[#e8143c] hover:bg-[#c4102f] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="text-sm text-[#888888] hover:text-white border border-[#333] hover:border-white/30 px-5 py-2.5 rounded-lg transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
