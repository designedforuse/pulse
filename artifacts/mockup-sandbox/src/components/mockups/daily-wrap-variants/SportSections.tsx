import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function SportSections() {
  const [expanded, setExpanded] = useState<string | null>("favorites");

  const toggleSection = (id: string) => {
    setExpanded(prev => prev === id ? null : id);
  };

  const sections = [
    {
      id: "favorites",
      title: "YOUR FAVORITES",
      emoji: "⭐",
      color: "#FFD700",
      countText: "5 fav results",
      results: [
        "Seattle 6–2 Florida Panthers · NHL",
        "Barcelona 5–2 Sevilla · La Liga",
        "Anaheim 4–3 Montréal · NHL",
        "New England 6–1 Cincinnati · MLS",
        "Utah Grizzlies 4–3 Tulsa Oilers · ECHL"
      ],
      preview: null
    },
    {
      id: "golf",
      title: "GOLF",
      emoji: "⛳",
      color: "#22C55E",
      countText: "1 result",
      results: ["Cameron Young -13 · Final"],
      preview: "Cameron Young -13"
    },
    {
      id: "tennis",
      title: "TENNIS",
      emoji: "🎾",
      color: "#CE82FF",
      countText: "1 result",
      results: ["Sinner beat Medvedev · 7-6, 7-6"],
      preview: "Sinner beat Medvedev"
    },
    {
      id: "hockey",
      title: "HOCKEY",
      emoji: "🏒",
      color: "#1CB0F6",
      countText: "12 results",
      results: [],
      preview: null
    },
    {
      id: "soccer",
      title: "SOCCER",
      emoji: "⚽",
      color: "#35C7A5",
      countText: "18 results",
      results: [],
      preview: null
    },
    {
      id: "basketball",
      title: "BASKETBALL",
      emoji: "🏀",
      color: "#FF4B4B",
      countText: "6 results",
      results: [],
      preview: null
    }
  ];

  return (
    <div className="min-h-screen bg-[#0F0F1A] p-4 flex justify-center items-start font-sans text-[#F0F0FF]">
      <div className="w-[390px] bg-[#1C1C2E] rounded-2xl border border-[#2A2A3E] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-5 pb-4">
          <div className="text-[#FF85C8] font-bold text-xs tracking-wider mb-1">DAILY WRAP</div>
          <div className="flex justify-between items-baseline mb-1">
            <h2 className="text-[22px] font-bold text-white">March 15, 2026</h2>
          </div>
          <p className="text-[#8888AA] text-sm">5 from your teams</p>
        </div>

        <div className="flex flex-col px-3 pb-3 gap-2.5">
          {sections.map(section => {
            const isExpanded = expanded === section.id;
            
            return (
              <div 
                key={section.id} 
                className={`flex flex-col bg-[#161625] rounded-xl overflow-hidden border border-[#2A2A3E]/60 transition-all duration-200 ${isExpanded ? 'border-l-2 shadow-lg' : ''}`}
                style={{ borderLeftColor: isExpanded ? section.color : undefined }}
              >
                <button 
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-3.5 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span className="text-base leading-none">{section.emoji}</span>
                    <span 
                      className="font-bold text-[13px] tracking-wide shrink-0"
                      style={{ color: section.color }}
                    >
                      {section.title}
                    </span>
                    {!isExpanded && section.preview && (
                      <span className="text-[#8888AA] text-[13px] truncate ml-1">
                        · {section.preview}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 ml-2 shrink-0">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#1C1C2E] text-[#8888AA] border border-[#2A2A3E]">
                      {section.countText}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-[#8888AA]" />
                    ) : (
                      <ChevronDown size={16} className="text-[#8888AA]" />
                    )}
                  </div>
                </button>
                
                {isExpanded && section.results.length > 0 && (
                  <div className="px-4 pb-4 pt-1 flex flex-col gap-3.5">
                    {section.results.map((result, i) => {
                      const parts = result.split('·');
                      return (
                        <div key={i} className="flex flex-col relative pl-2 before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:bg-[#2A2A3E] before:rounded-full">
                          <span className="text-[14px] leading-snug font-medium text-[#F0F0FF]">{parts[0].trim()}</span>
                          {parts[1] && <span className="text-[12px] text-[#8888AA] mt-1 font-medium">{parts[1].trim()}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="w-full py-4 text-center border-t border-[#2A2A3E] text-[#FF85C8] font-semibold text-sm hover:bg-[#2A2A3E]/30 transition-colors">
          See all 47 results →
        </button>
      </div>
    </div>
  );
}
