import React from "react";
import PlaybookArticle from "@/components/PlaybookArticle";
import Colors from "@/constants/colors";

export default function Racing101Screen() {
  return (
    <PlaybookArticle
      headerTitle="Racing 101"
      accent={Colors.racing}
      badge="RACING 101"
      icon="car-sport"
      title="Formula 1 & World Rally Championship"
      blurb="Motorsport's two pinnacle world championships couldn't be more different — one races wheel-to-wheel on closed circuits at 230 mph, the other sends one car at a time down icy mountain passes and Kenyan savanna. Here's how each season is built and what to watch for."
      sections={[
        {
          title: "Formula 1 — The Circuit Pinnacle",
          emoji: "🏎️",
          intro:
            "24 races across 5 continents. Two drivers per team, ten teams (constructors), two championships up for grabs every season: Drivers' and Constructors'. A race weekend is a layered event, not just Sunday.",
          bullets: [
            "Practice (Fri): three free practice sessions to dial in setup. Practice sessions stay in Live Now — they don't promote to Chaos Mode.",
            "Qualifying (Sat): three knockout rounds (Q1, Q2, Q3) decide Sunday's grid. Q3 is must-watch — 10 drivers fighting for pole on a single lap.",
            "Sprint weekends (6 per year): a shorter Saturday race awarding points, with a separate Sprint Qualifying. Doubles the drama.",
            "Race (Sun): the main event. Strategy (tyres, pit windows, undercut/overcut) decides as much as raw pace.",
          ],
          events: [
            { name: "Monaco GP", meta: "May · 🇲🇨", note: "The crown jewel. Narrowest, slowest circuit on the calendar — and the hardest to overtake on. Qualifying is everything." },
            { name: "British GP", meta: "Jul · 🇬🇧", note: "Silverstone. F1's spiritual home — fastest corners on the calendar (Maggotts/Becketts/Copse)." },
            { name: "Belgian GP", meta: "Jul · 🇧🇪", note: "Spa-Francorchamps. Eau Rouge, the Kemmel Straight, and changing weather across a 7 km circuit." },
            { name: "Italian GP", meta: "Sep · 🇮🇹", note: "Monza. The Temple of Speed — lowest-downforce setup of the year, slipstream battles, Tifosi in red." },
            { name: "Singapore GP", meta: "Sep · 🇸🇬", note: "Night race on city streets. Most physically demanding event of the season for drivers." },
            { name: "Abu Dhabi GP", meta: "Dec · 🇦🇪", note: "Twilight season finale at Yas Marina. Has decided multiple titles on the final lap." },
          ],
          footnote: "Chaos Mode scoring: Race +80, Sprint +40, Qualifying +15. Safety Cars, Red Flags, and final-lap battles auto-promote into Slot 4.",
        },
        {
          title: "World Rally Championship — Stage Racing Across the Planet",
          emoji: "🌍",
          intro:
            "14 rounds, 14 different surfaces, one car on the road at a time. Drivers race against the clock on closed public roads — frozen alpine passes, Saharan dunes, Welsh forest tracks — with only a co-driver reading pace notes beside them.",
          bullets: [
            "Format: each round is 3–4 days of \"special stages\" (timed sections, ~5–35 km each). Stage times add up; lowest cumulative time wins.",
            "Surface variety: Monte Carlo's ice, Sweden's snow, Kenya's gravel, Japan's asphalt. Cars and tyres are reconfigured for each rally.",
            "Co-driver: reads pace notes (\"crest, into 6 right, long, don't cut\") at 100+ mph. The driver doesn't see the road until they're on it.",
            "Manufacturers' championship runs alongside Drivers' — Toyota, Hyundai, and M-Sport Ford are the three current works teams.",
          ],
          events: [
            { name: "Rallye Monte-Carlo", meta: "Jan · 🇲🇨", note: "The season opener. Mixed ice, snow, and dry asphalt — sometimes within a single stage. Tyre choice is a gamble." },
            { name: "Safari Rally Kenya", meta: "Mar · 🇰🇪", note: "The toughest rally in the world. Rough volcanic gravel, river crossings, and wildlife on the road. Finishing is an achievement." },
            { name: "Rally Finland", meta: "Jul–Aug · 🇫🇮", note: "The \"1000 Lakes\" rally. Blind crests, massive jumps, 130+ km/h average stage speeds. The Finnish drivers' home advantage is real." },
            { name: "Acropolis Rally Greece", meta: "Jun · 🇬🇷", note: "Brutal, rock-strewn gravel. Suspension-breaking. A rally where you survive as much as you race." },
            { name: "Rally Saudi Arabia", meta: "Nov · 🇸🇦", note: "Brand-new for 2026 — the season finale. Desert gravel and sand, often deciding the championship." },
          ],
          footnote: "All 14 rounds stream on YouTube TV. Cards open YouTube TV when you tap Watch.",
        },
        {
          title: "How to follow a season",
          emoji: "📺",
          intro:
            "Both championships reward following the standings, not just individual races. A bad weekend can flip a title fight — and the points are designed to make every round matter.",
          bullets: [
            "F1: 25 points for a win, descending to 1 for 10th. Fastest lap bonus (1 pt) only if you finish top 10. Sprint races award 8 down to 1.",
            "WRC: 25 for a stage-rally win, plus bonus \"Super Sunday\" points for the fastest cumulative times on the final day, plus Power Stage points (5 down to 1 for the top 5 fastest on the last stage).",
            "Constructors / Manufacturers: each team's two drivers' points combine. This is what teams really care about — it decides prize money and prestige.",
            "Watch for: F1 strategy calls (pit windows, tyre compounds), WRC weather changes (a dry stage that turns wet mid-rally rearranges the field).",
          ],
        },
      ]}
      footer="F1 is choreographed wheel-to-wheel chess at the highest speeds humans have engineered. WRC is one driver, one co-driver, and a road they've never seen — the purest form of motorsport. Together they bookend what racing can be."
    />
  );
}
