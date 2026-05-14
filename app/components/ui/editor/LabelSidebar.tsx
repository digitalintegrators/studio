interface LabelSidebarProps {
  audioTracksCount?: number;
  spotlightTracksCount?: number;
}

export default function LabelSidebar({
  audioTracksCount = 0,
  spotlightTracksCount = 0,
}: LabelSidebarProps) {
  return (
    <div className="absolute left-0 top-0 bottom-0 w-16 shrink-0 border-r border-white/5 flex flex-col bg-[#0D0D11] z-30">
      <div className="h-7 border-b border-white/5" />

      <div className="flex-1 flex items-center px-3">
        <span className="text-[9px] uppercase font-semibold tracking-wider text-zinc-500">Video</span>
      </div>

      <div className="h-10 flex items-center px-3 border-t border-white/5">
        <span className="text-[9px] uppercase font-semibold tracking-wider text-zinc-500">Zoom</span>
      </div>

      <div className="h-10 flex items-center px-3 border-t border-white/5 bg-gradient-to-r from-amber-500/[0.05] to-fuchsia-500/[0.05]">
        <span className="text-[9px] uppercase font-semibold tracking-wider text-amber-400/80">
          {spotlightTracksCount > 0 ? "Efectos" : "Efectos"}
        </span>
      </div>

      {audioTracksCount > 0 && (
        <div className="h-10 flex items-center px-3 border-t border-white/5 bg-white/1">
          <span className="text-[9px] uppercase font-semibold tracking-wider text-zinc-500">Audio</span>
        </div>
      )}
    </div>
  );
}
