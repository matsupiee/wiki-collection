import { useEffect, useState } from "react";

// 残り時間の表示用。interval ミリ秒ごとに現在時刻を更新する
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}
