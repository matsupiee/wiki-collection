UPDATE card SET rarity = CASE
  WHEN monthly_pageviews >= 100000 THEN 'legendary'
  WHEN monthly_pageviews >= 50000 THEN 'super_rare'
  WHEN monthly_pageviews >= 10000 THEN 'rare'
  ELSE 'common'
END;
--> statement-breakpoint
UPDATE rarity_threshold SET rarity = 'super_rare' WHERE rarity = 'double_rare';
--> statement-breakpoint
DELETE FROM rarity_threshold WHERE rarity = 'uncommon';
--> statement-breakpoint
UPDATE rarity_threshold SET min_monthly_pageviews = CASE rarity
  WHEN 'legendary' THEN 100000 WHEN 'super_rare' THEN 50000 WHEN 'rare' THEN 10000
END WHERE rarity IN ('legendary', 'super_rare', 'rare');
--> statement-breakpoint
INSERT INTO pack_slot_rate (id, pack_id, slot, rarity, weight)
SELECT lower(hex(randomblob(16))), pack_id, slot, 'common', weight
FROM pack_slot_rate WHERE rarity = 'uncommon'
ON CONFLICT(pack_id, slot, rarity) DO UPDATE SET weight = pack_slot_rate.weight + excluded.weight;
--> statement-breakpoint
DELETE FROM pack_slot_rate WHERE rarity = 'uncommon';
--> statement-breakpoint
UPDATE pack_slot_rate SET rarity = 'super_rare' WHERE rarity = 'double_rare';
--> statement-breakpoint
UPDATE pack SET name = 'SR確定ガチャ', description = '5枚すべてSR以上。'
WHERE slug = 'double-rare-guaranteed';
