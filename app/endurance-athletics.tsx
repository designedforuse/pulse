import React from "react";
import PlaybookArticle from "@/components/PlaybookArticle";
import Colors from "@/constants/colors";

export default function EnduranceAthleticsScreen() {
  return (
    <PlaybookArticle
      headerTitle="Endurance Athletics"
      accent={Colors.athletics}
      badge="ATHLETICS 101"
      icon="walk-outline"
      title="The Running & Track Circuits"
      blurb="Athletics splits into a few distinct elite series — road marathons, trail/ultra, and pure track & field. Here's what each one is, who shows up, and where to watch."
      sections={[
        {
          title: "World Marathon Majors",
          emoji: "🏁",
          intro:
            "Seven marathons that together form the most prestigious road-running circuit on the planet. The world's best chase prize money, course records, and Abbott Six Star status (finishing all six core majors).",
          events: [
            { name: "Tokyo Marathon", meta: "Mar · 🇯🇵" },
            { name: "Boston Marathon", meta: "Apr · 🇺🇸", note: "The oldest annual marathon (since 1897). Requires a qualifying time." },
            { name: "London Marathon", meta: "Apr · 🇬🇧" },
            { name: "Sydney Marathon", meta: "Aug · 🇦🇺", note: "Newest Major, added in 2025." },
            { name: "Berlin Marathon", meta: "Sep · 🇩🇪", note: "Flat, fast — most men's world records have been set here." },
            { name: "Chicago Marathon", meta: "Oct · 🇺🇸" },
            { name: "New York City Marathon", meta: "Nov · 🇺🇸", note: "Largest marathon in the world by finishers." },
          ],
          footnote: "Streamed on FloSports in the US.",
        },
        {
          title: "Comrades Marathon",
          emoji: "🇿🇦",
          intro:
            "South Africa's iconic ~89 km ultramarathon between Pietermaritzburg and Durban — one of the oldest and largest ultras in the world, run since 1921 in memory of WWI soldiers. Around 20,000 entrants chase a finisher's medal under a strict 12-hour cutoff.",
          events: [
            {
              name: "Comrades Marathon",
              meta: "Jun · 🇿🇦",
              note: "Alternates yearly between the 'Up Run' (Durban → PMB, net climb) and the 'Down Run' (PMB → Durban). 2026 is the 99th edition — a Down Run on Sun Jun 14.",
            },
          ],
          bullets: [
            "12-hour cutoff — a gun is fired at the finish line and no one is allowed past, one of the most dramatic moments in distance running.",
            "Tiered medals: Gold (top 10), Wally Hayward, Silver, Bill Rowan, Robert Mtshali, Bronze, Vic Clapham — your finish time, not just the fact you finished, defines your race.",
            "Big climbs to know: Polly Shortts, Inchanga, Botha's Hill, Fields Hill.",
          ],
          footnote: "Streamed live on YouTube via the official Comrades channels (12 hours of continuous coverage).",
        },
        {
          title: "Wanda Diamond League",
          emoji: "🏟️",
          intro:
            "Track & field's top one-day-meet series. Each meet hosts the world's best in a curated set of events, and the season climaxes with the two-day Diamond League Final.",
          bullets: [
            "14 qualifying meets across Europe, Asia, North America, and Africa.",
            "Athletes earn points per event; top scorers qualify for the Brussels Final.",
            "Sprints, distance, hurdles, jumps, throws — typically one or two of each per meet.",
          ],
          events: [
            { name: "Doha · Shanghai · Xiamen · Rabat", meta: "Apr–May" },
            { name: "Rome · Stockholm · Oslo · Paris", meta: "Jun" },
            { name: "Eugene · Monaco · London", meta: "Jul" },
            { name: "Lausanne · Silesia · Zurich", meta: "Aug" },
            { name: "Brussels Final", meta: "Sep · 🇧🇪", note: "Two-day showcase decides Diamond Trophy winners." },
          ],
          footnote: "Streamed on FloSports in the US.",
        },
        {
          title: "Golden Trail World Series",
          emoji: "🏔️",
          intro:
            "The premier short-course mountain & trail-running circuit. Distances are typically 25–50 km on technical mountain courses — fast, runnable, and TV-friendly compared to ultra-distance trail racing.",
          events: [
            { name: "Zegama-Aizkorri", meta: "May · 🇪🇸", note: "The legendary mud-and-mist mountain race in the Basque Country." },
            { name: "Ledro Sky Trentino", meta: "May · 🇮🇹" },
            { name: "Quebec Mega Trail", meta: "Jul · 🇨🇦" },
            { name: "Pitz Alpine Glacier Trail", meta: "Aug · 🇦🇹" },
            { name: "Sierre-Zinal", meta: "Aug · 🇨🇭", note: "Iconic Alpine race, runs since 1974." },
            { name: "Myoko Trail", meta: "Sep · 🇯🇵" },
            { name: "Jinshanling Great Wall Trail Race", meta: "Sep · 🇨🇳", note: "On the actual Great Wall." },
            { name: "Muju Trail Grand Finale", meta: "Oct · 🇰🇷", note: "Two-day finale decides the season title." },
          ],
          footnote: "All races stream on FloSports.",
        },
        {
          title: "UTMB World Series",
          emoji: "🌄",
          intro:
            "Ultra-trail racing — distances from 50K up to 170+ km in a single push. Runners earn 'Running Stones' at qualifying events to enter the season-ending UTMB Mont-Blanc.",
          events: [
            { name: "Ultra-Trail Australia", meta: "May · 🇦🇺" },
            { name: "Val d'Aran", meta: "Jul · 🇪🇸" },
            { name: "Verbier St-Bernard · Monte Rosa-Walser", meta: "Jul · 🇨🇭🇮🇹" },
            { name: "UTMB Mont-Blanc", meta: "Aug · 🇫🇷🇮🇹🇨🇭", note: "The world championship of ultra-trail. 171 km, three countries, ~10,000m of climbing." },
            { name: "Wildstrubel · Nice Côte d'Azur", meta: "Sep · 🇨🇭🇫🇷" },
            { name: "Kodiak Ultra Marathons · Chiang Mai", meta: "Oct–Nov · 🇺🇸🇹🇭" },
          ],
          footnote: "Streamed on FloSports in the US.",
        },
      ]}
      footer="The road majors decide who's the fastest marathoner; Diamond League ranks the world's track stars; Golden Trail and UTMB cover the short and long ends of the mountain-running spectrum."
    />
  );
}
