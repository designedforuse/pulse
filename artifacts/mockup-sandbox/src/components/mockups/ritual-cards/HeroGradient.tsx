import { useState } from "react";

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

interface RitualData {
  id: string;
  label: string;
  context: string;
  sports: string[];
  timeLabel: string;
  eventCount: number;
  featured: {
    league: string;
    sport: string;
    awayTeam: string;
    homeTeam: string;
    awayLogo: string | null;
    homeLogo: string | null;
    awayAbbr: string;
    homeAbbr: string;
    time: string;
  } | null;
}

const RITUALS: RitualData[] = [
  {
    id: "saturday_spotlight",
    label: "Saturday Game Day",
    context: "w/ family",
    sports: ["hockey", "basketball", "soccer"],
    timeLabel: "Sat · 4–8 PM",
    eventCount: 8,
    featured: {
      league: "NHL",
      sport: "hockey",
      awayTeam: "Boston Bruins",
      homeTeam: "Montreal Canadiens",
      awayLogo: "https://a.espncdn.com/i/teamlogos/nhl/500/bos.png",
      homeLogo: "https://a.espncdn.com/i/teamlogos/nhl/500/mtl.png",
      awayAbbr: "BOS",
      homeAbbr: "MTL",
      time: "6:00 PM",
    },
  },
  {
    id: "sunday_session",
    label: "Sunday Coffee & Chill",
    context: "alone",
    sports: ["rugby", "cricket", "soccer"],
    timeLabel: "Sun · 6 AM–Noon",
    eventCount: 5,
    featured: {
      league: "URC",
      sport: "rugby",
      awayTeam: "Leinster",
      homeTeam: "Munster",
      awayLogo: null,
      homeLogo: null,
      awayAbbr: "LEI",
      homeAbbr: "MUN",
      time: "8:30 AM",
    },
  },
  {
    id: "friday_after_hours",
    label: "Friday Night Mode",
    context: "w/ friends",
    sports: ["rugby", "cricket"],
    timeLabel: "Fri · 9 PM–Midnight",
    eventCount: 3,
    featured: {
      league: "IPL",
      sport: "cricket",
      awayTeam: "Mumbai Indians",
      homeTeam: "Chennai Super Kings",
      awayLogo: null,
      homeLogo: null,
      awayAbbr: "MI",
      homeAbbr: "CSK",
      time: "9:30 PM",
    },
  },
];

function shortTeam(name: string): string {
  const parts = name.split(" ");
  return parts[parts.length - 1];
}

function TeamLogo({
  url,
  abbr,
  sportColor,
  size = 20,
}: {
  url: string | null;
  abbr: string;
  sportColor: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={abbr}
        width={size}
        height={size}
        className="object-contain shrink-0"
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-[8px] font-black"
      style={{
        width: size,
        height: size,
        backgroundColor: sportColor + "25",
        color: sportColor,
        border: `1px solid ${sportColor}40`,
        letterSpacing: "-0.5px",
      }}
    >
      {abbr.slice(0, 3)}
    </div>
  );
}

function RitualCard({ ritual }: { ritual: RitualData }) {
  const primaryColor = "#35C7A5";
  const featuredSportColor = ritual.featured ? (SPORT_COLORS[ritual.featured.sport] ?? "#90A4AE") : primaryColor;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(145deg, ${primaryColor}22 0%, #16181c 55%)`,
        border: `1.5px solid ${primaryColor}35`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}70, transparent)` }}
      />

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-[19px] font-bold text-white leading-tight tracking-tight">
              {ritual.label}
            </p>
            <p className="text-[12px] mt-1" style={{ color: primaryColor + "cc" }}>
              {ritual.timeLabel} · {ritual.context}
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
            style={{ backgroundColor: primaryColor + "20", border: `1px solid ${primaryColor}40` }}
          >
            <span className="text-[15px] font-bold" style={{ color: primaryColor }}>
              {ritual.eventCount}
            </span>
            <span className="text-[11px] font-medium" style={{ color: primaryColor + "99" }}>
              games
            </span>
          </div>
        </div>

        <div className="flex flex-row gap-1.5 mb-3">
          {ritual.sports.map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: SPORT_COLORS[s] ?? "#444" }}
            />
          ))}
        </div>

        {ritual.featured ? (
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: "rgba(0,0,0,0.35)", border: `1px solid ${featuredSportColor}25` }}
          >
            <div className="flex-1 min-w-0">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ backgroundColor: featuredSportColor + "30", color: featuredSportColor }}
              >
                {ritual.featured.league}
              </span>
              <div className="flex items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamLogo
                    url={ritual.featured.awayLogo}
                    abbr={ritual.featured.awayAbbr}
                    sportColor={featuredSportColor}
                    size={20}
                  />
                  <span className="text-[14px] font-semibold text-white truncate">
                    {shortTeam(ritual.featured.awayTeam)}
                  </span>
                  <span className="text-zinc-500 text-[12px] font-normal shrink-0">vs</span>
                  <span className="text-[14px] font-semibold text-white truncate">
                    {shortTeam(ritual.featured.homeTeam)}
                  </span>
                  <TeamLogo
                    url={ritual.featured.homeLogo}
                    abbr={ritual.featured.homeAbbr}
                    sportColor={featuredSportColor}
                    size={20}
                  />
                </div>
                <p className="text-[13px] font-semibold text-white shrink-0">{ritual.featured.time}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-3 text-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
            <p className="text-[12px] text-zinc-600">No featured game this week</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function HeroGradient() {
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
