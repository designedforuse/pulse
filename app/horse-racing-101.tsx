import React from "react";
import PlaybookArticle from "@/components/PlaybookArticle";
import Colors from "@/constants/colors";

export default function HorseRacing101Screen() {
  return (
    <PlaybookArticle
      headerTitle="Horse Racing"
      accent={Colors["horse-racing"]}
      badge="HORSE RACING 101"
      icon="ribbon"
      title="The US Triple Crown"
      blurb="American thoroughbred racing's biggest stage. Three races, five weeks, one shot per horse — they only run as 3-year-olds, so a career-defining sweep is rare and a true Triple Crown winner is generational news."
      sections={[
        {
          title: "Why the Triple Crown matters",
          emoji: "🏆",
          intro:
            "A Triple Crown winner takes all three classic dirt races in a single spring. Only 13 horses have ever done it. Between Affirmed (1978) and American Pharoah (2015), there was a 37-year drought.",
          bullets: [
            "Only open to 3-year-old thoroughbreds — a horse has exactly one shot in its lifetime.",
            "All three races are run at different tracks, distances, and surfaces in just 5 weeks.",
            "The combination of speed, stamina, and recovery required is what makes the sweep so rare.",
          ],
        },
        {
          title: "The three Classics",
          emoji: "🐎",
          events: [
            {
              name: "Kentucky Derby",
              meta: "1st Sat May · 🇺🇸",
              note: "Churchill Downs, Louisville. 1¼ miles. 'The most exciting two minutes in sports'. Largest field (20) — pace and post position are everything.",
            },
            {
              name: "Preakness Stakes",
              meta: "3rd Sat May · 🇺🇸",
              note: "Pimlico Race Course, Baltimore. 1 3/16 miles. Two weeks after the Derby — a quick turnaround that punishes anything but a fully-recovered horse.",
            },
            {
              name: "Belmont Stakes",
              meta: "Early Jun · 🇺🇸",
              note: "Belmont Park, New York. 1½ miles — 'the Test of the Champion'. The longest of the three and where Triple Crown bids most often die.",
            },
          ],
          footnote: "All three air on NBC / Peacock in the US.",
        },
        {
          title: "How to read a race card",
          emoji: "📋",
          bullets: [
            "Post position: starting gate number. Inside posts (1–4) are usually preferred at shorter distances.",
            "Morning line: the track handicapper's pre-race odds estimate, not the final betting odds.",
            "Furlongs: 1 furlong = ⅛ mile. A 'mile and a quarter' race is 10 furlongs.",
            "Trifecta / Exacta: predicting the top 3 / top 2 finishers in exact order.",
          ],
        },
      ]}
      footer="Most years, the Triple Crown story is about how a Derby winner is beaten in Baltimore or how a long-shot grinder shows up in New York — that's where the drama lives."
    />
  );
}
