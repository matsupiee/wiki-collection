// 淡いゴールドと控えめな縁で表現する、文字や刻印のないコイン。
export function CoinIcon() {
  return (
    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center">
      <span className="relative block h-[22px] w-[22px] rounded-full border border-[#d5aa52] bg-gradient-to-br from-[#ffe8a3] to-[#f2cc74] shadow-[0_2px_0_#c3943e]">
        <span className="absolute inset-[3px] rounded-full border border-[#d5aa52]/50" />
      </span>
    </span>
  );
}
