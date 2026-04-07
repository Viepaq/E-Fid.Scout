export default function InsightsBox({ insightsText }: { insightsText: string | null }) {
  if (!insightsText) return null;

  return (
    <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-5 border-l-[3px] border-l-[#e8143c] h-full">
      <div className="flex gap-3">
        <span className="text-xl shrink-0 mt-0.5" aria-hidden>
          💡
        </span>
        <p className="text-[15px] italic text-[#cccccc] leading-relaxed">
          {insightsText}
        </p>
      </div>
    </div>
  );
}
