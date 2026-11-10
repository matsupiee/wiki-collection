-- Keep only the part of each payment funded by other deposits.
UPDATE coin_withdraw AS w
SET amount = amount - (
  SELECT SUM(a.amount) FROM coin_deposit_withdraw AS a
  JOIN coin_deposit AS d ON d.id = a.deposit_id
  WHERE a.withdraw_id = w.id AND d.source = 'card_redeem'
)
WHERE w.id IN (
  SELECT a.withdraw_id FROM coin_deposit_withdraw AS a
  JOIN coin_deposit AS d ON d.id = a.deposit_id WHERE d.source = 'card_redeem'
);--> statement-breakpoint
DELETE FROM coin_deposit_withdraw WHERE deposit_id IN (
  SELECT id FROM coin_deposit WHERE source = 'card_redeem'
);--> statement-breakpoint
DELETE FROM coin_withdraw WHERE amount = 0 AND NOT EXISTS (
  SELECT 1 FROM coin_deposit_withdraw WHERE withdraw_id = coin_withdraw.id
);--> statement-breakpoint
DELETE FROM coin_deposit WHERE source = 'card_redeem';--> statement-breakpoint
UPDATE user_card SET status = 'owned' WHERE status = 'redeemed';--> statement-breakpoint
UPDATE pack_slot_rate SET weight = CASE rarity WHEN 'double_rare' THEN 9900 ELSE 100 END
WHERE pack_id IN (SELECT id FROM pack WHERE slug = 'double-rare-guaranteed')
  AND rarity IN ('double_rare', 'legendary');--> statement-breakpoint
CREATE TABLE `__new_coin_deposit` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`is_paid` integer NOT NULL,
	`amount` integer NOT NULL,
	`coin_purchase_id` text,
	`market_listing_id` text,
	`auction_bid_id` text,
	`note` text,
	CONSTRAINT `fk_coin_deposit_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_coin_deposit_coin_purchase_id_coin_purchase_id_fk` FOREIGN KEY (`coin_purchase_id`) REFERENCES `coin_purchase`(`id`),
	CONSTRAINT `fk_coin_deposit_market_listing_id_market_listing_id_fk` FOREIGN KEY (`market_listing_id`) REFERENCES `market_listing`(`id`),
	CONSTRAINT `fk_coin_deposit_auction_bid_id_auction_bid_id_fk` FOREIGN KEY (`auction_bid_id`) REFERENCES `auction_bid`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_coin_deposit`(`id`, `created_at`, `updated_at`, `user_id`, `source`, `is_paid`, `amount`, `coin_purchase_id`, `market_listing_id`, `auction_bid_id`, `note`) SELECT `id`, `created_at`, `updated_at`, `user_id`, `source`, `is_paid`, `amount`, `coin_purchase_id`, `market_listing_id`, `auction_bid_id`, `note` FROM `coin_deposit`;--> statement-breakpoint
-- Release inbound references during the table rebuild in the same D1 batch.
CREATE TABLE redemption_migration_allocations AS SELECT * FROM coin_deposit_withdraw;--> statement-breakpoint
DELETE FROM coin_deposit_withdraw;--> statement-breakpoint
DROP TABLE `coin_deposit`;--> statement-breakpoint
ALTER TABLE `__new_coin_deposit` RENAME TO `coin_deposit`;--> statement-breakpoint
INSERT INTO coin_deposit_withdraw SELECT * FROM redemption_migration_allocations;--> statement-breakpoint
DROP TABLE redemption_migration_allocations;--> statement-breakpoint
CREATE INDEX `coin_deposit_user_created_idx` ON `coin_deposit` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `user_card` DROP COLUMN `redeemed_at`;