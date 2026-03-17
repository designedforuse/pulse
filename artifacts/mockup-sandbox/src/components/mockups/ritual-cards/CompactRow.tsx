const SPORT_COLORS: Record<string, string> = {
  hockey: "#1CB0F6",
  rugby: "#FF9600",
  cricket: "#FFC800",
  soccer: "#35C7A5",
  basketball: "#FF4B4B",
  tennis: "#CE82FF",
  racing: "#E53935",
  golf: "#22C55E",
  athletics: "#FF6B00",
};

const SPORT_ICONS: Record<string, string> = {
  hockey: "🏒",
  rugby: "🏉",
  cricket: "🏏",
  soccer: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  racing: "🏎",
  golf: "⛳",
  athletics: "🏃",
};

interface RitualData {
  id: string;
  label: string;
  sports: string[];
  timeLabel: string;
  eventCount: number;
  isActive: boolean;
  featured: {
    league: string;
    sport: string;
    awayTeam: string;
    homeTeam: string;
    time: string;
    isLive?: boolean;
  } | null;
}

const RITUALS: RitualData[] = [
  {
    id: "saturday_sunrise",
    label: "Saturday Warm-Up",
    sports: ["rugby", "cricket", "soccer", "racing"],
    timeLabel: "Sat · 6 AM–Noon",
    eventCount: 7,
    isActive: true,
    featured: {
      league: "URC",
      sport: "rugby",
      awayTeam: "Leinster",
      homeTeam: "Munster",
      time: "Live",
      isLive: true,
    },
  },
  {
    id: "saturday_spotlight",
    label: "Saturday Game Day",
    sports: ["hockey", "basketball", "soccer"],
    timeLabel: "Sat · 4–8 PM",
    eventCount: 8,
    isActive: false,
    featured: {
      league: "NHL",
      sport: "hockey",
      awayTeam: "Boston Bruins",
      homeTeam: "Montreal Canadiens",
      time: "6:00 PM",
    },
  },
  {
    id: "saturday_after",
    label: "Saturday Extra Time",
    sports: ["hockey", "basketball", "soccer", "rugby", "cricket"],
    timeLabel: "Sat · 8 PM–Midnight",
    eventCount: 4,
    isActive: false,
    featured: {
      league: "NBA",
      sport: "basketball",
      awayTeam: "LA Lakers",
      homeTeam: "Golden State Warriors",
      time: "8:30 PM",
    },
  },
  {
    id: "sunday_session",
    label: "Sunday Coffee & Chill",
    sports: ["rugby", "cricket", "soccer"],
    timeLabel: "Sun · 6 AM–Noon",
    eventCount: 5,
    isActive: false,
    featured: {
      league: "IPL",
      sport: "cricket",
      awayTeam: "Mumbai Indians",
      homeTeam: "Chennai Super Kings",
      time: "9:00 AM",
    },
  },
  {
    id: "friday_lights",
    label: "Family Game Night",
    sports: ["hockey", "basketball", "soccer"],
    timeLabel: "Fri · 6–9 PM",
    eventCount: 0,
    isActive: false,
    featured: null,
  },
  {
    id: "friday_after",
    label: "Friday Night Mode",
    sports: ["rugby", "cricket"],
    timeLabel: "Fri · 9 PM–Midnight",
    eventCount: 0,
    isActive: false,
    featured: null,
  },
];

function getPrimaryColor(sports: string[]): string {
  return SPORT_COLORS[sports[0]] ?? "#90A4AE";
}

function shortTeam(name: string): string {
  const parts = name.split(" ");
  return parts[parts.length - 1];
}

function RitualRow({ ritual }: { ritual: RitualData }) {
  const primaryColor = getPrimaryColor(ritual.sports);
  const hasEvents = ritual.eventCount > 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        backgroundColor: ritual.isActive ? primaryColor + "12" : "#1E2028",
        border: `1.5px solid ${ritual.isActive ? primaryColor + "50" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: ritual.isActive ? primaryColor : "rgba(255,255,255,0.15)",
            boxShadow: ritual.isActive ? `0 0 6px ${primaryColor}` : "none",
          }}
        />

        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] font-bold leading-tight truncate"
            style={{ color: ritual.isActive ? "#fff" : "rgba(255,255,255,0.85)" }}
          >
            {ritual.label}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-zinc-500">{ritual.timeLabel}</p>
            <div className="flex gap-1">
              {ritual.sports.slice(0, 4).map((s) => (
                <span key={s} className="text-[10px]">{SPORT_ICONS[s]}</span>
              ))}
              {ritual.sports.length > 4 && (
                <span className="text-[10px] text-zinc-600">+{ritual.sports.length - 4}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasEvents ? (
            <div
              className="px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: primaryColor + (ritual.isActive ? "30" : "18") }}
            >
              <span className="text-[13px] font-bold" style={{ color: primaryColor }}>
                {ritual.eventCount}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-600">—</span>
          )}
          <svg className="w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {ritual.featured && (
        <div
          className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{
            backgroundColor: "rgba(0,0,0,0.3)",
            border: `1px solid ${SPORT_COLORS[ritual.featured.sport] ?? "#444"}25`,
          }}
        >
          <span
            className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: (SPORT_COLORS[ritual.featured.sport] ?? "#444") + "25",
              color: SPORT_COLORS[ritual.featured.sport] ?? "#aaa",
            }}
          >
            {ritual.featured.league}
          </span>
          <p className="flex-1 text-[12px] font-semibold text-white truncate">
            {shortTeam(ritual.featured.awayTeam)}{" "}
            <span className="text-zinc-500 font-normal text-[11px]">vs</span>{" "}
            {shortTeam(ritual.featured.homeTeam)}
          </p>
          {ritual.featured.isLive ? (
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-bold text-red-400">LIVE</span>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-500 shrink-0">{ritual.featured.time}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function CompactRow() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-6" style={{ backgroundColor: "#111215" }}>
      <div className="w-full max-w-sm flex flex-col gap-2">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-1">Rituals</p>
        {RITUALS.map((r) => (
          <RitualRow key={r.id} ritual={r} />
        ))}
      </div>
    </div>
  );
}
