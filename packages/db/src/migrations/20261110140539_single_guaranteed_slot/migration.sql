UPDATE pack SET name = 'SR1枚確定ガチャ', description = '5枚のうち1枚はSR確定。'
WHERE slug = 'double-rare-guaranteed';
--> statement-breakpoint
UPDATE pack SET name = 'レジェンド1枚確定ガチャ', description = '5枚のうち1枚はレジェンド確定。'
WHERE slug = 'legend-guaranteed';
--> statement-breakpoint
DELETE FROM pack_slot_rate WHERE pack_id IN
  (SELECT id FROM pack WHERE slug IN ('double-rare-guaranteed', 'legend-guaranteed'));
--> statement-breakpoint
WITH rates(slot, rarity, weight) AS (VALUES
  (1, 'common', 10000), (2, 'common', 10000), (3, 'common', 10000),
  (4, 'common', 9500), (4, 'rare', 350), (4, 'super_rare', 100), (4, 'legendary', 50)
)
INSERT INTO pack_slot_rate (id, pack_id, slot, rarity, weight)
SELECT lower(hex(randomblob(16))), pack.id, rates.slot, rates.rarity, rates.weight
FROM pack CROSS JOIN rates WHERE pack.slug IN ('double-rare-guaranteed', 'legend-guaranteed')
UNION ALL
SELECT lower(hex(randomblob(16))), id, 5,
  CASE slug WHEN 'legend-guaranteed' THEN 'legendary' ELSE 'super_rare' END, 10000
FROM pack WHERE slug IN ('double-rare-guaranteed', 'legend-guaranteed');
