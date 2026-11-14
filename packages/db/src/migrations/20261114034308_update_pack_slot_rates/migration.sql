DELETE FROM pack_slot_rate
WHERE pack_id IN (SELECT id FROM pack WHERE type = 'free_basic' OR slug IN ('double-rare-guaranteed', 'legend-guaranteed'));
--> statement-breakpoint
WITH slots(slot) AS (VALUES (1), (2), (3), (4), (5)),
rarities(rarity) AS (VALUES ('common'), ('uncommon'), ('rare'), ('super_rare'), ('legendary')),
rates AS (
  SELECT pack.id AS pack_id, slots.slot, rarities.rarity,
    CASE
      WHEN slot = 5 AND pack.slug = 'double-rare-guaranteed' THEN CASE rarity WHEN 'super_rare' THEN 10000 ELSE 0 END
      WHEN slot = 5 AND pack.slug = 'legend-guaranteed' THEN CASE rarity WHEN 'legendary' THEN 10000 ELSE 0 END
      WHEN slot <= 2 THEN CASE rarity WHEN 'common' THEN 8000 WHEN 'uncommon' THEN 2000 ELSE 0 END
      WHEN slot <= 4 THEN CASE rarity WHEN 'common' THEN 6000 WHEN 'uncommon' THEN 3000 WHEN 'rare' THEN 1000 ELSE 0 END
      ELSE CASE rarity WHEN 'common' THEN 4800 WHEN 'uncommon' THEN 3000 WHEN 'rare' THEN 2000 WHEN 'super_rare' THEN 150 WHEN 'legendary' THEN 50 END
    END AS weight
  FROM pack CROSS JOIN slots CROSS JOIN rarities
  WHERE pack.type = 'free_basic' OR pack.slug IN ('double-rare-guaranteed', 'legend-guaranteed')
)
INSERT INTO pack_slot_rate (id, pack_id, slot, rarity, weight)
SELECT lower(hex(randomblob(16))), pack_id, slot, rarity, weight FROM rates WHERE weight > 0;
