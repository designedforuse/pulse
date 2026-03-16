import React from "react";
import { Star, ChevronRight } from "lucide-react";

const rows = [
  {
    sport: "golf",
    emoji: "⛳",
    color: "#22C55E",
    bgClass: "bg-[#22C55E]",
    textClass: "text-[#22C55E]",
    pillBgClass: "bg-[#22C55E]/20",
    team: "Cameron Young",
    score: "-13",
    league: "THE MAJORS",
    detail: "Final",
    isFav: false,
  },
  {
    sport: "tennis",
    emoji: "🎾",
    color: "#CE82FF",
    bgClass: "bg-[#CE82FF]",
    textClass: "text-[#CE82FF]",
    pillBgClass: "bg-[#CE82FF]/20",
    team: "Sinner def. Medvedev",
    score: "7–6, 7–6",
    league: "ATP Masters",
    detail: "Final",
    isFav: false,
  },
  {
    sport: "hockey",
    emoji: "🏒",
    color: "#1CB0F6",
    bgClass: "bg-[#1CB0F6]",
    textClass: "text-[#1CB0F6]",
    pillBgClass: "bg-[#1CB0F6]/20",
    team: "Seattle 6 – Florida 2",
    score: "6–2",
    league: "NHL",
    detail: "Final",
    isFav: true,
  },
  {
    sport: "soccer",
    emoji: "⚽",
    color: "#35C7A5",
    bgClass: "bg-[#35C7A5]",
    textClass: "text-[#35C7A5]",
    pillBgClass: "bg-[#35C7A5]/20",
    team: "Man Utd 3 – Aston Villa 1",
    score: "3–1",
    league: "EPL",
    detail: "Full Time",
    isFav: false,
  },
  {
    sport: "basketball",
    emoji: "🏀",
    color: "#FF4B4B",
    bgClass: "bg-[#FF4B4B]",
    textClass: "text-[#FF4B4B]",
    pillBgClass: "bg-[#FF4B4B]/20",
    team: "OKC 116 – Minnesota 103",
    score: "116–103",
    league: "NBA",
    detail: "Final",
    isFav: false,
  },
  {
    sport: "soccer",
    emoji: "⚽",
    color: "#35C7A5",
    bgClass: "bg-[#35C7A5]",
    textClass: "text-[#35C7A5]",
    pillBgClass: "bg-[#35C7A5]/20",
    team: "Barcelona 5 – Sevilla 2",
    score: "5–2",
    league: "La Liga",
    detail: "Full Time",
    isFav: true,
  },
  {
    sport: "hockey",
    emoji: "🏒",
    color: "#1CB0F6",
    bgClass: "bg-[#1CB0F6]",
    textClass: "text-[#1CB0F6]",
    pillBgClass: "bg-[#1CB0F6]/20",
    team: "Anaheim 4 – Montréal 3",
    score: "4–3",
    league: "NHL",
    detail: "Final",
    isFav: true,
  },
  {
    sport: "soccer",
    emoji: "⚽",
    color: "#35C7A5",
    bgClass: "bg-[#35C7A5]",
    textClass: "text-[#35C7A5]",
    pillBgClass: "bg-[#35C7A5]/20",
    team: "New England 6 – Cincinnati 1",
    score: "6–1",
    league: "MLS",
    detail: "Full Time",
    isFav: true,
  },
];

export function Ticker() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[390px] bg-[#1C1C2E] rounded-2xl border border-[#2A2A3E] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2A2A3E]">
          <div className="text-[#FF85C8] text-[11px] font-bold tracking-widest uppercase">
            DAILY WRAP · MARCH 15
          </div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`relative flex items-center py-2.5 px-3 hover:bg-[#2A2A3E]/50 transition-colors ${
                i !== rows.length - 1 ? "border-b border-[#2A2A3E]/50" : ""
              }`}
            >
              {/* Left accent bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-[3px] ${row.bgClass}`}
              />

              {/* Emoji */}
              <div className="w-6 flex items-center justify-center text-[14px] opacity-90 mr-2 ml-1">
                {row.emoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-1.5">
                  <div className="text-[#F0F0FF] text-[13px] font-bold leading-tight truncate">
                    {row.team}
                  </div>
                  {row.isFav && (
                    <Star
                      size={10}
                      className="fill-[#FFD700] text-[#FFD700] flex-shrink-0"
                    />
                  )}
                </div>
                <div className="text-[#8888AA] text-[11px] font-medium mt-0.5 uppercase tracking-wide">
                  {row.league} {row.detail}
                </div>
              </div>

              {/* Score Chip */}
              <div
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold whitespace-nowrap ${row.pillBgClass} ${row.textClass}`}
              >
                {row.score}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#2A2A3E] flex items-center justify-center">
          <button className="flex items-center gap-1 text-[#FF85C8] text-[13px] font-semibold hover:opacity-80 transition-opacity">
            47 results · See all <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
