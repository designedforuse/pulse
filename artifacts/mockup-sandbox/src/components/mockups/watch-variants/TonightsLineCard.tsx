import React from 'react';
import { Radio, ChevronUp, Play, Trophy, Tv, AlertCircle } from 'lucide-react';

export default function TonightsLineCard() {
  return (
    <div
      style={{
        width: '390px',
        minHeight: '820px',
        backgroundColor: '#1C1C1E',
        fontFamily: "'Inter', sans-serif",
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>
        {`
          @keyframes subtlePulse {
            0% { opacity: 0.8; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1); }
            100% { opacity: 0.8; transform: scale(0.98); }
          }
          .live-pulse {
            animation: subtlePulse 3s ease-in-out infinite;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      {/* Hero Section - Featured Live Game (NHL) */}
      <div
        className="relative flex-shrink-0 flex flex-col items-center justify-between"
        style={{
          height: '450px',
          background: 'linear-gradient(180deg, rgba(129, 212, 250, 0.15) 0%, #1C1C1E 100%)',
        }}
      >
        {/* Radial Glow */}
        <div
          className="absolute inset-0 pointer-events-none live-pulse"
          style={{
            background: 'radial-gradient(circle at 50% 40%, rgba(129, 212, 250, 0.1) 0%, transparent 60%)',
          }}
        />

        {/* Top Bar */}
        <div className="w-full flex justify-between items-center px-6 pt-12 z-10">
          <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/30 backdrop-blur-md">
            <Radio size={14} className="text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500 tracking-wider">NOW LIVE</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
            <Play size={12} className="text-[#81D4FA]" fill="#81D4FA" />
            <span className="text-xs font-semibold text-white/90 tracking-wide">ESPN+</span>
          </div>
        </div>

        {/* Matchup Center */}
        <div className="w-full flex items-center justify-center px-6 z-10 -mt-8">
          {/* Away Team */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <span
              className="font-black text-transparent bg-clip-text"
              style={{
                fontSize: '72px',
                backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.4) 100%)',
                lineHeight: '1',
                letterSpacing: '-0.05em'
              }}
            >
              BOS
            </span>
          </div>

          {/* Score & Time */}
          <div className="flex flex-col items-center justify-center mx-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black tabular-nums">3</span>
              <span className="text-3xl font-medium text-white/30">-</span>
              <span className="text-5xl font-black tabular-nums">2</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[#81D4FA]">
              <span className="text-sm font-bold tracking-widest uppercase">2nd</span>
              <span className="w-1 h-1 rounded-full bg-[#81D4FA]/50" />
              <span className="text-sm font-bold tabular-nums">11:42</span>
            </div>
          </div>

          {/* Home Team */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <span
              className="font-black text-transparent bg-clip-text"
              style={{
                fontSize: '72px',
                backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.4) 100%)',
                lineHeight: '1',
                letterSpacing: '-0.05em'
              }}
            >
              TOR
            </span>
          </div>
        </div>

        {/* Sport Label */}
        <div className="pb-8 z-10">
          <span className="text-[10px] font-bold tracking-[0.3em] text-[#81D4FA]/60 uppercase">
            NHL Regular Season
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#81D4FA]/30 to-transparent" />

      {/* Drawer Section - Up Next */}
      <div className="flex-1 bg-[#1C1C1E] flex flex-col z-20">
        {/* Drawer Header */}
        <div className="flex flex-col items-center pt-4 pb-6 px-6">
          <ChevronUp size={16} className="text-white/30 mb-1 animate-bounce" />
          <div className="w-full flex justify-between items-end border-b border-white/5 pb-3">
            <span className="text-sm font-bold tracking-widest text-white/50">UP NEXT</span>
            <span className="text-[10px] font-medium text-white/30 tracking-wider">TONIGHT</span>
          </div>
        </div>

        {/* Up Next List */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 flex flex-col gap-5 pb-8">
          {/* Row 1 - EPL */}
          <div className="flex items-center group">
            <div className="w-16 flex flex-col">
              <span className="text-sm font-bold text-white/90">7:45</span>
              <span className="text-[10px] font-semibold text-white/40 uppercase">PM</span>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-[#FFC107]" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#FFC107] tracking-wider uppercase mb-0.5">EPL</span>
                <span className="text-sm font-semibold text-white/90">Arsenal vs Chelsea</span>
              </div>
            </div>
            <div className="bg-[#2C2C2E] px-2.5 py-1 rounded">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Peacock</span>
            </div>
          </div>

          {/* Row 2 - NHL */}
          <div className="flex items-center group">
            <div className="w-16 flex flex-col">
              <span className="text-sm font-bold text-white/90">8:00</span>
              <span className="text-[10px] font-semibold text-white/40 uppercase">PM</span>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-[#81D4FA]" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#81D4FA] tracking-wider uppercase mb-0.5">NHL</span>
                <span className="text-sm font-semibold text-white/90">Rangers vs Capitals</span>
              </div>
            </div>
            <div className="bg-[#2C2C2E] px-2.5 py-1 rounded">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">ESPN+</span>
            </div>
          </div>

          {/* Row 3 - F1 */}
          <div className="flex items-center group">
            <div className="w-16 flex flex-col">
              <span className="text-sm font-bold text-white/90">8:00</span>
              <span className="text-[10px] font-semibold text-white/40 uppercase">PM</span>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-[#E53935]" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#E53935] tracking-wider uppercase mb-0.5">F1</span>
                <span className="text-sm font-semibold text-white/90">Australian GP Quali</span>
              </div>
            </div>
            <div className="bg-[#2C2C2E] px-2.5 py-1 rounded">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">ESPN</span>
            </div>
          </div>

          {/* Row 4 - Rugby (Peeking) */}
          <div className="flex items-center group opacity-50 relative translate-y-4 mask-image-bottom">
            <div className="w-16 flex flex-col">
              <span className="text-sm font-bold text-white/90">9:30</span>
              <span className="text-[10px] font-semibold text-white/40 uppercase">PM</span>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-[#8BC34A]" />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#8BC34A] tracking-wider uppercase mb-0.5">URC</span>
                <span className="text-sm font-semibold text-white/90">Leinster vs Munster</span>
              </div>
            </div>
            <div className="bg-[#2C2C2E] px-2.5 py-1 rounded">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">FloSports</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
