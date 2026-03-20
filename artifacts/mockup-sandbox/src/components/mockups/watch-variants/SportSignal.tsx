import React from 'react';
import { Radio, Play, ChevronRight, Tv } from 'lucide-react';

export default function SportSignal() {
  return (
    <div style={{ width: '390px', minHeight: '820px', overflowY: 'auto', backgroundColor: '#1C1C1E', fontFamily: '"Inter", sans-serif', color: '#FFFFFF', position: 'relative' }}>
      <style>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 20px rgba(129, 212, 250, 0.2); }
          50% { box-shadow: 0 0 40px rgba(129, 212, 250, 0.4); }
          100% { box-shadow: 0 0 20px rgba(129, 212, 250, 0.2); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header */}
      <header className="flex justify-between items-center px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Watch</h1>
        <div className="flex space-x-2">
          <div className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center">
            <Radio size={16} className="text-[#81D4FA]" />
          </div>
        </div>
      </header>

      {/* Hero Featured Game (NHL) */}
      <div className="px-4 mb-8">
        <div 
          className="relative rounded-2xl overflow-hidden flex flex-col justify-between p-5"
          style={{ 
            height: '240px',
            background: 'linear-gradient(135deg, rgba(129, 212, 250, 0.7) 0%, rgba(28, 28, 30, 0.9) 100%), #2C2C2E',
            animation: 'pulse-glow 4s infinite',
            border: '1px solid rgba(129, 212, 250, 0.3)'
          }}
        >
          {/* Top bar */}
          <div className="flex justify-between items-start z-10">
            <div className="flex items-center space-x-2 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500" style={{ animation: 'blink 2s infinite' }}></div>
              <span className="text-xs font-bold text-white tracking-widest">LIVE</span>
              <span className="text-xs text-white/70 ml-1 font-medium">· 2nd 11:42</span>
            </div>
            <div className="flex items-center bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
              <Tv size={12} className="text-white/70 mr-1.5" />
              <span className="text-[10px] font-bold text-white tracking-wide uppercase">ESPN+</span>
            </div>
          </div>

          {/* Center Scores */}
          <div className="flex justify-between items-center z-10 my-auto px-2">
            <div className="flex flex-col items-center">
              <span className="text-[64px] font-black tracking-tighter leading-none text-white/90">BOS</span>
              <span className="text-sm font-medium text-white/60 mt-1">Bruins</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-5xl font-bold text-white">3</span>
              <div className="flex flex-col items-center justify-center">
                <span className="text-white/30 text-xl font-light">-</span>
              </div>
              <span className="text-5xl font-bold text-[#81D4FA]">2</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[64px] font-black tracking-tighter leading-none text-[#81D4FA]">TOR</span>
              <span className="text-sm font-medium text-[#81D4FA]/80 mt-1">Maple Leafs</span>
            </div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E]/80 to-transparent pointer-events-none"></div>
          
          <div className="z-10 flex justify-center mt-2">
            <button className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm flex items-center hover:bg-gray-200 transition-colors">
              <Play size={14} className="mr-2 fill-current" />
              Tune In
            </button>
          </div>
        </div>
      </div>

      {/* Now Live Rail */}
      <div className="mb-8">
        <div className="flex justify-between items-end px-4 mb-3">
          <h2 className="text-[13px] font-bold text-white/50 tracking-widest uppercase">Now Live</h2>
          <span className="text-xs text-white/40 flex items-center">View All <ChevronRight size={12} className="ml-0.5" /></span>
        </div>
        
        <div className="flex overflow-x-auto hide-scrollbar px-4 space-x-3 pb-2">
          {/* Rugby Card */}
          <div className="flex-shrink-0 w-[160px] h-[100px] bg-[#2C2C2E] rounded-xl flex flex-col p-3 relative overflow-hidden" style={{ borderLeft: '4px solid #8BC34A' }}>
            <div className="flex justify-between items-center mb-auto">
              <span className="text-[10px] font-bold text-[#8BC34A]">1H · 43'</span>
              <span className="text-[9px] text-white/50 font-medium">FloSports</span>
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white truncate pr-2">Eagles</span>
                <span className="text-sm font-bold text-white">24</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white/70 truncate pr-2">Steelers</span>
                <span className="text-sm font-medium text-white/70">10</span>
              </div>
            </div>
          </div>

          {/* NBA Card */}
          <div className="flex-shrink-0 w-[160px] h-[100px] bg-[#2C2C2E] rounded-xl flex flex-col p-3 relative overflow-hidden" style={{ borderLeft: '4px solid #FF9800' }}>
            <div className="flex justify-between items-center mb-auto">
              <span className="text-[10px] font-bold text-[#FF9800]">3rd · 4:22</span>
              <span className="text-[9px] text-white/50 font-medium">YouTube TV</span>
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white/70 truncate pr-2">LAL</span>
                <span className="text-sm font-medium text-white/70">58</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white truncate pr-2">GSW</span>
                <span className="text-sm font-bold text-white">61</span>
              </div>
            </div>
          </div>

          {/* Cricket Card */}
          <div className="flex-shrink-0 w-[160px] h-[100px] bg-[#2C2C2E] rounded-xl flex flex-col p-3 relative overflow-hidden" style={{ borderLeft: '4px solid #FFC800' }}>
            <div className="flex justify-between items-center mb-auto">
              <span className="text-[10px] font-bold text-[#FFC800]">In Progress</span>
              <span className="text-[9px] text-white/50 font-medium">Willow</span>
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-white truncate pr-2">IND</span>
                <span className="text-sm font-medium text-white/50">-</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white/70 truncate pr-2">AUS</span>
                <span className="text-sm font-medium text-white/50">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Up Next Grid */}
      <div className="px-4 pb-12">
        <h2 className="text-[13px] font-bold text-white/50 tracking-widest uppercase mb-4">Up Next</h2>
        
        <div className="grid grid-cols-2 gap-3">
          {/* EPL Tile */}
          <div className="bg-[#2C2C2E] rounded-xl p-3 flex flex-col justify-between h-[110px] border border-white/5">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[#FFC107]">7:45 PM</span>
              <span className="text-[10px] bg-[#1C1C1E] px-1.5 py-0.5 rounded text-white/70 font-medium">Peacock</span>
            </div>
            <div className="mt-auto">
              <div className="flex items-center mb-1">
                <span className="text-xs mr-1">⚽</span>
                <span className="text-sm font-semibold text-white truncate">ARS vs CHE</span>
              </div>
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Premier League</span>
            </div>
          </div>

          {/* NHL Tile */}
          <div className="bg-[#2C2C2E] rounded-xl p-3 flex flex-col justify-between h-[110px] border border-white/5">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[#81D4FA]">8:00 PM</span>
              <span className="text-[10px] bg-[#1C1C1E] px-1.5 py-0.5 rounded text-white/70 font-medium">ESPN+</span>
            </div>
            <div className="mt-auto">
              <div className="flex items-center mb-1">
                <span className="text-xs mr-1">🏒</span>
                <span className="text-sm font-semibold text-white truncate">NYR vs WSH</span>
              </div>
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">NHL</span>
            </div>
          </div>

          {/* F1 Tile */}
          <div className="bg-[#2C2C2E] rounded-xl p-3 flex flex-col justify-between h-[110px] border border-white/5">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[#E53935]">8:00 PM</span>
              <span className="text-[10px] bg-[#1C1C1E] px-1.5 py-0.5 rounded text-white/70 font-medium">ESPN</span>
            </div>
            <div className="mt-auto">
              <div className="flex items-center mb-1">
                <span className="text-xs mr-1">🏎️</span>
                <span className="text-sm font-semibold text-white truncate">AUS GP Quali</span>
              </div>
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Formula 1</span>
            </div>
          </div>

          {/* Rugby Tile */}
          <div className="bg-[#2C2C2E] rounded-xl p-3 flex flex-col justify-between h-[110px] border border-white/5">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-[#8BC34A]">9:30 PM</span>
              <span className="text-[10px] bg-[#1C1C1E] px-1.5 py-0.5 rounded text-white/70 font-medium">FloSports</span>
            </div>
            <div className="mt-auto">
              <div className="flex items-center mb-1">
                <span className="text-xs mr-1">🏉</span>
                <span className="text-sm font-semibold text-white truncate">LEI vs MUN</span>
              </div>
              <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">URC Rugby</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
