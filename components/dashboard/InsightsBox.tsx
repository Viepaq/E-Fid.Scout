const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 L13.5 8 L18 9 L13.5 10 L12 15 L10.5 10 L6 9 L10.5 8 Z" fill="currentColor" stroke="none"/>
    <path d="M5 3 L5.8 5 L8 5.8 L5.8 6.4 L5 8.2 L4.2 6.4 L2 5.8 L4.2 5 Z" fill="currentColor" stroke="none"/>
    <path d="M19 13 L19.6 14.8 L21.4 15.4 L19.6 16 L19 17.8 L18.4 16 L16.6 15.4 L18.4 14.8 Z" fill="currentColor" stroke="none"/>
  </svg>
);

export default function InsightsBox({ insightsText }: { insightsText: string | null }) {
  if (!insightsText) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#13131e] h-full shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#e8143c]/40 to-transparent" />

      {/* Background glow */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-[#e8143c]/[0.04] rounded-full blur-2xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="relative p-5 h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#e8143c]/10 border border-[#e8143c]/20 flex items-center justify-center text-[#e8143c]">
            <SparkleIcon />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#e8143c] uppercase tracking-[0.15em]">AI Insights</p>
            <p className="text-[10px] text-slate-600 leading-none mt-0.5">Powered by your race data</p>
          </div>
          <div className="ml-auto">
            <span className="w-2 h-2 rounded-full bg-[#e8143c] animate-pulse block shadow-[0_0_6px_rgba(232,20,60,0.7)]" />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.05]" />

        {/* Text */}
        <p className="text-[13px] text-slate-300 leading-relaxed flex-1">
          {insightsText}
        </p>
      </div>
    </div>
  );
}
