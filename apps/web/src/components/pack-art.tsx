import { cn } from "@wiki-collection/ui/lib/utils";

// パックの絵柄。上下の縁はギザギザに切り、表面に銀色の光沢を流す
export function PackArt({
  name,
  colorHex,
  label,
  className,
}: {
  name: string;
  colorHex: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("pack-crimp relative aspect-[5/8] w-40 overflow-hidden shadow-2xl", className)}
      style={{
        background: `linear-gradient(160deg, ${colorHex} 0%, ${colorHex}cc 40%, #1e1b4b 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 70% 30%, #ffffff 0 2px, transparent 3px), radial-gradient(circle at 20% 70%, #ffffff 0 1px, transparent 2px), radial-gradient(circle at 50% 50%, ${colorHex}00, #ffffff55 70%, transparent 71%)`,
          backgroundSize: "40px 40px, 30px 30px, 100% 100%",
        }}
      />
      <div aria-hidden className="pack-shine absolute inset-0" />
      <div className="relative flex h-full flex-col items-center justify-between px-3 py-[12%] text-white">
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.6em] font-bold tracking-widest backdrop-blur">
          WIKI COLLECTION
        </span>
        <span className="text-center text-[1.6em] leading-tight font-black drop-shadow-[0_3px_0_rgba(0,0,0,0.25)]">
          {name}
        </span>
        {label ? (
          <span
            className="rounded-full bg-white px-3 py-0.5 text-[0.7em] font-extrabold"
            style={{ color: colorHex }}
          >
            {label}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
