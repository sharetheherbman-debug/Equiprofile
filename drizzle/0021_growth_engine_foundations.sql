-- Phase 4: Growth Engine activation foundations

ALTER TABLE `marketingContacts`
  ADD COLUMN IF NOT EXISTS `tenantId` varchar(100) NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS `tenantType` varchar(50) NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS `onboardingStatus` varchar(30) DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS `referralCode` varchar(80) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `engagementScore` int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `metadataJson` text;

CREATE TABLE IF NOT EXISTS `growthQueueJobs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `queueType` varchar(40) NOT NULL,
  `status` varchar(40) NOT NULL,
  `task` varchar(80),
  `provider` varchar(50),
  `tenantType` varchar(50) NOT NULL DEFAULT 'individual',
  `tenantId` varchar(100) NOT NULL DEFAULT 'global',
  `createdByUserId` int,
  `reviewedByUserId` int,
  `payloadJson` text NOT NULL,
  `outputJson` text,
  `metadataJson` text,
  `attempts` int NOT NULL DEFAULT 0,
  `maxAttempts` int NOT NULL DEFAULT 3,
  `errorMessage` text,
  `rejectionReason` text,
  `runAfter` timestamp NOT NULL DEFAULT (now()),
  `scheduleAt` timestamp NULL,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `growthQueueJobs_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `growthSocialConnections` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` varchar(100) NOT NULL,
  `platform` varchar(50) NOT NULL,
  `state` varchar(40) NOT NULL DEFAULT 'not_connected',
  `encryptedAccessToken` text,
  `encryptedRefreshToken` text,
  `tokenExpiresAt` timestamp NULL,
  `metadataJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `growthSocialConnections_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `growthOnboardingFlows` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `tenantId` varchar(100) NOT NULL,
  `onboardingType` varchar(40) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'not_started',
  `step` int NOT NULL DEFAULT 1,
  `progressPercent` int NOT NULL DEFAULT 0,
  `checklistJson` text,
  `quickWinsJson` text,
  `completedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `growthOnboardingFlows_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `growthAutomationRuns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` varchar(100) NOT NULL,
  `contactId` int,
  `workflowKey` varchar(120) NOT NULL,
  `runStatus` varchar(30) NOT NULL,
  `triggerSource` varchar(60) NOT NULL,
  `triggerEvent` varchar(80) NOT NULL,
  `runAt` timestamp NOT NULL DEFAULT (now()),
  `payloadJson` text,
  `outcomeJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `growthAutomationRuns_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `growthReferrals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` varchar(100) NOT NULL,
  `inviterUserId` int,
  `inviteeEmail` varchar(320),
  `referralType` varchar(40) NOT NULL,
  `source` varchar(80) NOT NULL,
  `referralCode` varchar(80) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'sent',
  `convertedAt` timestamp NULL,
  `metadataJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `growthReferrals_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `growthAnalyticsEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` varchar(100) NOT NULL,
  `actorUserId` int,
  `eventType` varchar(100) NOT NULL,
  `stage` varchar(80) NOT NULL,
  `source` varchar(80),
  `metadataJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `growthAnalyticsEvents_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `growthFeedback` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantId` varchar(100) NOT NULL,
  `userId` int,
  `feedbackType` varchar(40) NOT NULL,
  `title` varchar(240) NOT NULL,
  `description` text NOT NULL,
  `satisfactionScore` int,
  `status` varchar(30) NOT NULL DEFAULT 'new',
  `metadataJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `growthFeedback_id` PRIMARY KEY(`id`)
);

CREATE INDEX IF NOT EXISTS `idx_mc_tenant` ON `marketingContacts` (`tenantId`);
CREATE INDEX IF NOT EXISTS `idx_ge_queue_tenant` ON `growthQueueJobs` (`tenantId`, `queueType`);
CREATE INDEX IF NOT EXISTS `idx_ge_queue_status` ON `growthQueueJobs` (`queueType`, `status`);
CREATE INDEX IF NOT EXISTS `idx_ge_social_tenant` ON `growthSocialConnections` (`tenantId`);
CREATE INDEX IF NOT EXISTS `idx_ge_social_platform` ON `growthSocialConnections` (`tenantId`, `platform`);
CREATE INDEX IF NOT EXISTS `idx_ge_onboarding_user` ON `growthOnboardingFlows` (`userId`, `tenantId`);
CREATE INDEX IF NOT EXISTS `idx_ge_lifecycle_tenant` ON `growthAutomationRuns` (`tenantId`, `runAt`);
CREATE INDEX IF NOT EXISTS `idx_ge_referral_tenant` ON `growthReferrals` (`tenantId`, `status`);
CREATE INDEX IF NOT EXISTS `idx_ge_analytics_tenant` ON `growthAnalyticsEvents` (`tenantId`, `stage`);
CREATE INDEX IF NOT EXISTS `idx_ge_feedback_tenant` ON `growthFeedback` (`tenantId`, `status`);
