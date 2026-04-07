import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 text-center px-6">
      <span className="text-8xl font-black text-[#e8143c]">404</span>
      <h1 className="text-2xl font-bold text-white">Page not found</h1>
      <p className="text-[#888888] text-sm max-w-xs">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-2 text-sm text-[#e8143c] hover:text-white border border-[#e8143c]/30 hover:border-white/30 px-5 py-2.5 rounded-lg transition-colors"
      >
        ← Back to home
      </Link>
    </div>
  );
}
