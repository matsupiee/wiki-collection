CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `genre` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`source_category` text NOT NULL,
	`color_hex` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `card` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`wiki_lang` text NOT NULL,
	`wiki_page_id` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`image_url` text,
	`image_credit` text,
	`genre_id` text NOT NULL,
	`rarity` text NOT NULL,
	`monthly_pageviews` integer NOT NULL,
	`pageviews_measured_at` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	CONSTRAINT `fk_card_genre_id_genre_id_fk` FOREIGN KEY (`genre_id`) REFERENCES `genre`(`id`)
);
--> statement-breakpoint
CREATE TABLE `pack` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`type` text NOT NULL,
	`genre_id` text,
	`price_coins` integer,
	`cards_per_pack` integer DEFAULT 5 NOT NULL,
	`image_url` text,
	`color_hex` text NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_pack_genre_id_genre_id_fk` FOREIGN KEY (`genre_id`) REFERENCES `genre`(`id`)
);
--> statement-breakpoint
CREATE TABLE `pack_slot_rate` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`pack_id` text NOT NULL,
	`slot` integer NOT NULL,
	`rarity` text NOT NULL,
	`weight` integer NOT NULL,
	CONSTRAINT `fk_pack_slot_rate_pack_id_pack_id_fk` FOREIGN KEY (`pack_id`) REFERENCES `pack`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `pack_featured_card` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`pack_id` text NOT NULL,
	`card_id` text NOT NULL,
	`weight` integer NOT NULL,
	CONSTRAINT `fk_pack_featured_card_pack_id_pack_id_fk` FOREIGN KEY (`pack_id`) REFERENCES `pack`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_pack_featured_card_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`)
);
--> statement-breakpoint
CREATE TABLE `coin_product` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`sku` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`price_amount` integer NOT NULL,
	`currency` text NOT NULL,
	`coins` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pack_opening` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`pack_id` text NOT NULL,
	`payment` text NOT NULL,
	`coins_spent` integer DEFAULT 0 NOT NULL,
	`revealed_at` integer,
	CONSTRAINT `fk_pack_opening_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_pack_opening_pack_id_pack_id_fk` FOREIGN KEY (`pack_id`) REFERENCES `pack`(`id`)
);
--> statement-breakpoint
CREATE TABLE `free_pack_allowance` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL UNIQUE,
	`initial_remaining` integer NOT NULL,
	`daily_used_date` text,
	`daily_used_count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_free_pack_allowance_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_card` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`status` text DEFAULT 'owned' NOT NULL,
	`pack_opening_id` text,
	`slot` integer,
	`is_new_on_acquire` integer DEFAULT false NOT NULL,
	`redeemed_at` integer,
	CONSTRAINT `fk_user_card_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_user_card_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`),
	CONSTRAINT `fk_user_card_pack_opening_id_pack_opening_id_fk` FOREIGN KEY (`pack_opening_id`) REFERENCES `pack_opening`(`id`)
);
--> statement-breakpoint
CREATE TABLE `card_discovery` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`first_acquired_at` integer NOT NULL,
	CONSTRAINT `fk_card_discovery_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_card_discovery_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`)
);
--> statement-breakpoint
CREATE TABLE `coin_purchase` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`coin_product_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_payment_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`coins` integer NOT NULL,
	`status` text NOT NULL,
	`completed_at` integer,
	`refunded_at` integer,
	CONSTRAINT `fk_coin_purchase_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_coin_purchase_coin_product_id_coin_product_id_fk` FOREIGN KEY (`coin_product_id`) REFERENCES `coin_product`(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_listing` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`seller_id` text NOT NULL,
	`user_card_id` text NOT NULL,
	`card_id` text NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`price` integer,
	`start_price` integer,
	`current_price` integer,
	`bid_count` integer DEFAULT 0 NOT NULL,
	`ends_at` integer,
	`buyer_id` text,
	`sold_price` integer,
	`fee_amount` integer,
	`sold_at` integer,
	CONSTRAINT `fk_market_listing_seller_id_user_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_market_listing_user_card_id_user_card_id_fk` FOREIGN KEY (`user_card_id`) REFERENCES `user_card`(`id`),
	CONSTRAINT `fk_market_listing_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`),
	CONSTRAINT `fk_market_listing_buyer_id_user_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE TABLE `auction_bid` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`listing_id` text NOT NULL,
	`bidder_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`amount` integer NOT NULL,
	`status` text NOT NULL,
	CONSTRAINT `fk_auction_bid_listing_id_market_listing_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `market_listing`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_auction_bid_bidder_id_user_id_fk` FOREIGN KEY (`bidder_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `coin_deposit` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`is_paid` integer NOT NULL,
	`amount` integer NOT NULL,
	`coin_purchase_id` text,
	`user_card_id` text,
	`market_listing_id` text,
	`auction_bid_id` text,
	`note` text,
	CONSTRAINT `fk_coin_deposit_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_coin_deposit_coin_purchase_id_coin_purchase_id_fk` FOREIGN KEY (`coin_purchase_id`) REFERENCES `coin_purchase`(`id`),
	CONSTRAINT `fk_coin_deposit_user_card_id_user_card_id_fk` FOREIGN KEY (`user_card_id`) REFERENCES `user_card`(`id`),
	CONSTRAINT `fk_coin_deposit_market_listing_id_market_listing_id_fk` FOREIGN KEY (`market_listing_id`) REFERENCES `market_listing`(`id`),
	CONSTRAINT `fk_coin_deposit_auction_bid_id_auction_bid_id_fk` FOREIGN KEY (`auction_bid_id`) REFERENCES `auction_bid`(`id`)
);
--> statement-breakpoint
CREATE TABLE `coin_withdraw` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`user_sequence` integer NOT NULL,
	`purpose` text NOT NULL,
	`amount` integer NOT NULL,
	`pack_opening_id` text,
	`market_listing_id` text,
	`auction_bid_id` text,
	`note` text,
	CONSTRAINT `fk_coin_withdraw_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_coin_withdraw_pack_opening_id_pack_opening_id_fk` FOREIGN KEY (`pack_opening_id`) REFERENCES `pack_opening`(`id`),
	CONSTRAINT `fk_coin_withdraw_market_listing_id_market_listing_id_fk` FOREIGN KEY (`market_listing_id`) REFERENCES `market_listing`(`id`),
	CONSTRAINT `fk_coin_withdraw_auction_bid_id_auction_bid_id_fk` FOREIGN KEY (`auction_bid_id`) REFERENCES `auction_bid`(`id`)
);
--> statement-breakpoint
CREATE TABLE `coin_deposit_withdraw` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`deposit_id` text NOT NULL,
	`withdraw_id` text NOT NULL,
	`amount` integer NOT NULL,
	CONSTRAINT `fk_coin_deposit_withdraw_deposit_id_coin_deposit_id_fk` FOREIGN KEY (`deposit_id`) REFERENCES `coin_deposit`(`id`),
	CONSTRAINT `fk_coin_deposit_withdraw_withdraw_id_coin_withdraw_id_fk` FOREIGN KEY (`withdraw_id`) REFERENCES `coin_withdraw`(`id`)
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_wiki_page_uidx` ON `card` (`wiki_lang`,`wiki_page_id`);--> statement-breakpoint
CREATE INDEX `card_genre_rarity_idx` ON `card` (`genre_id`,`rarity`,`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `pack_slot_rate_uidx` ON `pack_slot_rate` (`pack_id`,`slot`,`rarity`);--> statement-breakpoint
CREATE UNIQUE INDEX `pack_featured_card_uidx` ON `pack_featured_card` (`pack_id`,`card_id`);--> statement-breakpoint
CREATE INDEX `pack_opening_user_created_idx` ON `pack_opening` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `user_card_user_status_card_idx` ON `user_card` (`user_id`,`status`,`card_id`);--> statement-breakpoint
CREATE INDEX `user_card_opening_idx` ON `user_card` (`pack_opening_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_discovery_uidx` ON `card_discovery` (`user_id`,`card_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `coin_purchase_provider_payment_uidx` ON `coin_purchase` (`provider`,`provider_payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `market_listing_active_card_uidx` ON `market_listing` (`user_card_id`) WHERE "market_listing"."status" = 'active';--> statement-breakpoint
CREATE INDEX `market_listing_search_idx` ON `market_listing` (`status`,`format`,`card_id`);--> statement-breakpoint
CREATE INDEX `market_listing_ends_idx` ON `market_listing` (`status`,`ends_at`);--> statement-breakpoint
CREATE INDEX `market_listing_seller_idx` ON `market_listing` (`seller_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `auction_bid_sequence_uidx` ON `auction_bid` (`listing_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `auction_bid_bidder_idx` ON `auction_bid` (`bidder_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `coin_deposit_user_created_idx` ON `coin_deposit` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `coin_withdraw_user_sequence_uidx` ON `coin_withdraw` (`user_id`,`user_sequence`);--> statement-breakpoint
CREATE INDEX `coin_withdraw_user_created_idx` ON `coin_withdraw` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `coin_deposit_withdraw_uidx` ON `coin_deposit_withdraw` (`deposit_id`,`withdraw_id`);--> statement-breakpoint
CREATE INDEX `coin_deposit_withdraw_withdraw_idx` ON `coin_deposit_withdraw` (`withdraw_id`);