DROP INDEX IF EXISTS `battle_team_user_slot`;--> statement-breakpoint
DROP INDEX IF EXISTS `battle_day_date`;--> statement-breakpoint
DROP INDEX IF EXISTS `card_fusion_material`;--> statement-breakpoint
DROP TABLE `battle_team`;--> statement-breakpoint
DROP TABLE `battle_day`;--> statement-breakpoint
DROP TABLE `card_fusion`;--> statement-breakpoint
ALTER TABLE `user_card` DROP COLUMN `attack_bonus`;--> statement-breakpoint
ALTER TABLE `user_card` DROP COLUMN `defense_bonus`;--> statement-breakpoint
UPDATE `user_card` SET `status` = 'archived' WHERE `status` = 'fused';
