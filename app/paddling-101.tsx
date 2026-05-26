import React from "react";
import PlaybookArticle from "@/components/PlaybookArticle";
import Colors from "@/constants/colors";

export default function Paddling101Screen() {
  return (
    <PlaybookArticle
      headerTitle="Paddling"
      accent={Colors.paddling}
      badge="PADDLING 101"
      icon="boat"
      title="Canoe Marathons & River Racing"
      blurb="Paddle sport's most famous endurance races happen on rivers, not in stadiums. Right now we track South Africa's legendary 'Big Three' canoe marathons — three multi-day races that are to canoeing what the Grand Tours are to cycling."
      sections={[
        {
          title: "SA Big Three — South Africa's Canoeing Crown",
          emoji: "🛶",
          intro:
            "Three multi-day canoe marathons that together form the unofficial triple crown of South African paddling. Win all three in a single calendar year and you've achieved something only a handful of paddlers ever have.",
          events: [
            {
              name: "Dusi Canoe Marathon",
              meta: "Feb · 🇿🇦",
              note: "120 km over 3 days, Pietermaritzburg → Durban. Famous for its long portages — paddlers run with the boat on their shoulders between river sections. Run since 1951.",
            },
            {
              name: "Berg River Canoe Marathon",
              meta: "Jul · 🇿🇦",
              note: "240 km over 4 days, Paarl → Velddrif on the West Coast. The longest and most weather-exposed of the three — winter conditions, headwinds, and a punishing daily distance.",
            },
            {
              name: "Fish River Canoe Marathon",
              meta: "Oct · 🇿🇦",
              note: "82 km over 2 days at Cradock. The fastest and most technical — released dam water creates artificial rapids, so the race is essentially a high-speed whitewater sprint.",
            },
          ],
          footnote: "Live streams on YouTube via the race channels and Canoeing South Africa.",
        },
        {
          title: "How a Canoe Marathon Actually Works",
          emoji: "🌊",
          intro:
            "These aren't sprint races. Each stage is hours long, ranked on cumulative time across all days, and includes a mix of flat water, rapids, and overland portages.",
          bullets: [
            "K1 (single) and K2 (doubles) — the two most-contested classes. K2 teams have to stay together the whole race.",
            "Portaging — when the river runs out or a rapid is too dangerous, paddlers carry the boat. Strong runners often gain minutes here.",
            "Seeding batches — top contenders start in the front batch (A-batch); slower paddlers go in later batches to keep the river uncluttered.",
            "Cumulative time wins — like a cycling Grand Tour, the leader of the overall race wears the yellow bib heading into the final day.",
          ],
        },
        {
          title: "What to Watch For",
          emoji: "👀",
          bullets: [
            "Andy Birkett, Hank McGregor, and the next generation of SA paddlers chasing the Big Three sweep.",
            "Water levels — a high Dusi or a low Fish completely changes the race. Pre-race release announcements matter.",
            "Day 1 leaders vs Day 3 winners — the Berg in particular rewards paddlers who pace themselves across all four days.",
          ],
        },
      ]}
      footer="The Big Three are the global benchmark for canoe marathon racing. If you've only watched flatwater sprint kayaking at the Olympics, these are something different — long-form river racing where strategy, fitness, and reading the water all matter as much as raw speed."
    />
  );
}
