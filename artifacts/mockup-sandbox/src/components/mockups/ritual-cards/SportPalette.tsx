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
  icon: string;
  sports: string[];
  timeLabel: string;
  eventCount: number;
  featured: {
    league: string;
    sport: string;
    awayTeam: string;
    homeTeam: string;
    time: string;
  } | null;
}

const RITUALS: RitualData[] = [
  {
    id: "saturday_spotlight",
    label: "Saturday Game Day",
    icon: "☀️",
    sports: ["hockey", "basketball", "soccer"],
    timeLabel: "Sat 4–8 PM",
    eventCount: 8,
    featured: {
      league: "NHL",
      sport: "hockey",
      awayTeam: "Boston Bruins",
      homeTeam: "Montreal Canadiens",
      time: "6:00 PM",
    },
  },
  {
    id: "sunday_session",
    label: "Sunday Coffee & Chill",
    icon: "☕",
    sports: ["rugby", "cricket", "soccer"],
    timeLabel: "Sun 6 AM–Noon",
    eventCount: 5,
    featured: {
      league: "URC",
      sport: "rugby",
      awayTeam: "Leinster",
      homeTeam: "Munster",
      time: "8:30 AM",
    },
  },
  {
    id: "friday_after_hours",
    label: "Friday Night Mode",
    icon: "🌙",
    sports: ["rugby", "cricket"],
    timeLabel: "Fri 9 PM–Midnight",
    eventCount: 3,
    featured: {
      league: "IPL",
      sport: "cricket",
      awayTeam: "Mumbai Indians",
      homeTeam: "Chennai Super Kings",
      time: "9:30 PM",
    },
  },
];

function getPrimaryColor(sports: string[]): string {
  return SPORT_COLORS[sports[0]] ?? "#90A4AE";
}

function shortTeam(name: string): string {
  const parts = name.split(" ");
  return parts[parts.length - 1];
}

function RitualCard({ ritual }: { ritual: RitualData }) {
  const primaryColor = getPrimaryColor(ritual.sports);

  return (
    <div
      className="relative overflow-hidden flex flex-row rounded-[20px] border"
      style={{
        backgroundColor: "#1E2028",
        borderColor: primaryColor + "40",
        borderWidth: "1.5px",
      }}
    >
      <div className="w-[5px] shrink-0" style={{ backgroundColor: primaryColor }} />

      <div className="flex-1 py-4 px-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: primaryColor + "20" }}
          >
            {ritual.icon}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-bold text-white leading-tight mb-0.5 tracking-tight">
              {ritual.label}
            </p>
            <p className="text-[11px] text-zinc-500">{ritual.timeLabel}</p>
          </div>

          <div
            className="min-w-[32px] h-8 rounded-full flex items-center justify-center px-2 shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="text-[15px] font-bold text-white leading-none">
              {ritual.eventCount}
            </span>
          </div>
        </div>

        <div className="flex flex-row gap-1.5 mt-3 flex-wrap">
          {ritual.sports.map((s) => (
            <div
              key={s}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                backgroundColor: SPORT_COLORS[s] + "18",
                color: SPORT_COLORS[s],
                border: `1px solid ${SPORT_COLORS[s]}30`,
              }}
            >
              <span>{SPORT_ICONS[s]}</span>
              <span className="capitalize tracking-wide">{s}</span>
            </div>
          ))}
        </div>

        {ritual.featured ? (
          <div
            className="mt-3 pt-3 flex items-center gap-2"
            style={{ borderTop: `1px solid ${primaryColor}25` }}
          >
            <div
              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shrink-0"
              style={{ backgroundColor: SPORT_COLORS[ritual.featured.sport] }}
            >
              {ritual.featured.league}
            </div>
            <p className="flex-1 text-[13px] font-semibold text-white min-w-0 truncate">
              {shortTeam(ritual.featured.awayTeam)}{" "}
              <span className="text-zinc-500 font-normal">vs</span>{" "}
              {shortTeam(ritual.featured.homeTeam)}
            </p>
            <span className="text-[12px] text-zinc-400 shrink-0">
              {ritual.featured.time}
            </span>
          </div>
        ) : (
          <p className="mt-3 pt-3 text-[12px] text-zinc-600" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            No featured game this week
          </p>
        )}
      </div>
    </div>
  );
}

export function SportPalette() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-6" style={{ backgroundColor: "#111215" }}>
      <div className="w-full max-w-sm flex flex-col gap-3">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-1">Rituals</p>
        {RITUALS.map((r) => (
          <RitualCard key={r.id} ritual={r} />
        ))}
      </div>
    </div>
  );
}
