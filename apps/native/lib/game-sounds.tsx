import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";

type Sound = "scroll" | "open" | "tab" | "card";
const GameSounds = createContext<(sound: Sound) => void>(() => {});

export function GameSoundProvider({ children }: { children: ReactNode }) {
  const scroll = useAudioPlayer(require("../assets/sounds/scroll.wav"));
  const open = useAudioPlayer(require("../assets/sounds/open.wav"));
  const tab = useAudioPlayer(require("../assets/sounds/tab.wav"));
  const card = useAudioPlayer(require("../assets/sounds/card.wav"));

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(
      () => {},
    );
  }, []);

  const play = useCallback(
    (sound: Sound) => {
      const player = { scroll, open, tab, card }[sound];
      void player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => {});
    },
    [scroll, open, tab, card],
  );

  return <GameSounds.Provider value={play}>{children}</GameSounds.Provider>;
}

export const useGameSound = () => useContext(GameSounds);
