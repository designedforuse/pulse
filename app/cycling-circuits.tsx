import React from "react";
import PlaybookArticle from "@/components/PlaybookArticle";
import Colors from "@/constants/colors";

export default function CyclingCircuitsScreen() {
  return (
    <PlaybookArticle
      headerTitle="Cycling Circuits"
      accent={Colors.cycling}
      badge="CYCLING 101"
      icon="bicycle"
      title="The Pro Cycling Calendar"
      blurb="Cycling's elite season is anchored by three Grand Tours on the road and a small handful of marquee mountain-bike stage races. Here's what we track and why it matters."
      sections={[
        {
          title: "Grand Tours — the Big Three",
          emoji: "🚴",
          intro:
            "Three-week stage races held every year on the World Tour. Winning one is a career achievement; winning all three in a single career is rarer still. Each one has its own personality.",
          events: [
            { name: "Giro d'Italia", meta: "May", note: "Italian Grand Tour. Climbs in the Dolomites, pink leader's jersey (maglia rosa)." },
            { name: "Tour de France", meta: "Jul", note: "The biggest race on the planet. Yellow jersey, Alpe d'Huez, Champs-Élysées finish." },
            { name: "Vuelta a España", meta: "Aug–Sep", note: "Spanish Grand Tour. Brutal short, steep climbs and late-season form battles." },
          ],
          footnote: "All three broadcast in the US on FloSports (Peacock for Tour de France).",
        },
        {
          title: "Epic Series — Mountain Bike Stage Racing",
          emoji: "⛰️",
          intro:
            "A global circuit of multi-day mountain-bike stage races riders enter in pairs. Think 'Tour de France in the dirt' — riders camp on-site, race 4–8 stages, and the team must finish together each day.",
          bullets: [
            "Pairs format: both riders must cross the line within 2 minutes of each other or risk time penalties.",
            "Cape Epic is the crown jewel — known as the 'Tour de France of mountain biking'.",
            "Stages mix singletrack, fire road, and brutal climbing in remote terrain.",
          ],
          events: [
            { name: "Absa Cape Epic", meta: "Mar · 🇿🇦", note: "8 days across the Western Cape. The original and most prestigious." },
            { name: "4Islands Epic", meta: "Apr · 🇭🇷", note: "Island-hopping across the Croatian Adriatic." },
            { name: "Andorra Epic Pyrenees", meta: "Jul · 🇦🇩", note: "High-altitude racing in the Pyrenees." },
            { name: "Swiss Epic", meta: "Aug · 🇨🇭", note: "Alpine singletrack through Graubünden." },
            { name: "FNB Wines2Whales", meta: "Nov · 🇿🇦", note: "Cape Town to Hermanus — wine country to whale coast." },
          ],
          footnote: "All Epic Series races stream on FloSports.",
        },
      ]}
      footer="The road Grand Tours decide cycling's overall pecking order; the Epic Series is where MTB pros and elite amateurs measure themselves against the world's hardest backcountry courses."
    />
  );
}
