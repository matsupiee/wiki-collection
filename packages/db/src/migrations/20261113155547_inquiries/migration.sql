CREATE TABLE `inquiry` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`answer` text,
	`answered_at` integer,
	CONSTRAINT `fk_inquiry_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `support_agent` (
	`user_id` text PRIMARY KEY,
	CONSTRAINT `fk_support_agent_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `inquiry_owner_idx` ON `inquiry` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiry_answered_idx` ON `inquiry` (`answered_at`,`created_at`);