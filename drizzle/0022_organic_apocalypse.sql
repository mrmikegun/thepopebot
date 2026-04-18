CREATE TABLE `user_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel` text NOT NULL,
	`channel_chat_id` text,
	`code` text,
	`code_expires_at` integer,
	`verified_at` integer,
	`active_thread_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_channels_user_channel_unique` ON `user_channels` (`user_id`,`channel`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_channels_channel_chat_id_unique` ON `user_channels` (`channel`,`channel_chat_id`);--> statement-breakpoint
CREATE INDEX `user_channels_code_lookup` ON `user_channels` (`code`);