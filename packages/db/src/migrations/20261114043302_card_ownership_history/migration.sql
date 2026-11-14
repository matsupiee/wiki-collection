PRAGMA defer_foreign_keys = ON;
--> statement-breakpoint
CREATE TABLE `pack_opening_card` (
	`id` text PRIMARY KEY,
	`pack_opening_id` text NOT NULL,
	`user_card_id` text NOT NULL,
	`card_id` text NOT NULL,
	`slot` integer NOT NULL,
	CONSTRAINT `fk_pack_opening_card_pack_opening_id_pack_opening_id_fk` FOREIGN KEY (`pack_opening_id`) REFERENCES `pack_opening`(`id`),
	CONSTRAINT `fk_pack_opening_card_user_card_id_user_card_id_fk` FOREIGN KEY (`user_card_id`) REFERENCES `user_card`(`id`),
	CONSTRAINT `fk_pack_opening_card_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_card_ownership_transfers` (
	`id` text PRIMARY KEY,
	`user_card_id` text,
	`card_id` text NOT NULL,
	`from_user_id` text,
	`to_user_id` text NOT NULL,
	`reason` text NOT NULL,
	`market_listing_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_user_card_ownership_transfers_user_card_id_user_card_id_fk` FOREIGN KEY (`user_card_id`) REFERENCES `user_card`(`id`),
	CONSTRAINT `fk_user_card_ownership_transfers_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`),
	CONSTRAINT `fk_user_card_ownership_transfers_from_user_id_user_id_fk` FOREIGN KEY (`from_user_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_card_ownership_transfers_to_user_id_user_id_fk` FOREIGN KEY (`to_user_id`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_user_card_ownership_transfers_market_listing_id_market_listing_id_fk` FOREIGN KEY (`market_listing_id`) REFERENCES `market_listing`(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_card` RENAME COLUMN `user_id` TO `owner_id`;--> statement-breakpoint
CREATE INDEX `ownership_transfers_recipient_card_idx` ON `user_card_ownership_transfers` (`to_user_id`,`card_id`);--> statement-breakpoint
CREATE INDEX `ownership_transfers_copy_time_idx` ON `user_card_ownership_transfers` (`user_card_id`,`created_at`);--> statement-breakpoint
-- 保存済みの開封コピーを移す。旧データの枠順は未保存なので既存のID順を使う。
INSERT INTO pack_opening_card (id, pack_opening_id, user_card_id, card_id, slot)
SELECT 'migrated-opening-' || id, pack_opening_id, id, card_id,
  row_number() OVER (PARTITION BY pack_opening_id ORDER BY id)
FROM user_card WHERE pack_opening_id IS NOT NULL;
--> statement-breakpoint
INSERT INTO user_card_ownership_transfers
  (id, user_card_id, card_id, from_user_id, to_user_id, reason, created_at)
SELECT 'migrated-opening-' || uc.id, uc.id, uc.card_id, NULL, po.user_id, 'pack_open', po.created_at
FROM user_card uc JOIN pack_opening po ON po.id = uc.pack_opening_id;
--> statement-breakpoint
INSERT INTO user_card_ownership_transfers
  (id, user_card_id, card_id, from_user_id, to_user_id, reason, market_listing_id, created_at)
SELECT 'migrated-sale-' || id, user_card_id, card_id, seller_id, buyer_id, 'market_sale', id,
  coalesce(sold_at, updated_at)
FROM market_listing WHERE status = 'sold' AND buyer_id IS NOT NULL;
--> statement-breakpoint
-- 相手やコピーが不明な旧獲得記録は推測しない。既存の閲覧権限を保持する。
INSERT INTO user_card_ownership_transfers
  (id, user_card_id, card_id, from_user_id, to_user_id, reason, created_at)
SELECT 'migrated-discovery-' || d.id, NULL, d.card_id, NULL, d.user_id, 'pack_open', d.first_acquired_at
FROM card_discovery d
WHERE NOT EXISTS (SELECT 1 FROM user_card_ownership_transfers t
  WHERE t.to_user_id = d.user_id AND t.card_id = d.card_id AND t.created_at <= d.first_acquired_at);
--> statement-breakpoint
-- 開封記録のない旧コピーも、現在の所有という確認できる事実だけを保持する。
INSERT INTO user_card_ownership_transfers
  (id, user_card_id, card_id, from_user_id, to_user_id, reason, created_at)
SELECT 'migrated-owner-' || uc.id, uc.id, uc.card_id, NULL, uc.owner_id, 'pack_open', uc.updated_at
FROM user_card uc WHERE NOT EXISTS (SELECT 1 FROM user_card_ownership_transfers t
  WHERE t.user_card_id = uc.id AND t.to_user_id = uc.owner_id);
--> statement-breakpoint
DROP INDEX IF EXISTS user_card_user_status_card_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS user_card_opening_idx;
--> statement-breakpoint
-- 元の名前で作り直して行を再挿入し、遅延された参照制約を解消する。
CREATE TABLE __user_card_backup AS SELECT id, created_at, updated_at, owner_id, card_id, status FROM user_card;
--> statement-breakpoint
DROP TABLE user_card;
--> statement-breakpoint
CREATE TABLE user_card (
  id text PRIMARY KEY,
  created_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  updated_at integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  owner_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  card_id text NOT NULL REFERENCES card(id),
  status text DEFAULT 'owned' NOT NULL
);
--> statement-breakpoint
INSERT INTO user_card (id, created_at, updated_at, owner_id, card_id, status)
SELECT id, created_at, updated_at, owner_id, card_id, status FROM __user_card_backup;
--> statement-breakpoint
DROP TABLE __user_card_backup;
--> statement-breakpoint
DROP INDEX IF EXISTS `card_discovery_uidx`;--> statement-breakpoint
CREATE INDEX `user_card_owner_status_card_idx` ON `user_card` (`owner_id`,`status`,`card_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `pack_opening_card_slot_uidx` ON `pack_opening_card` (`pack_opening_id`,`slot`);--> statement-breakpoint
CREATE UNIQUE INDEX `pack_opening_card_copy_uidx` ON `pack_opening_card` (`user_card_id`);--> statement-breakpoint
CREATE INDEX `pack_opening_card_card_idx` ON `pack_opening_card` (`card_id`);--> statement-breakpoint
CREATE INDEX `ownership_transfers_sender_idx` ON `user_card_ownership_transfers` (`from_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ownership_transfers_listing_uidx` ON `user_card_ownership_transfers` (`market_listing_id`);--> statement-breakpoint
DROP TABLE `card_discovery`;