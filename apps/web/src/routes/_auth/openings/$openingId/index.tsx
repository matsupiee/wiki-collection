import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Rarity } from "@wiki-collection/db/enums";
import { cn } from "@wiki-collection/ui/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type PointerEvent, useEffect, useRef, useState } from "react";

import { PackArt } from "@/components/pack-art";
import { RarityMarks } from "@/components/rarity-marks";
import { Sparkles } from "@/components/sparkles";
import { WikiCard } from "@/components/wiki-card";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/openings/$openingId/")({
  component: OpeningPage,
});

type Stage = "loading" | "pack" | "torn" | "cards";

const TEAR_THRESHOLD = 0.9;

const backgroundByRarity: Record<Rarity, string> = {
  common: "bg-gradient-to-b from-indigo-300 via-violet-200 to-sky-100",
  uncommon: "bg-gradient-to-b from-indigo-300 via-violet-200 to-teal-100",
  rare: "bg-gradient-to-b from-violet-400 via-fuchsia-200 to-sky-100",
  double_rare: "rainbow-bg",
  legendary: "bg-gradient-to-b from-amber-300 via-yellow-100 to-orange-200",
};

// 開封の演出。結果はサーバーで確定済みで、ここでは見せ方だけを担う。
// 読み込み → パックが拡大して登場 → 上端をなぞって破る → 1枚ずつめくる → 開封結果、の順に進む
function OpeningPage() {
  const { openingId } = Route.useParams();
  const trpc = useTRPC();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const opening = useQuery(trpc.opening.get.queryOptions({ openingId }));
  const reveal = useMutation(trpc.opening.reveal.mutationOptions());
  const [stage, setStage] = useState<Stage>("loading");
  const [index, setIndex] = useState(0);
  const [tear, setTear] = useState(0);
  const [flash, setFlash] = useState(false);
  const tearArea = useRef<HTMLDivElement>(null);
  const tearing = useRef(false);

  // カード画像を先読みしてから演出を始める。めくったときに画像が遅れて出ないようにするため
  useEffect(() => {
    if (!opening.data || stage !== "loading") return;
    const urls = opening.data.cards.map((c) => c.card.imageUrl).filter((u): u is string => !!u);
    const minimum = new Promise((r) => setTimeout(r, 600));
    const images = urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = url;
        }),
    );
    Promise.all([minimum, ...images]).then(() => setStage("pack"));
  }, [opening.data, stage]);

  const finish = () => {
    reveal.mutate({ openingId });
    navigate({ to: "/openings/$openingId/result", params: { openingId } });
  };

  const tearOpen = () => {
    setTear(1);
    setStage("torn");
    setFlash(true);
    navigator.vibrate?.(40);
    setTimeout(() => setFlash(false), 350);
    setTimeout(() => setStage("cards"), reduceMotion ? 200 : 900);
  };

  const onTearMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!tearing.current || !tearArea.current || stage !== "pack") return;
    const rect = tearArea.current.getBoundingClientRect();
    const progress = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    // 戻る方向には動かさない。左から右へなぞり切ったときだけ破れる
    setTear((t) => Math.max(t, progress));
    if (progress >= TEAR_THRESHOLD) {
      tearing.current = false;
      tearOpen();
    }
  };

  if (!opening.data) {
    return <div className="fixed inset-0 bg-white" />;
  }
  const { pack, cards } = opening.data;
  const current = cards[index];
  const next = cards[index + 1];
  const background = stage === "cards" && current ? backgroundByRarity[current.card.rarity] : null;

  const advance = () => {
    if (stage !== "cards") return;
    if (index >= cards.length - 1) finish();
    else setIndex((i) => i + 1);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 mx-auto flex max-w-md flex-col items-center overflow-hidden transition-colors duration-700",
        stage === "loading"
          ? "bg-white"
          : (background ?? "bg-gradient-to-b from-indigo-200 via-violet-100 to-sky-50"),
      )}
      onClick={advance}
    >
      {stage !== "loading" && (
        <button
          type="button"
          className="absolute top-4 right-4 z-50 rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold text-slate-600 shadow"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
        >
          スキップ
        </button>
      )}

      {stage === "loading" && (
        <div className="absolute right-6 bottom-6 h-6 w-6 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
      )}

      {/* 2〜3. パックの登場と、上端をなぞって破る */}
      <AnimatePresence>
        {(stage === "pack" || stage === "torn") && (
          <motion.div
            key="pack"
            className="relative mt-[18svh]"
            initial={{ scale: reduceMotion ? 1 : 0.35, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ y: 500, opacity: 0, transition: { duration: 0.6, ease: "easeIn" } }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="relative w-64">
              {/* 胴体 */}
              <div style={{ clipPath: "inset(13% 0 0 0)" }}>
                <PackArt name={pack.name} colorHex={pack.colorHex} className="w-64" />
              </div>
              {/* 切り取られる上部 */}
              <motion.div
                className="absolute inset-0"
                style={{ clipPath: "inset(0 0 87% 0)", transformOrigin: "100% 13%" }}
                animate={stage === "torn" ? { x: 160, y: -220, rotate: 35, opacity: 0 } : {}}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <PackArt name={pack.name} colorHex={pack.colorHex} className="w-64" />
              </motion.div>
              {/* なぞる場所。指を置いた所から右へ光の線が伸びる */}
              <div
                ref={tearArea}
                data-testid="tear-area"
                className="absolute top-[7%] left-0 h-[12%] w-full cursor-grab touch-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  tearing.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  onTearMove(e);
                }}
                onPointerMove={onTearMove}
                onPointerUp={() => {
                  tearing.current = false;
                  if (stage === "pack") setTear(0);
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="absolute top-[45%] left-0 h-0.5 w-full border-t-2 border-dashed border-white/60" />
                <motion.div
                  className="absolute top-[40%] left-0 h-1.5 rounded-full bg-white shadow-[0_0_14px_4px_rgba(255,255,255,0.9)]"
                  animate={{ width: `${tear * 100}%` }}
                  transition={{ duration: 0.08 }}
                />
              </div>
            </div>
            <div
              aria-hidden
              className="mx-auto mt-2 h-10 w-48 rounded-[50%] bg-indigo-900/10 blur-md"
            />
            {stage === "pack" && (
              <motion.p
                className="mt-6 text-center text-sm font-bold text-slate-600"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
              >
                パックの上を左から右へなぞって開けよう
              </motion.p>
            )}
            {stage === "pack" && (
              <button
                type="button"
                className="mx-auto mt-2 block text-xs text-slate-400 underline"
                onClick={(e) => {
                  e.stopPropagation();
                  tearOpen();
                }}
              >
                タップで開ける
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 破った瞬間の白い光 */}
      <AnimatePresence>
        {flash && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-40 bg-white"
            initial={{ opacity: 0.95 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
        )}
      </AnimatePresence>

      {/* 4〜5. カードの束がせり上がり、タップで1枚ずつめくる */}
      {stage === "cards" && current && (
        <div className="flex w-full flex-1 flex-col items-center pt-[10svh]">
          <motion.p
            className="mb-3 text-sm font-bold text-white drop-shadow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            カードをタップしてめくろう（{index + 1}/{cards.length}）
          </motion.p>
          <div className="relative">
            {/* 下に残っているカード。レジェンドの直前は束の縁が金色に光って予告する */}
            {cards.slice(index + 1).map((c, i) => (
              <div
                key={c.userCardId}
                className={cn(
                  "absolute inset-0 rounded-2xl bg-white shadow-lg",
                  i === 0 &&
                    next?.card.rarity === "legendary" &&
                    "animate-pulse shadow-[0_0_30px_10px_rgba(251,191,36,0.9)]",
                )}
                style={{
                  transform: `translate(${(i + 1) * 4}px, ${(i + 1) * 4}px)`,
                  zIndex: -i - 1,
                }}
              />
            ))}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={current.userCardId}
                data-testid="revealed-card"
                data-rarity={current.card.rarity}
                className="relative"
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : current.card.rarity === "legendary"
                      ? { scale: 0.3, rotateY: 540, opacity: 0 }
                      : current.card.rarity === "double_rare"
                        ? { scale: 0.7, rotate: -8, opacity: 0 }
                        : index === 0
                          ? { y: 400, opacity: 0 }
                          : { scale: 0.96, opacity: 0.6 }
                }
                animate={{ scale: 1, rotate: 0, rotateY: 0, y: 0, x: 0, opacity: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { x: -480, rotate: -18, opacity: 0, transition: { duration: 0.35 } }
                }
                transition={{
                  type: "spring",
                  stiffness: current.card.rarity === "legendary" ? 80 : 220,
                  damping: current.card.rarity === "legendary" ? 14 : 22,
                }}
              >
                {(current.card.rarity === "rare" ||
                  current.card.rarity === "double_rare" ||
                  current.card.rarity === "legendary") && (
                  <Sparkles
                    count={current.card.rarity === "legendary" ? 24 : 12}
                    color={current.card.rarity === "legendary" ? "#fbbf24" : "#ffffff"}
                  />
                )}
                {current.isNew && (
                  <motion.span
                    className="absolute -top-3 -left-2 z-10 rounded-full bg-pink-500 px-2.5 py-0.5 text-xs font-black text-white shadow"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 600, damping: 15 }}
                  >
                    NEW
                  </motion.span>
                )}
                <WikiCard card={current.card} size="lg" interactive />
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-6 h-12">
            <RarityMarks
              key={current.userCardId}
              rarity={current.card.rarity}
              size="lg"
              animate={!reduceMotion}
            />
          </div>
          {current.card.rarity === "legendary" && (
            <motion.div
              key={`gold-${current.userCardId}`}
              className="pointer-events-none absolute inset-0 bg-amber-200"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
