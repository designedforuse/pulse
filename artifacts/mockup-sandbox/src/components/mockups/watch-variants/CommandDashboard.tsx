import React, { useState } from 'react';
import { Play } from 'lucide-react';

export default function CommandDashboard() {
  const [activeTab, setActiveTab] = useState('All');

  const SPORT_COLORS: Record<string, string> = {
    Hockey: '#81D4FA',
    Rugby: '#8BC34A',
    Soccer: '#FFC107',
    Basketball: '#FF9800',
    Cricket: '#FFC800',
    Racing: '#E53935',
    Tennis: '#4CAF50',
    Golf: '#A5D6A7',
  };

  const tabs = ['All', 'Hockey', 'Rugby', 'Soccer', 'Basketball'];

  const liveGames = [
    {
      id: 1,
      sport: 'Hockey',
      emoji: '🏒',
      away: 'BOS',
      home: 'TOR',
      awayScore: '3',
      homeScore: '2',
      status: '2nd · 11:42',
      provider: 'ESPN+',
    },
    {
      id: 2,
      sport: 'Rugby',
      emoji: '🏉',
      away: 'CAN',
      home: 'STE',
      awayScore: '24',
      homeScore: '10',
      status: '1H · 43\'',
      provider: 'FloSports',
    },
    {
      id: 3,
      sport: 'Basketball',
      emoji: '🏀',
      away: 'LAL',
      home: 'GSW',
      awayScore: '58',
      homeScore: '61',
      status: '3rd · 4:22',
      provider: 'YouTube TV',
    },
    {
      id: 4,
      sport: 'Cricket',
      emoji: '🏏',
      away: 'IND',
      home: 'AUS',
      awayScore: '-',
      homeScore: '-',
      status: 'In Progress',
      provider: 'Willow/YTTV',
    },
  ];

  const upcomingGames = [
    {
      id: 5,
      sport: 'Soccer',
      away: 'ARS',
      home: 'CHE',
      awayName: 'Arsenal',
      homeName: 'Chelsea',
      time: '7:45 PM',
      provider: 'Peacock',
    },
    {
      id: 6,
      sport: 'Hockey',
      away: 'NYR',
      home: 'WSH',
      awayName: 'Rangers',
      homeName: 'Capitals',
      time: '8:00 PM',
      provider: 'ESPN+',
    },
    {
      id: 7,
      sport: 'Racing',
      away: 'AUS GP',
      home: 'Qual',
      awayName: 'Australian GP',
      homeName: 'Qualifying',
      time: '8:00 PM',
      provider: 'ESPN',
    },
    {
      id: 8,
      sport: 'Rugby',
      away: 'LEI',
      home: 'MUN',
      awayName: 'Leinster',
      homeName: 'Munster',
      time: '9:30 PM',
      provider: 'FloSports',
    },
  ];

  const allEvents = [...liveGames.map(g => ({ ...g, isLive: true })), ...upcomingGames.map(g => ({ ...g, isLive: false }))];

  const filteredEvents = activeTab === 'All' ? allEvents : allEvents.filter(e => e.sport === activeTab);

  return (
    <div
      style={{
        width: '390px',
        minHeight: '820px',
        overflowY: 'auto',
        backgroundColor: '#1C1C1E',
        fontFamily: 'Inter, sans-serif',
        color: '#FFFFFF',
      }}
      className="relative flex flex-col"
    >
      <style>
        {`
          @keyframes livePulse {
            0% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0.4); border-color: rgba(229, 57, 53, 0.6); }
            70% { box-shadow: 0 0 0 4px rgba(229, 57, 53, 0); border-color: rgba(229, 57, 53, 0.2); }
            100% { box-shadow: 0 0 0 0 rgba(229, 57, 53, 0); border-color: #2C2C2E; }
          }
          .pulse-border {
            animation: livePulse 2s infinite;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      {/* Header */}
      <div className="pt-12 pb-4 px-4 flex items-center justify-between bg-[#1C1C1E] sticky top-0 z-20">
        <h1 className="text-xl font-bold tracking-tight">Command Center</h1>
        <button className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-white mx-0.5" />
          <div className="w-1 h-1 rounded-full bg-white mx-0.5" />
          <div className="w-1 h-1 rounded-full bg-white mx-0.5" />
        </button>
      </div>

      {/* Top scoreboard strip */}
      <div className="px-4 mb-6">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {liveGames.map((game) => (
            <div
              key={game.id}
              className="flex-shrink-0 flex flex-col justify-between bg-[#2C2C2E] rounded-lg p-2 relative"
              style={{ width: '90px', height: '64px' }}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs leading-none">{game.emoji}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5 text-[10px] text-gray-400 font-medium uppercase leading-none">
                  <span>{game.away}</span>
                  <span>{game.home}</span>
                </div>
                <div className="flex flex-col gap-0.5 text-xs font-mono font-bold leading-none text-right" style={{ color: SPORT_COLORS[game.sport] }}>
                  <span>{game.awayScore}</span>
                  <span>{game.homeScore}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sport Tab Bar */}
      <div className="px-4 mb-4 border-b border-[#2C2C2E]">
        <div className="flex gap-6 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const accentColor = tab === 'All' ? '#FFFFFF' : SPORT_COLORS[tab] || '#FFFFFF';
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="pb-3 text-sm font-medium transition-colors relative whitespace-nowrap"
                style={{ color: isActive ? '#FFFFFF' : '#8E8E93' }}
              >
                {tab}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{ backgroundColor: accentColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column Grid */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {filteredEvents.map((event) => {
            const isLive = event.isLive;
            const accentColor = SPORT_COLORS[event.sport] || '#FFFFFF';

            return (
              <div
                key={event.id}
                className={\`bg-[#2C2C2E] rounded-lg overflow-hidden flex flex-col \${isLive ? 'border border-[#2C2C2E] pulse-border' : ''}\`}
              >
                {/* Accent Bar */}
                <div className="h-[3px] w-full" style={{ backgroundColor: accentColor }} />
                
                <div className="p-3 flex flex-col h-full gap-2">
                  {/* Top Row: Time/Status + Provider */}
                  <div className="flex justify-between items-center">
                    <span 
                      className={\`text-[10px] font-bold px-1.5 py-0.5 rounded \${isLive ? 'bg-red-500/20 text-red-400' : 'bg-[#1C1C1E] text-gray-400'}\`}
                    >
                      {isLive ? event.status : event.time}
                    </span>
                    <span className="text-[9px] text-gray-500 font-medium truncate ml-2 max-w-[50%] text-right">
                      {event.provider}
                    </span>
                  </div>

                  {/* Teams */}
                  <div className="flex-1 mt-1 flex flex-col gap-1.5">
                    {event.sport === 'Racing' ? (
                      <div className="text-sm font-semibold leading-tight">
                        <span className="block truncate">{event.awayName}</span>
                        <span className="block text-gray-400 truncate">{event.homeName}</span>
                      </div>
                    ) : event.sport === 'Cricket' ? (
                      <div className="text-sm font-semibold leading-tight">
                        <span className="block truncate">{event.away}</span>
                        <span className="block text-gray-400 text-[11px] truncate">vs {event.home}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="truncate pr-2">{isLive ? event.away : event.awayName}</span>
                          {isLive && <span className="font-mono">{event.awayScore}</span>}
                        </div>
                        <div className="flex justify-between items-center text-sm font-semibold">
                          <span className="truncate pr-2">{isLive ? event.home : event.homeName}</span>
                          {isLive && <span className="font-mono">{event.homeScore}</span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
