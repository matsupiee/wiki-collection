-- Card reclassification is an explicit batched maintenance operation, not a deployment migration.
INSERT INTO rarity_threshold (id, wiki_lang, rarity, min_monthly_pageviews)
SELECT lower(hex(randomblob(16))), wiki_lang, 'uncommon', 100
FROM (SELECT DISTINCT wiki_lang FROM rarity_threshold UNION SELECT 'ja')
WHERE true
ON CONFLICT(wiki_lang, rarity) DO UPDATE SET min_monthly_pageviews = 100;
--> statement-breakpoint
INSERT INTO pack_slot_rate (id, pack_id, slot, rarity, weight)
SELECT lower(hex(randomblob(16))), pack_id, slot, 'uncommon', 0
FROM pack_slot_rate WHERE rarity = 'common'
ON CONFLICT(pack_id, slot, rarity) DO NOTHING;
--> statement-breakpoint
WITH totals AS MATERIALIZED (
  SELECT pack_id, slot, SUM(weight) AS total FROM pack_slot_rate
  WHERE rarity IN ('common', 'uncommon') GROUP BY pack_id, slot
)
UPDATE pack_slot_rate SET weight = (
  SELECT CASE WHEN pack_slot_rate.rarity = 'uncommon' THEN CAST(total * 0.35 + 0.5 AS INTEGER)
    ELSE total - CAST(total * 0.35 + 0.5 AS INTEGER) END
  FROM totals WHERE totals.pack_id = pack_slot_rate.pack_id AND totals.slot = pack_slot_rate.slot
)
WHERE rarity IN ('common', 'uncommon');
