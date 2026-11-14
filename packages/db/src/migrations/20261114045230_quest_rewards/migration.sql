CREATE TABLE `user_quest_completion` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`quest_key` text NOT NULL,
	`reward` integer NOT NULL,
	`pack_opening_id` text,
	CONSTRAINT `fk_user_quest_completion_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_user_quest_completion_pack_opening_id_pack_opening_id_fk` FOREIGN KEY (`pack_opening_id`) REFERENCES `pack_opening`(`id`)
);
--> statement-breakpoint
ALTER TABLE `coin_deposit` ADD `quest_completion_id` text REFERENCES user_quest_completion(id);--> statement-breakpoint
CREATE UNIQUE INDEX `coin_deposit_quest_uidx` ON `coin_deposit` (`quest_completion_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `quest_completion_user_key_uidx` ON `user_quest_completion` (`user_id`,`quest_key`);--> statement-breakpoint
CREATE INDEX `quest_completion_opening_idx` ON `user_quest_completion` (`pack_opening_id`);