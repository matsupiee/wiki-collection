WITH rates(slot, rarity, weight) AS (
  VALUES (4, 'uncommon', 9500), (4, 'rare', 350), (4, 'double_rare', 100), (4, 'legendary', 50),
         (5, 'uncommon', 8600), (5, 'rare', 1000), (5, 'double_rare', 300), (5, 'legendary', 100)
)
UPDATE pack_slot_rate AS target
SET weight = rates.weight, updated_at = CAST(unixepoch('subsecond') * 1000 AS INTEGER)
FROM rates
WHERE target.pack_id = (SELECT id FROM pack WHERE slug = 'basic' AND type = 'free_basic')
  AND target.slot = rates.slot AND target.rarity = rates.rarity;
