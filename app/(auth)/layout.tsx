export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold tracking-tight">
          <span className="text-white">Kaimann</span>
          <span className="text-[#e8143c]"> Racing</span>
        </span>
        <p className="text-[#666] text-sm mt-1">Sim Racing Talent Platform</p>
      </div>
      {children}
    </div>
  );
}
