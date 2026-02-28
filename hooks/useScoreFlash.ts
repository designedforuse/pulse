import { useRef, useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

export function useScoreFlash(awayScore?: number, homeScore?: number, cricketAway?: string, cricketHome?: string) {
  const prevAway = useRef<number | undefined>(undefined);
  const prevHome = useRef<number | undefined>(undefined);
  const prevCricketAway = useRef<string | undefined>(undefined);
  const prevCricketHome = useRef<string | undefined>(undefined);
  const flashOpacity = useSharedValue(0);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (awayScore === undefined && homeScore === undefined && !cricketAway && !cricketHome) return;

    if (!isInitialized.current) {
      prevAway.current = awayScore;
      prevHome.current = homeScore;
      prevCricketAway.current = cricketAway;
      prevCricketHome.current = cricketHome;
      isInitialized.current = true;
      return;
    }

    const changed =
      (prevAway.current !== undefined && awayScore !== prevAway.current) ||
      (prevHome.current !== undefined && homeScore !== prevHome.current) ||
      (prevCricketAway.current !== undefined && cricketAway !== prevCricketAway.current) ||
      (prevCricketHome.current !== undefined && cricketHome !== prevCricketHome.current);

    if (changed) {
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) }),
        withDelay(100, withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) })),
        withTiming(0, { duration: 150, easing: Easing.in(Easing.ease) }),
        withDelay(100, withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) })),
        withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
      );
    }

    prevAway.current = awayScore;
    prevHome.current = homeScore;
    prevCricketAway.current = cricketAway;
    prevCricketHome.current = cricketHome;
  }, [awayScore, homeScore, cricketAway, cricketHome]);

  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor:
      flashOpacity.value > 0
        ? `rgba(0, 230, 118, ${flashOpacity.value * 0.15})`
        : "transparent",
  }));

  return flashStyle;
}
