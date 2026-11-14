export const questDefinitions = [
  { id: "first_pack", group: "first", metric: "openings", target: 1, reward: 10 },
  ...[
    [10, 10],
    [50, 20],
    [100, 30],
    [500, 100],
  ].map(([target, reward]) => ({
    id: `packs_${target}`,
    group: "packs",
    metric: "openings",
    target: target!,
    reward: reward!,
  })),
  ...[
    [25, 10],
    [100, 20],
    [250, 50],
    [1000, 150],
  ].map(([target, reward]) => ({
    id: `cards_${target}`,
    group: "cards",
    metric: "cards",
    target: target!,
    reward: reward!,
  })),
  ...[
    [5, 10],
    [10, 20],
    [25, 50],
  ].map(([target, reward]) => ({
    id: `genres_${target}`,
    group: "genres",
    metric: "genres",
    target: target!,
    reward: reward!,
  })),
  { id: "first_rare", group: "rare", metric: "rare", target: 1, reward: 5 },
  { id: "first_super_rare", group: "rare", metric: "super_rare", target: 1, reward: 20 },
  { id: "first_legendary", group: "rare", metric: "legendary", target: 1, reward: 50 },
] as const;
