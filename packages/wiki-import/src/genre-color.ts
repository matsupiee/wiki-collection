// ジャンルの色を Wikidata の ID から決める。同じ ID はいつも同じ色になる。
// 黄金角ずつ色相をずらし、隣り合う ID の色が似ないようにする。白い文字を載せても読める濃さにする
export function genreColor(slug: string): string {
  const n = Number(slug.replace(/^\D+/, "")) || 0;
  const hue = (n * 137.508) % 360;
  return hslToHex(hue, 0.65, 0.42);
}

function hslToHex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const channel = (k: number) => {
    const t = (k + h / 30) % 12;
    const value = l - a * Math.max(-1, Math.min(t - 3, 9 - t, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
