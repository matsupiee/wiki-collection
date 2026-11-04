import { useId } from "react";

// 小さなサイズでも縁の厚みと光沢で表現する、文字や刻印のないコイン。
export function CoinIcon() {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 28 28"
      className="h-6 w-6 shrink-0"
      fill="none"
    >
      <defs>
        <linearGradient
          id={`${id}-edge`}
          x1="4"
          y1="4"
          x2="24"
          y2="27"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f6cc63" />
          <stop offset="0.55" stopColor="#c8871b" />
          <stop offset="1" stopColor="#825016" />
        </linearGradient>
        <linearGradient
          id={`${id}-rim`}
          x1="5"
          y1="3"
          x2="22"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff3bb" />
          <stop offset="0.35" stopColor="#edb83e" />
          <stop offset="0.6" stopColor="#ffe697" />
          <stop offset="1" stopColor="#bc7817" />
        </linearGradient>
        <linearGradient
          id={`${id}-face`}
          x1="7"
          y1="5"
          x2="21"
          y2="23"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffeaa3" />
          <stop offset="0.45" stopColor="#f1bd4d" />
          <stop offset="1" stopColor="#d39425" />
        </linearGradient>
      </defs>
      <ellipse cx="14" cy="25" rx="9" ry="1.5" fill="#795119" opacity="0.15" />
      <circle
        cx="14"
        cy="14.5"
        r="11.5"
        fill={`url(#${id}-edge)`}
        stroke="#a36a19"
        strokeWidth="0.7"
      />
      <path
        d="M6 22v1.5m3 0v1.5m3-1v1.5m3-1v1.5m3-2v1.5m3-3v1.5"
        stroke="#ffe094"
        strokeWidth="0.7"
        opacity="0.7"
      />
      <circle
        cx="13.5"
        cy="12.5"
        r="11"
        fill={`url(#${id}-rim)`}
        stroke="#c28a25"
        strokeWidth="0.7"
      />
      <circle
        cx="13.5"
        cy="12.5"
        r="8.1"
        fill={`url(#${id}-face)`}
        stroke="#b77c1e"
        strokeWidth="0.9"
      />
      <circle cx="13.5" cy="12.5" r="7.2" stroke="#ffe8a0" strokeWidth="0.6" />
      <path
        d="M5.2 9.2a9 9 0 0 1 10.4-5.4"
        stroke="#fff8d8"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
