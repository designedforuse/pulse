import React from 'react';
import { Radio } from 'lucide-react';

const LIVE_GAMES = [
  {
    id: 'nhl',
    sport: 'NHL',
    color: '#81D4FA',
    home: 'BOS',
    homeScore: 3,
    away: 'TOR',
    awayScore: 2,
    period: '2nd · 11:42',
    provider: 'ESPN+',
    channelNum: '01'
  },
  {
    id: 'rugby',
    sport: 'RUGBY',
    color: '#8BC34A',
    home: 'EAG',
    homeScore: 24,
    away: 'STL',
    awayScore: 10,
    period: "1H · 43'",
    provider: 'FloSports',
    channelNum: '02'
  },
  {
    id: 'nba',
    sport: 'NBA',
    color: '#FF9800',
    home: 'LAL',
    homeScore: 58,
    away: 'GSW',
    awayScore: 61,
    period: '3rd · 4:22',
    provider: 'YouTube TV',
    channelNum: '03'
  },
  {
    id: 'cricket',
    sport: 'CRICKET',
    color: '#FFC800',
    home: 'IND',
    homeScore: '-',
    away: 'AUS',
    awayScore: '-',
    period: 'In Progress',
    provider: 'Willow/YTTV',
    channelNum: '04'
  }
];

const UP_NEXT = [
  { id: 'epl', sport: 'EPL', color: '#FFC107', title: 'Arsenal vs Chelsea', time: '7:45 PM', provider: 'Peacock' },
  { id: 'nhl2', sport: 'NHL', color: '#81D4FA', title: 'Rangers vs Capitals', time: '8:00 PM', provider: 'ESPN+' },
  { id: 'f1', sport: 'F1', color: '#E53935', title: 'Australian GP Qual.', time: '8:00 PM', provider: 'ESPN' },
  { id: 'rugby2', sport: 'URC', color: '#8BC34A', title: 'Leinster vs Munster', time: '9:30 PM', provider: 'FloSports' },
];

export default function BroadcastGrid() {
  return (
    <div style={{ width: '390px', minHeight: '820px', overflowY: 'auto', backgroundColor: '#1C1C1E', fontFamily: '"Inter", sans-serif', color: '#ffffff' }}>
      <style>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow {
          animation: pulse-opacity 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold tracking-tight">Watch</h1>
        <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-1 rounded">
          <Radio size={12} className="text-red-500 animate-pulse-slow" />
          <span className="text-xs font-bold text-red-500 tracking-wider">LIVE</span>
        </div>
      </div>

      {/* Broadcast Grid 2x2 */}
      <div className="grid grid-cols-2 gap-[4px] px-2 mb-8">
        {LIVE_GAMES.map((game) => (
          <div 
            key={game.id} 
            className="relative flex flex-col justify-between"
            style={{ 
              height: '160px', 
              backgroundColor: '#111111',
              borderLeft: `2px solid ${game.color}`,
              boxShadow: `-4px 0 12px -6px ${game.color}80`
            }}
          >
            {/* Top Bar: Channel & Provider */}
            <div className="flex justify-between items-start p-2">
              <span className="text-[10px] font-mono text-zinc-500">{game.channelNum}</span>
              <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800/50 px-1.5 py-0.5 rounded tracking-wider uppercase">
                {game.provider}
              </span>
            </div>

            {/* Center: Score */}
            <div className="flex flex-col items-center justify-center gap-1 px-2">
              <div className="flex items-center justify-between w-full px-2">
                <span className="text-lg font-bold text-zinc-300">{game.home}</span>
                <span className="text-2xl font-black tabular-nums">{game.homeScore}</span>
              </div>
              <div className="flex items-center justify-between w-full px-2">
                <span className="text-lg font-bold text-zinc-300">{game.away}</span>
                <span className="text-2xl font-black tabular-nums">{game.awayScore}</span>
              </div>
            </div>

            {/* Bottom: Status & Sport */}
            <div className="flex justify-between items-end p-2 border-t border-zinc-800/30 mt-auto bg-black/20">
              <span className="text-[10px] font-bold tracking-wider" style={{ color: game.color }}>
                {game.sport}
              </span>
              <span className="text-[10px] font-medium text-zinc-400">
                {game.period}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Coming Up Strip */}
      <div className="px-4 mb-8">
        <div className="flex items-center mb-4">
          <h2 className="text-xs font-bold tracking-widest text-zinc-500">COMING UP</h2>
          <div className="h-px bg-zinc-800 flex-1 ml-4"></div>
        </div>

        <div className="flex flex-col gap-0">
          {UP_NEXT.map((event, i) => (
            <div 
              key={event.id}
              className={`flex items-center py-3 ${i !== UP_NEXT.length - 1 ? 'border-b border-zinc-800/50' : ''}`}
            >
              <div className="w-16 flex-shrink-0">
                <span className="text-xs font-medium text-zinc-400">{event.time}</span>
              </div>
              
              <div className="w-1 flex-shrink-0 h-4 rounded-full mr-3" style={{ backgroundColor: event.color }}></div>
              
              <div className="flex-1 flex flex-col pr-2 min-w-0">
                <span className="text-xs font-bold text-zinc-200 truncate">{event.title}</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{event.sport}</span>
              </div>

              <div className="flex-shrink-0">
                <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-2 py-1 rounded-full">
                  {event.provider}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
