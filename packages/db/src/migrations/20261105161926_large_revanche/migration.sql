CREATE TABLE `battle_team` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`slot` integer NOT NULL,
	`name` text NOT NULL,
	`member_1` text NOT NULL,
	`member_2` text NOT NULL,
	`member_3` text NOT NULL,
	CONSTRAINT `fk_battle_team_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_battle_team_member_1_user_card_id_fk` FOREIGN KEY (`member_1`) REFERENCES `user_card`(`id`),
	CONSTRAINT `fk_battle_team_member_2_user_card_id_fk` FOREIGN KEY (`member_2`) REFERENCES `user_card`(`id`),
	CONSTRAINT `fk_battle_team_member_3_user_card_id_fk` FOREIGN KEY (`member_3`) REFERENCES `user_card`(`id`),
	CONSTRAINT "battle_team_slot" CHECK("slot" between 1 and 3),
	CONSTRAINT "battle_team_distinct" CHECK("member_1" <> "member_2" and "member_1" <> "member_3" and "member_2" <> "member_3")
);
--> statement-breakpoint
CREATE TABLE `battle_day` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`date` text NOT NULL,
	`ranking` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `card_fusion` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`base_id` text NOT NULL,
	`material_id` text NOT NULL,
	`coefficient` real NOT NULL,
	`attack_gain` real NOT NULL,
	`defense_gain` real NOT NULL,
	CONSTRAINT `fk_card_fusion_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_card_fusion_base_id_user_card_id_fk` FOREIGN KEY (`base_id`) REFERENCES `user_card`(`id`),
	CONSTRAINT `fk_card_fusion_material_id_user_card_id_fk` FOREIGN KEY (`material_id`) REFERENCES `user_card`(`id`)
);
--> statement-breakpoint
ALTER TABLE `card` ADD `article_length` integer;--> statement-breakpoint
ALTER TABLE `user_card` ADD `attack_bonus` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_card` ADD `defense_bonus` real DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `battle_team_user_slot` ON `battle_team` (`user_id`,`slot`);--> statement-breakpoint
CREATE UNIQUE INDEX `battle_day_date` ON `battle_day` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `card_fusion_material` ON `card_fusion` (`material_id`);