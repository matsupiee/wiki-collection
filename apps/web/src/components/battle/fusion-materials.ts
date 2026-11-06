import type { BattleCard } from "./card-picker";
import { groupFusionMaterials as group } from "@wiki-collection/ui/lib/battle-selection";
export const groupFusionMaterials = (cards: BattleCard[], baseId: string) => group(cards, baseId);
export type MaterialGroup = ReturnType<typeof groupFusionMaterials>[number];
