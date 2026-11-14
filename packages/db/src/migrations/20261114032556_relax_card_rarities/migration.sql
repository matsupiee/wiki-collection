-- Card reclassification is an explicit batched maintenance operation, not a deployment migration.
UPDATE rarity_threshold SET min_monthly_pageviews = CASE rarity
  WHEN 'legendary' THEN 100000 WHEN 'super_rare' THEN 10000 WHEN 'rare' THEN 1000
END WHERE rarity IN ('legendary', 'super_rare', 'rare');
