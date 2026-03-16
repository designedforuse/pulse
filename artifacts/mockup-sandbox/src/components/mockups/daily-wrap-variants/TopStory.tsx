import React from "react";
import { Star, ChevronRight } from "lucide-react";

export function TopStory() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center p-4 font-sans">
      <div className="w-[390px] bg-[#1C1C2E] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-[#2A2A3E]">
        {/* HERO SECTION */}
        <div className="relative pb-6 border-b border-[#22C55E] border-opacity-30 flex flex-col pt-5 px-5">
          {/* Gradient Wash */}
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{
              background: 'radial-gradient(circle at top left, rgba(34, 197, 94, 0.2) 0%, rgba(28, 28, 46, 0) 70%)'
            }}
          />
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="text-[48px] leading-none drop-shadow-lg">⛳</div>
            <div className="bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold tracking-wider px-2 py-1 rounded-full uppercase">
              Story of the Day
            </div>
          </div>
          
          <div className="relative z-10 mt-2">
            <div className="text-[#22C55E] text-xs font-bold tracking-widest uppercase mb-1.5">
              The Majors
            </div>
            <h2 className="text-[#F0F0FF] text-3xl font-bold leading-[1.15] tracking-tight mb-3">
              🇺🇸 Cameron Young wins Players Championship at -13
            </h2>
            <div className="text-[#8888AA] text-sm font-medium">
              Round 4 · -13 · Final
            </div>
          </div>
        </div>

        {/* CHIP STRIP */}
        <div className="pt-4 pb-4 px-5 flex flex-col gap-2.5">
          <div className="text-[#8888AA] text-[10px] font-bold uppercase tracking-wider">
            Also today
          </div>
          <div className="flex flex-row gap-2 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#CE82FF]/15 text-[#CE82FF] text-xs px-3 py-1.5 font-semibold shrink-0">
              <span>🎾</span> Sinner wins
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1CB0F6]/15 text-[#1CB0F6] text-xs px-3 py-1.5 font-semibold shrink-0 border border-[#1CB0F6]/30">
              <span>🏒</span> Seattle 6-2 <Star size={10} className="fill-[#1CB0F6] text-[#1CB0F6] ml-0.5" />
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#35C7A5]/15 text-[#35C7A5] text-xs px-3 py-1.5 font-semibold shrink-0">
              <span>⚽</span> Man Utd 3-1
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FF4B4B]/15 text-[#FF4B4B] text-xs px-3 py-1.5 font-semibold shrink-0">
              <span>🏀</span> OKC 116-103
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#35C7A5]/15 text-[#35C7A5] text-xs px-3 py-1.5 font-semibold shrink-0 border border-[#35C7A5]/30">
              <span>⚽</span> Barça 5-2 <Star size={10} className="fill-[#35C7A5] text-[#35C7A5] ml-0.5" />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <button className="py-4 border-t border-[#2A2A3E]/50 flex items-center justify-center gap-1 w-full hover:bg-white/5 transition-colors">
          <span className="text-[#FF85C8] font-semibold text-sm">47 results today · See all</span>
          <ChevronRight size={16} className="text-[#FF85C8]" />
        </button>
      </div>
    </div>
  );
}
