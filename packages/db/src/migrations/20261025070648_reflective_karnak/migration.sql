CREATE TABLE `rarity_threshold` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`wiki_lang` text NOT NULL,
	`rarity` text NOT NULL,
	`min_monthly_pageviews` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `card` ADD `wiki_revision_id` integer;--> statement-breakpoint
ALTER TABLE `card` ADD `wiki_fetched_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `rarity_threshold_uidx` ON `rarity_threshold` (`wiki_lang`,`rarity`);