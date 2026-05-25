-- Update 1: Media Assets, Brand Profiles, Brand Avatars, Growth Intelligence Foundation
-- Migration: 0022_media_assets_brand_growth_foundation.sql

-- ─── Media Assets Registry ───────────────────────────────────────────────────
-- Tracks all generated media assets. One row per output asset.
-- Links to growthQueueJobs via jobId for backwards compatibility.

CREATE TABLE IF NOT EXISTS `mediaAssets` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantType` varchar(50) NOT NULL DEFAULT 'individual',
  `tenantId` varchar(100) NOT NULL DEFAULT 'global',
  `userId` int,
  `campaignId` int,
  `draftId` varchar(40),
  `jobId` varchar(40),
  `type` varchar(30) NOT NULL DEFAULT 'other',
  `provider` varchar(50),
  `task` varchar(80),
  `status` varchar(30) NOT NULL DEFAULT 'created',
  `localPath` text,
  `publicUrl` text,
  `thumbnailUrl` text,
  `mimeType` varchar(120),
  `fileSizeBytes` int,
  `durationSeconds` int,
  `width` int,
  `height` int,
  `generationPrompt` text,
  `generationSettingsJson` text,
  `outputMetadataJson` text,
  `errorMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `mediaAssets_id` PRIMARY KEY(`id`)
);

-- ─── Brand Profiles ───────────────────────────────────────────────────────────
-- Persistent brand identity used to enrich content generation.
-- One profile per tenant (upsert pattern).

CREATE TABLE IF NOT EXISTS `brandProfiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantType` varchar(50) NOT NULL DEFAULT 'individual',
  `tenantId` varchar(100) NOT NULL DEFAULT 'global',
  `appKey` varchar(80) NOT NULL DEFAULT 'equiprofile',
  `name` varchar(200) NOT NULL DEFAULT 'EquiProfile',
  `brandVoice` text,
  `targetAudience` text,
  `positioning` text,
  `primaryCta` varchar(200),
  `prohibitedClaimsJson` text,
  `approvedClaimsJson` text,
  `colorsJson` text,
  `logoAssetId` int,
  `typographyJson` text,
  `hashtagStyle` varchar(80),
  `contentPillarsJson` text,
  `platformDefaultsJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `brandProfiles_id` PRIMARY KEY(`id`)
);

-- ─── Brand Avatars ────────────────────────────────────────────────────────────
-- Persistent brand character / avatar memory.
-- Injected into avatar generation prompts for consistency.

CREATE TABLE IF NOT EXISTS `brandAvatars` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantType` varchar(50) NOT NULL DEFAULT 'individual',
  `tenantId` varchar(100) NOT NULL DEFAULT 'global',
  `brandProfileId` int,
  `name` varchar(200) NOT NULL,
  `role` varchar(120),
  `visualDescription` text,
  `personality` text,
  `voiceStyle` varchar(120),
  `accent` varchar(80),
  `wardrobeRules` text,
  `backgroundRules` text,
  `referenceAssetId` int,
  `promptTemplate` text,
  `negativePrompt` text,
  `consistencySeed` varchar(80),
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `brandAvatars_id` PRIMARY KEY(`id`)
);

-- ─── Growth Profiles ──────────────────────────────────────────────────────────
-- Per-tenant growth intelligence memory.
-- Tracks goals, audience, cadence, and best-performing patterns.

CREATE TABLE IF NOT EXISTS `growthProfiles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tenantType` varchar(50) NOT NULL DEFAULT 'individual',
  `tenantId` varchar(100) NOT NULL DEFAULT 'global',
  `brandProfileId` int,
  `targetPlatformsJson` text,
  `growthGoal` text,
  `audienceDescription` text,
  `postingCadenceJson` text,
  `conversionGoal` text,
  `preferredContentTypesJson` text,
  `bestPerformingHooksJson` text,
  `bestPostingWindowsJson` text,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `growthProfiles_id` PRIMARY KEY(`id`)
);

-- ─── Content Scores ───────────────────────────────────────────────────────────
-- Deterministic quality scores for marketing drafts and assets.
-- hookScore, platformFitScore, conversionScore, clarityScore,
-- complianceScore, viralPotentialScore — each 0-100.

CREATE TABLE IF NOT EXISTS `contentScores` (
  `id` int AUTO_INCREMENT NOT NULL,
  `draftId` varchar(40),
  `assetId` int,
  `platform` varchar(80),
  `hookScore` int,
  `platformFitScore` int,
  `conversionScore` int,
  `clarityScore` int,
  `complianceScore` int,
  `viralPotentialScore` int,
  `reasonsJson` text,
  `improvementSuggestionsJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `contentScores_id` PRIMARY KEY(`id`)
);

-- ─── Platform Strategy Rules ──────────────────────────────────────────────────
-- Best-practice strategy rules seeded for each platform.
-- NOT fake algorithm promises — used to guide content generation.

CREATE TABLE IF NOT EXISTS `platformStrategyRules` (
  `id` int AUTO_INCREMENT NOT NULL,
  `platform` varchar(80) NOT NULL,
  `version` varchar(20) NOT NULL DEFAULT '1.0',
  `rulesJson` text,
  `recommendedCadenceJson` text,
  `hookGuidelinesJson` text,
  `formatGuidelinesJson` text,
  `complianceNotesJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platformStrategyRules_id` PRIMARY KEY(`id`)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS `idx_media_assets_tenant` ON `mediaAssets` (`tenantId`, `type`);
CREATE INDEX IF NOT EXISTS `idx_media_assets_job` ON `mediaAssets` (`jobId`);
CREATE INDEX IF NOT EXISTS `idx_media_assets_status` ON `mediaAssets` (`tenantId`, `status`);
CREATE INDEX IF NOT EXISTS `idx_brand_profiles_tenant` ON `brandProfiles` (`tenantId`);
CREATE INDEX IF NOT EXISTS `idx_brand_avatars_tenant` ON `brandAvatars` (`tenantId`, `status`);
CREATE INDEX IF NOT EXISTS `idx_growth_profiles_tenant` ON `growthProfiles` (`tenantId`);
CREATE INDEX IF NOT EXISTS `idx_content_scores_draft` ON `contentScores` (`draftId`);
CREATE INDEX IF NOT EXISTS `idx_content_scores_asset` ON `contentScores` (`assetId`);
CREATE INDEX IF NOT EXISTS `idx_platform_strategy_platform` ON `platformStrategyRules` (`platform`);
