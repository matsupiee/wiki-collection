CREATE TABLE `installation` (
	`digest` text PRIMARY KEY,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_installation_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `user` ADD `apple_subject` text;--> statement-breakpoint
CREATE UNIQUE INDEX user_apple_subject_uidx ON user(apple_subject);
