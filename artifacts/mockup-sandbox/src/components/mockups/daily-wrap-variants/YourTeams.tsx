import React, { useState } from "react";
import { ChevronDown, Newspaper, ArrowRight } from "lucide-react";

export function YourTeams() {
  const [expanded, setExpanded] = useState(false);

  // Mock Data
  const date = "March 15, 2026";
  const favCount = 5;
  const total = 47;

  const favResults = [
    { sport: "hockey", emoji: "🏒", color: "#1CB0F6", league: "NHL · Final", editorial: "Seattle Kraken dominated Florida Panthers 6–2" },
    { sport: "soccer", emoji: "⚽", color: "#35C7A5", league: "La Liga · Full Time", editorial: "Barcelona hammered Sevilla 5–2" },
    { sport: "hockey", emoji: "🏒", color: "#1CB0F6", league: "NHL · Final", editorial: "Anaheim Ducks edged Montréal Canadiens 4–3" },
    { sport: "soccer", emoji: "⚽", color: "#35C7A5", league: "MLS · Full Time", editorial: "New England Revolution hammered FC Cincinnati 6–1" },
    { sport: "hockey", emoji: "🏒", color: "#1CB0F6", league: "ECHL · Final", editorial: "Utah Grizzlies edged Tulsa Oilers 4–3" },
  ];

  const everythingElse = [
    { sport: "tennis", league: "ATP Masters", editorial: "Sinner beats Medvedev at Indian Wells Masters", detail: "Final · 7–6, 7–6" },
    { sport: "soccer", league: "EPL", editorial: "Man Utd beat Aston Villa 3–1", detail: "3–1 Full Time" },
    { sport: "basketball", league: "NBA", editorial: "OKC Thunder beat Minnesota Timberwolves 116–103", detail: "116–103 Final" },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-4 flex items-center justify-center font-sans">
      <div className="w-[390px] bg-[#1C1C2E] rounded-2xl border border-[#2A2A3E] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A3E]/50">
          <div className="text-[10px] font-bold tracking-widest text-[#8888AA] uppercase">
            Daily Wrap · {date}
          </div>
          <Newspaper className="w-4 h-4 text-[#FF85C8]" />
        </div>

        {/* Zone 1: YOUR TEAMS */}
        <div className="relative">
          {/* Accent Border */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FFD700]" />
          
          <div className="px-4 py-4 pl-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#FFD700] text-[11px] font-bold tracking-wider flex items-center gap-1.5 uppercase">
                ⭐ YOUR TEAMS
              </h2>
              <div className="bg-[#FFD700]/20 text-[#FFD700] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {favCount} results
              </div>
            </div>

            <div className="space-y-4">
              {favResults.map((result, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="text-base leading-none pt-0.5">{result.emoji}</div>
                  <div className="flex-1">
                    <p className="text-[#F0F0FF] text-sm font-semibold leading-snug">
                      {result.editorial}
                    </p>
                    <p className="text-[#8888AA] text-[11px] font-medium mt-1">
                      {result.league}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#2A2A3E] mx-4 my-2" />

        {/* Zone 2: EVERYTHING ELSE */}
        <div className="px-4 py-3">
          <div 
            className="flex items-center justify-between cursor-pointer group mb-3"
            onClick={() => setExpanded(!expanded)}
          >
            <h2 className="text-[#8888AA] text-[10px] font-bold tracking-wider uppercase">
              Everything Else
            </h2>
            <div className="flex items-center gap-1.5 text-[#8888AA] group-hover:text-[#F0F0FF] transition-colors">
              <span className="text-[11px] font-medium">{total - favCount} more results</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {!expanded && (
            <div className="flex gap-2">
              <div className="bg-[#0F0F1A] border border-[#2A2A3E] px-2.5 py-1.5 rounded-md text-[11px] font-medium text-[#8888AA] flex items-center gap-1.5">
                <span className="text-[#22C55E] text-sm leading-none">⛳</span> Golf
              </div>
              <div className="bg-[#0F0F1A] border border-[#2A2A3E] px-2.5 py-1.5 rounded-md text-[11px] font-medium text-[#8888AA] flex items-center gap-1.5">
                <span className="text-[#CE82FF] text-sm leading-none">🎾</span> Tennis
              </div>
              <div className="bg-[#0F0F1A] border border-[#2A2A3E] px-2.5 py-1.5 rounded-md text-[11px] font-medium text-[#8888AA] flex items-center gap-1.5">
                <span className="text-[#FF4B4B] text-sm leading-none">🏀</span> NBA
              </div>
            </div>
          )}

          {expanded && (
            <div className="space-y-4 mt-4">
              {everythingElse.map((result, idx) => (
                <div key={idx} className="flex flex-col">
                  <p className="text-[#F0F0FF] text-sm leading-snug">
                    {result.editorial}
                  </p>
                  <p className="text-[#8888AA] text-[11px] font-medium mt-1">
                    {result.league} · {result.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0F0F1A]/50 px-4 py-4 flex justify-end mt-auto border-t border-[#2A2A3E]/30">
          <button className="text-[#FF85C8] text-[13px] font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity">
            See all {total} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
