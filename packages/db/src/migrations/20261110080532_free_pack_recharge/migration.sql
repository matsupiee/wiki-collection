ALTER TABLE `free_pack_allowance` ADD `full_at` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE free_pack_allowance
SET full_at = CAST(unixepoch('subsecond') * 1000 AS INTEGER) + min(10, max(0, daily_used_count)) * 600000
WHERE daily_used_date = date('now', '+9 hours');
