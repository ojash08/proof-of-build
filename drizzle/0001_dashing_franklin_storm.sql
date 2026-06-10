CREATE TABLE `activity_feed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityType` enum('build_verified','skill_unlocked','badge_earned','level_up','xp_gained') NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_feed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`badgeType` enum('first_build','verified_architect','polyglot','open_source_champion','trusted_builder','level_5','level_10','level_20') NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`iconUrl` text,
	`awardedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`buildId` int,
	`skillName` varchar(256) NOT NULL,
	`densityWeight` decimal(5,2) NOT NULL,
	`verificationCount` int NOT NULL DEFAULT 1,
	`lastVerifiedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verified_builds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`repoUrl` varchar(512) NOT NULL,
	`repoName` varchar(256) NOT NULL,
	`repoOwner` varchar(256) NOT NULL,
	`status` enum('pending','processing','verified','failed') NOT NULL DEFAULT 'pending',
	`verificationError` text,
	`complexityScore` decimal(5,2),
	`architectureQuality` decimal(5,2),
	`codeQuality` decimal(5,2),
	`description` text,
	`languages` json,
	`primaryLanguage` varchar(64),
	`commitCount` int,
	`contributorCount` int,
	`starCount` int,
	`competencies` json,
	`skillTags` json,
	`teeSignature` text,
	`teeTimestamp` timestamp,
	`isPublicVisible` boolean NOT NULL DEFAULT true,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verified_builds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totalXp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `currentLevel` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `trustScore` decimal(5,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);