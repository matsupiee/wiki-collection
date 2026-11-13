CREATE TABLE `notification` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_user` (
	`id` text PRIMARY KEY,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`notification_id` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_notification_user_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_notification_user_notification_id_notification_id_fk` FOREIGN KEY (`notification_id`) REFERENCES `notification`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_user_recipient_idx` ON `notification_user` (`user_id`,`notification_id`);--> statement-breakpoint
CREATE INDEX `notification_user_notification_idx` ON `notification_user` (`notification_id`);