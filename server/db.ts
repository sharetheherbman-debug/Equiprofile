// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
import { eq, and, desc, sql, gte, lte, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { ResultSetHeader } from "mysql2";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import {
  InsertUser,
  users,
  horses,
  InsertHorse,
  healthRecords,
  InsertHealthRecord,
  trainingSessions,
  InsertTrainingSession,
  feedingPlans,
  InsertFeedingPlan,
  documents,
  InsertDocument,
  weatherLogs,
  InsertWeatherLog,
  systemSettings,
  InsertSystemSetting,
  activityLogs,
  InsertActivityLog,
  backupLogs,
  InsertBackupLog,
  stables,
  InsertStable,
  stableMembers,
  InsertStableMember,
  stableInvites,
  InsertStableInvite,
  events,
  InsertEvent,
  eventReminders,
  InsertEventReminder,
  feedCosts,
  InsertFeedCost,
  vaccinations,
  InsertVaccination,
  dewormings,
  InsertDeworming,
  shareLinks,
  InsertShareLink,
  competitions,
  InsertCompetition,
  documentTags,
  InsertDocumentTag,
  stripeEvents,
  InsertStripeEvent,
  messageThreads,
  InsertMessageThread,
  messages,
  InsertMessage,
  competitionResults,
  InsertCompetitionResult,
  trainingProgramTemplates,
  InsertTrainingProgramTemplate,
  trainingPrograms,
  InsertTrainingProgram,
  reports,
  InsertReport,
  reportSchedules,
  InsertReportSchedule,
  breeding,
  InsertBreeding,
  foals,
  InsertFoal,
  pedigree,
  InsertPedigree,
  lessonBookings,
  InsertLessonBooking,
  trainerAvailability,
  InsertTrainerAvailability,
  apiKeys,
  InsertApiKey,
  webhooks,
  InsertWebhook,
  adminSessions,
  InsertAdminSession,
  adminUnlockAttempts,
  InsertAdminUnlockAttempt,
  treatments,
  InsertTreatment,
  appointments,
  InsertAppointment,
  dentalCare,
  InsertDentalCare,
  xrays,
  InsertXray,
  tags,
  InsertTag,
  horseTags,
  InsertHorseTag,
  hoofcare,
  InsertHoofcare,
  nutritionLogs,
  InsertNutritionLog,
  nutritionPlans,
  InsertNutritionPlan,
  notes,
  InsertNote,
  rides,
  InsertRide,
  accountFeatures,
  tasks,
  contacts,
  siteAnalytics,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _tablesEnsured = false;
let _ensureTablesPromise: Promise<void> | null = null;

// Helper to fix localhost to IPv4 address
function fixDatabaseUrl(url: string): string {
  // Replace localhost with 127.0.0.1 to avoid IPv6 resolution (::1)
  return url.replace(/localhost/g, "127.0.0.1");
}

/**
 * Ensure all required tables exist. Uses CREATE TABLE IF NOT EXISTS so it is
 * safe to call on every startup regardless of whether the database is fresh or
 * has a partial schema from an older migration run.
 *
 * This is the safety-net that prevents "table does not exist" runtime errors
 * when the drizzle-kit migration step was skipped or baseline mode marked
 * migration 0008 as applied on an existing DB that was actually missing tables.
 */
async function ensureTables(db: ReturnType<typeof drizzle>): Promise<void> {
  if (_tablesEnsured) return;

  const statements: string[] = [
    // Admin sessions
    `CREATE TABLE IF NOT EXISTS \`adminSessions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`expiresAt\` timestamp NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`adminSessions_id\` PRIMARY KEY(\`id\`)
    )`,
    // Admin unlock attempts
    `CREATE TABLE IF NOT EXISTS \`adminUnlockAttempts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`attempts\` int NOT NULL DEFAULT 0,
      \`lockedUntil\` timestamp NULL,
      \`lastAttemptAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`adminUnlockAttempts_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`adminUnlockAttempts_userId_unique\` UNIQUE(\`userId\`)
    )`,
    // Stables
    `CREATE TABLE IF NOT EXISTS \`stables\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`description\` text,
      \`ownerId\` int NOT NULL,
      \`location\` varchar(255),
      \`logo\` text,
      \`primaryColor\` varchar(7),
      \`secondaryColor\` varchar(7),
      \`customDomain\` varchar(255),
      \`branding\` text,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`stables_id\` PRIMARY KEY(\`id\`)
    )`,
    // Stable members
    `CREATE TABLE IF NOT EXISTS \`stableMembers\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`stableId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`role\` enum('owner','admin','trainer','member','viewer') NOT NULL,
      \`permissions\` text,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`joinedAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`stableMembers_id\` PRIMARY KEY(\`id\`)
    )`,
    // Stable invites
    `CREATE TABLE IF NOT EXISTS \`stableInvites\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`stableId\` int NOT NULL,
      \`invitedByUserId\` int NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`role\` enum('admin','trainer','member','viewer') NOT NULL,
      \`token\` varchar(100) NOT NULL,
      \`status\` enum('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
      \`expiresAt\` timestamp NOT NULL,
      \`acceptedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`stableInvites_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`stableInvites_token_unique\` UNIQUE(\`token\`)
    )`,
    // Events
    `CREATE TABLE IF NOT EXISTS \`events\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`stableId\` int,
      \`horseId\` int,
      \`title\` varchar(200) NOT NULL,
      \`description\` text,
      \`eventType\` enum('training','competition','veterinary','farrier','lesson','meeting','other') NOT NULL,
      \`startDate\` timestamp NOT NULL,
      \`endDate\` timestamp NULL,
      \`location\` varchar(255),
      \`isAllDay\` boolean NOT NULL DEFAULT false,
      \`isRecurring\` boolean NOT NULL DEFAULT false,
      \`recurrenceRule\` text,
      \`color\` varchar(7),
      \`isCompleted\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`events_id\` PRIMARY KEY(\`id\`)
    )`,
    // Event reminders
    `CREATE TABLE IF NOT EXISTS \`eventReminders\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`eventId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`reminderTime\` timestamp NOT NULL,
      \`reminderType\` enum('email','push','sms') NOT NULL,
      \`isSent\` boolean NOT NULL DEFAULT false,
      \`sentAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`eventReminders_id\` PRIMARY KEY(\`id\`)
    )`,
    // Feed costs
    `CREATE TABLE IF NOT EXISTS \`feedCosts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`horseId\` int,
      \`feedType\` varchar(100) NOT NULL,
      \`brandName\` varchar(100),
      \`quantity\` varchar(50) NOT NULL,
      \`unit\` varchar(20),
      \`costPerUnit\` int NOT NULL,
      \`purchaseDate\` date NOT NULL,
      \`supplier\` varchar(200),
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`feedCosts_id\` PRIMARY KEY(\`id\`)
    )`,
    // Vaccinations
    `CREATE TABLE IF NOT EXISTS \`vaccinations\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`vaccineName\` varchar(200) NOT NULL,
      \`vaccineType\` varchar(100),
      \`dateAdministered\` date NOT NULL,
      \`nextDueDate\` date,
      \`batchNumber\` varchar(100),
      \`vetName\` varchar(100),
      \`vetClinic\` varchar(200),
      \`cost\` int,
      \`notes\` text,
      \`documentUrl\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`vaccinations_id\` PRIMARY KEY(\`id\`)
    )`,
    // Dewormings
    `CREATE TABLE IF NOT EXISTS \`dewormings\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`productName\` varchar(200) NOT NULL,
      \`activeIngredient\` varchar(200),
      \`dateAdministered\` date NOT NULL,
      \`nextDueDate\` date,
      \`dosage\` varchar(100),
      \`weight\` int,
      \`cost\` int,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`dewormings_id\` PRIMARY KEY(\`id\`)
    )`,
    // Share links
    `CREATE TABLE IF NOT EXISTS \`shareLinks\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`horseId\` int,
      \`linkType\` enum('horse','stable','medical_passport') NOT NULL,
      \`token\` varchar(100) NOT NULL,
      \`isPublic\` boolean NOT NULL DEFAULT false,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`expiresAt\` timestamp NULL,
      \`viewCount\` int NOT NULL DEFAULT 0,
      \`lastViewedAt\` timestamp NULL,
      \`settings\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`shareLinks_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`shareLinks_token_unique\` UNIQUE(\`token\`)
    )`,
    // Competitions
    `CREATE TABLE IF NOT EXISTS \`competitions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`horseId\` int NOT NULL,
      \`competitionName\` varchar(200) NOT NULL,
      \`venue\` varchar(200),
      \`date\` date NOT NULL,
      \`discipline\` varchar(100),
      \`level\` varchar(50),
      \`class\` varchar(100),
      \`placement\` varchar(50),
      \`score\` varchar(50),
      \`notes\` text,
      \`cost\` int,
      \`winnings\` int,
      \`documentUrl\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`competitions_id\` PRIMARY KEY(\`id\`)
    )`,
    // Document tags
    `CREATE TABLE IF NOT EXISTS \`documentTags\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`documentId\` int NOT NULL,
      \`tag\` varchar(100) NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`documentTags_id\` PRIMARY KEY(\`id\`)
    )`,
    // Competition results
    `CREATE TABLE IF NOT EXISTS \`competitionResults\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`competitionId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`horseId\` int NOT NULL,
      \`roundNumber\` int,
      \`score\` varchar(50),
      \`penalties\` int,
      \`time\` varchar(20),
      \`judgeScores\` text,
      \`technicalScore\` varchar(20),
      \`artisticScore\` varchar(20),
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`competitionResults_id\` PRIMARY KEY(\`id\`)
    )`,
    // Training program templates
    `CREATE TABLE IF NOT EXISTS \`trainingProgramTemplates\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`stableId\` int,
      \`name\` varchar(200) NOT NULL,
      \`description\` text,
      \`duration\` int,
      \`discipline\` varchar(100),
      \`level\` varchar(50),
      \`goals\` text,
      \`programData\` text NOT NULL,
      \`isPublic\` boolean NOT NULL DEFAULT false,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`trainingProgramTemplates_id\` PRIMARY KEY(\`id\`)
    )`,
    // Training programs
    `CREATE TABLE IF NOT EXISTS \`trainingPrograms\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`templateId\` int,
      \`name\` varchar(200) NOT NULL,
      \`startDate\` date NOT NULL,
      \`endDate\` date,
      \`status\` enum('active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
      \`progress\` int NOT NULL DEFAULT 0,
      \`programData\` text,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`trainingPrograms_id\` PRIMARY KEY(\`id\`)
    )`,
    // Reports
    `CREATE TABLE IF NOT EXISTS \`reports\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`stableId\` int,
      \`horseId\` int,
      \`reportType\` enum('monthly_summary','health_report','training_progress','cost_analysis','competition_summary') NOT NULL,
      \`title\` varchar(200) NOT NULL,
      \`reportData\` text NOT NULL,
      \`fileUrl\` text,
      \`generatedAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`reports_id\` PRIMARY KEY(\`id\`)
    )`,
    // Report schedules
    `CREATE TABLE IF NOT EXISTS \`reportSchedules\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`stableId\` int,
      \`reportType\` enum('monthly_summary','health_report','training_progress','cost_analysis','competition_summary') NOT NULL,
      \`frequency\` enum('daily','weekly','monthly','quarterly') NOT NULL,
      \`recipients\` text,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`lastRunAt\` timestamp NULL,
      \`nextRunAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`reportSchedules_id\` PRIMARY KEY(\`id\`)
    )`,
    // Breeding
    `CREATE TABLE IF NOT EXISTS \`breeding\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`mareId\` int NOT NULL,
      \`stallionId\` int,
      \`stallionName\` varchar(200),
      \`breedingDate\` date NOT NULL,
      \`method\` varchar(100),
      \`veterinarianName\` varchar(100),
      \`cost\` int,
      \`pregnancyConfirmed\` boolean NOT NULL DEFAULT false,
      \`confirmationDate\` date,
      \`dueDate\` date,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`breeding_id\` PRIMARY KEY(\`id\`)
    )`,
    // Foals
    `CREATE TABLE IF NOT EXISTS \`foals\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`breedingId\` int,
      \`horseId\` int,
      \`birthDate\` date NOT NULL,
      \`gender\` enum('colt','filly','gelding') NOT NULL,
      \`name\` varchar(200),
      \`color\` varchar(100),
      \`markings\` text,
      \`birthWeight\` int,
      \`currentWeight\` int,
      \`healthStatus\` enum('healthy','needs_attention','critical') NOT NULL DEFAULT 'healthy',
      \`milestones\` text,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`foals_id\` PRIMARY KEY(\`id\`)
    )`,
    // Pedigree
    `CREATE TABLE IF NOT EXISTS \`pedigree\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`sireId\` int,
      \`sireName\` varchar(200),
      \`damId\` int,
      \`damName\` varchar(200),
      \`sireOfSireId\` int,
      \`sireOfSireName\` varchar(200),
      \`damOfSireId\` int,
      \`damOfSireName\` varchar(200),
      \`sireOfDamId\` int,
      \`sireOfDamName\` varchar(200),
      \`damOfDamId\` int,
      \`damOfDamName\` varchar(200),
      \`geneticInfo\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`pedigree_id\` PRIMARY KEY(\`id\`)
    )`,
    // Lesson bookings
    `CREATE TABLE IF NOT EXISTS \`lessonBookings\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`trainerId\` int NOT NULL,
      \`clientId\` int NOT NULL,
      \`horseId\` int,
      \`lessonDate\` timestamp NOT NULL,
      \`duration\` int NOT NULL,
      \`lessonType\` varchar(100),
      \`location\` varchar(200),
      \`status\` enum('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
      \`fee\` int,
      \`paid\` boolean NOT NULL DEFAULT false,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`lessonBookings_id\` PRIMARY KEY(\`id\`)
    )`,
    // Trainer availability
    `CREATE TABLE IF NOT EXISTS \`trainerAvailability\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`trainerId\` int NOT NULL,
      \`dayOfWeek\` int NOT NULL,
      \`startTime\` varchar(5) NOT NULL,
      \`endTime\` varchar(5) NOT NULL,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`trainerAvailability_id\` PRIMARY KEY(\`id\`)
    )`,
    // Account features
    `CREATE TABLE IF NOT EXISTS \`accountFeatures\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`horsesEnabled\` boolean NOT NULL DEFAULT true,
      \`healthEnabled\` boolean NOT NULL DEFAULT true,
      \`trainingEnabled\` boolean NOT NULL DEFAULT true,
      \`breedingEnabled\` boolean NOT NULL DEFAULT false,
      \`financeEnabled\` boolean NOT NULL DEFAULT false,
      \`salesEnabled\` boolean NOT NULL DEFAULT false,
      \`teamsEnabled\` boolean NOT NULL DEFAULT false,
      \`advancedReportsEnabled\` boolean NOT NULL DEFAULT false,
      \`peppolEnabled\` boolean NOT NULL DEFAULT false,
      \`aiInvoiceScanEnabled\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`accountFeatures_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`accountFeatures_userId_unique\` UNIQUE(\`userId\`)
    )`,
    // API keys
    `CREATE TABLE IF NOT EXISTS \`apiKeys\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`stableId\` int,
      \`name\` varchar(100) NOT NULL,
      \`keyHash\` varchar(255) NOT NULL,
      \`keyPrefix\` varchar(20) NOT NULL,
      \`permissions\` text,
      \`rateLimit\` int NOT NULL DEFAULT 100,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`lastUsedAt\` timestamp NULL,
      \`expiresAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`apiKeys_id\` PRIMARY KEY(\`id\`)
    )`,
    // Webhooks
    `CREATE TABLE IF NOT EXISTS \`webhooks\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`stableId\` int,
      \`url\` text NOT NULL,
      \`events\` text NOT NULL,
      \`secret\` varchar(255) NOT NULL,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`lastTriggeredAt\` timestamp NULL,
      \`failureCount\` int DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`webhooks_id\` PRIMARY KEY(\`id\`)
    )`,
    // Stripe events
    `CREATE TABLE IF NOT EXISTS \`stripeEvents\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`eventId\` varchar(255) NOT NULL,
      \`eventType\` varchar(100) NOT NULL,
      \`processed\` boolean NOT NULL DEFAULT false,
      \`payload\` text,
      \`error\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`processedAt\` timestamp NULL,
      CONSTRAINT \`stripeEvents_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`stripeEvents_eventId_unique\` UNIQUE(\`eventId\`)
    )`,
    // Message threads
    `CREATE TABLE IF NOT EXISTS \`messageThreads\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`stableId\` int NOT NULL,
      \`title\` varchar(200),
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`messageThreads_id\` PRIMARY KEY(\`id\`)
    )`,
    // Messages
    `CREATE TABLE IF NOT EXISTS \`messages\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`threadId\` int NOT NULL,
      \`senderId\` int NOT NULL,
      \`content\` text NOT NULL,
      \`attachments\` text,
      \`isRead\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`messages_id\` PRIMARY KEY(\`id\`)
    )`,
    // Tasks
    `CREATE TABLE IF NOT EXISTS \`tasks\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`horseId\` int,
      \`title\` varchar(200) NOT NULL,
      \`description\` text,
      \`taskType\` enum('hoofcare','health_appointment','treatment','vaccination','deworming','dental','general_care','training','feeding','other') NOT NULL,
      \`priority\` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
      \`status\` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
      \`dueDate\` date,
      \`completedAt\` timestamp NULL,
      \`assignedTo\` varchar(100),
      \`notes\` text,
      \`reminderDays\` int DEFAULT 1,
      \`isRecurring\` boolean NOT NULL DEFAULT false,
      \`recurringInterval\` enum('daily','weekly','biweekly','monthly','quarterly','yearly'),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`tasks_id\` PRIMARY KEY(\`id\`)
    )`,
    // Contacts
    `CREATE TABLE IF NOT EXISTS \`contacts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`contactType\` enum('vet','farrier','trainer','instructor','stable','breeder','supplier','emergency','other') NOT NULL,
      \`company\` varchar(200),
      \`email\` varchar(320),
      \`phone\` varchar(20),
      \`mobile\` varchar(20),
      \`address\` text,
      \`city\` varchar(100),
      \`postcode\` varchar(20),
      \`country\` varchar(100) DEFAULT 'United Kingdom',
      \`website\` varchar(500),
      \`notes\` text,
      \`isPrimary\` boolean NOT NULL DEFAULT false,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`contacts_id\` PRIMARY KEY(\`id\`)
    )`,
    // Treatments
    `CREATE TABLE IF NOT EXISTS \`treatments\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`treatmentType\` varchar(100) NOT NULL,
      \`treatmentName\` varchar(200) NOT NULL,
      \`description\` text,
      \`startDate\` date NOT NULL,
      \`endDate\` date,
      \`frequency\` varchar(100),
      \`dosage\` varchar(200),
      \`administeredBy\` varchar(100),
      \`vetName\` varchar(100),
      \`vetClinic\` varchar(200),
      \`cost\` int,
      \`status\` enum('active','completed','discontinued') NOT NULL DEFAULT 'active',
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`treatments_id\` PRIMARY KEY(\`id\`)
    )`,
    // Appointments
    `CREATE TABLE IF NOT EXISTS \`appointments\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`appointmentType\` varchar(100) NOT NULL,
      \`title\` varchar(200) NOT NULL,
      \`description\` text,
      \`appointmentDate\` date NOT NULL,
      \`appointmentTime\` varchar(10),
      \`duration\` int,
      \`providerName\` varchar(100),
      \`providerPhone\` varchar(20),
      \`providerClinic\` varchar(200),
      \`location\` varchar(200),
      \`cost\` int,
      \`status\` enum('scheduled','confirmed','completed','cancelled') NOT NULL DEFAULT 'scheduled',
      \`reminderSent\` boolean NOT NULL DEFAULT false,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`appointments_id\` PRIMARY KEY(\`id\`)
    )`,
    // Dental care
    `CREATE TABLE IF NOT EXISTS \`dentalCare\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`examDate\` date NOT NULL,
      \`dentistName\` varchar(100),
      \`dentistClinic\` varchar(200),
      \`procedureType\` varchar(200),
      \`findings\` text,
      \`treatmentPerformed\` text,
      \`nextDueDate\` date,
      \`cost\` int,
      \`sedationUsed\` boolean NOT NULL DEFAULT false,
      \`teethCondition\` enum('excellent','good','fair','poor'),
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`dentalCare_id\` PRIMARY KEY(\`id\`)
    )`,
    // X-rays
    `CREATE TABLE IF NOT EXISTS \`xrays\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`xrayDate\` date NOT NULL,
      \`bodyPart\` varchar(100) NOT NULL,
      \`reason\` varchar(200),
      \`vetName\` varchar(100),
      \`vetClinic\` varchar(200),
      \`findings\` text,
      \`diagnosis\` text,
      \`fileUrl\` text,
      \`fileName\` varchar(255),
      \`fileSize\` int,
      \`mimeType\` varchar(100),
      \`cost\` int,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`xrays_id\` PRIMARY KEY(\`id\`)
    )`,
    // Tags
    `CREATE TABLE IF NOT EXISTS \`tags\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`name\` varchar(100) NOT NULL,
      \`color\` varchar(20),
      \`category\` varchar(50),
      \`description\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`tags_id\` PRIMARY KEY(\`id\`)
    )`,
    // Horse-tag assignments (many-to-many)
    `CREATE TABLE IF NOT EXISTS \`horseTags\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`tagId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`horseTags_id\` PRIMARY KEY(\`id\`),
      UNIQUE KEY \`horseTags_horse_tag_unique\` (\`horseId\`, \`tagId\`)
    )`,
    // Hoofcare
    `CREATE TABLE IF NOT EXISTS \`hoofcare\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`careDate\` date NOT NULL,
      \`careType\` enum('shoeing','trimming','remedial','inspection','other') NOT NULL,
      \`farrierName\` varchar(100),
      \`farrierPhone\` varchar(20),
      \`hoofCondition\` enum('excellent','good','fair','poor'),
      \`shoesType\` varchar(100),
      \`findings\` text,
      \`workPerformed\` text,
      \`nextDueDate\` date,
      \`cost\` int,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`hoofcare_id\` PRIMARY KEY(\`id\`)
    )`,
    // Nutrition logs
    `CREATE TABLE IF NOT EXISTS \`nutritionLogs\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`logDate\` date NOT NULL,
      \`feedType\` varchar(100) NOT NULL,
      \`feedName\` varchar(200),
      \`amount\` varchar(100),
      \`mealTime\` varchar(50),
      \`supplements\` text,
      \`hay\` varchar(100),
      \`water\` varchar(100),
      \`bodyConditionScore\` int,
      \`weight\` int,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`nutritionLogs_id\` PRIMARY KEY(\`id\`)
    )`,
    // Nutrition plans
    `CREATE TABLE IF NOT EXISTS \`nutritionPlans\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`horseId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`planName\` varchar(200) NOT NULL,
      \`startDate\` date NOT NULL,
      \`endDate\` date,
      \`targetWeight\` int,
      \`targetBodyCondition\` int,
      \`dailyHay\` varchar(100),
      \`dailyConcentrates\` varchar(200),
      \`supplements\` text,
      \`specialInstructions\` text,
      \`feedingSchedule\` text,
      \`caloriesPerDay\` int,
      \`proteinPerDay\` varchar(50),
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`notes\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`nutritionPlans_id\` PRIMARY KEY(\`id\`)
    )`,
    // Email campaigns — admin marketing/outreach (migration 0012)
    `CREATE TABLE IF NOT EXISTS \`emailCampaigns\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`subject\` varchar(500) NOT NULL,
      \`htmlBody\` text NOT NULL,
      \`templateId\` varchar(50),
      \`segment\` varchar(50) NOT NULL,
      \`customFilter\` text,
      \`recipientCount\` int NOT NULL DEFAULT 0,
      \`sentCount\` int NOT NULL DEFAULT 0,
      \`failedCount\` int NOT NULL DEFAULT 0,
      \`status\` varchar(30) NOT NULL DEFAULT 'draft',
      \`sentAt\` timestamp NULL,
      \`sentByUserId\` int,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`emailCampaigns_id\` PRIMARY KEY(\`id\`)
    )`,
    // Email campaign recipients — tracks individual sends (migration 0012)
    `CREATE TABLE IF NOT EXISTS \`emailCampaignRecipients\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`campaignId\` int NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`name\` varchar(200),
      \`status\` varchar(30) NOT NULL DEFAULT 'pending',
      \`sentAt\` timestamp NULL,
      \`error\` text,
      CONSTRAINT \`emailCampaignRecipients_id\` PRIMARY KEY(\`id\`)
    )`,
    // Site analytics — lightweight page view / session tracking (migration 0012)
    `CREATE TABLE IF NOT EXISTS \`siteAnalytics\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`sessionId\` varchar(64) NOT NULL,
      \`visitorId\` varchar(64) NOT NULL,
      \`path\` varchar(500) NOT NULL,
      \`referrer\` varchar(500),
      \`userAgent\` varchar(500),
      \`deviceType\` varchar(20),
      \`country\` varchar(10),
      \`duration\` int DEFAULT 0,
      \`isCtaClick\` boolean DEFAULT false,
      \`ctaType\` varchar(50),
      \`userId\` int,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`siteAnalytics_id\` PRIMARY KEY(\`id\`)
    )`,
    // Marketing contacts — external leads (migration 0014 + 0016)
    `CREATE TABLE IF NOT EXISTS \`marketingContacts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`name\` varchar(200),
      \`businessName\` varchar(300),
      \`organizationName\` varchar(300),
      \`contactType\` varchar(50) DEFAULT 'individual',
      \`source\` varchar(100) DEFAULT 'manual',
      \`tags\` text,
      \`region\` varchar(100),
      \`country\` varchar(100),
      \`leadFocus\` varchar(200),
      \`status\` varchar(30) NOT NULL DEFAULT 'active',
      \`unsubscribeToken\` varchar(64) NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      \`lastContactedAt\` timestamp NULL,
      CONSTRAINT \`marketingContacts_id\` PRIMARY KEY(\`id\`),
      UNIQUE KEY \`idx_mc_email\` (\`email\`),
      KEY \`idx_mc_status\` (\`status\`),
      KEY \`idx_mc_unsub_token\` (\`unsubscribeToken\`)
    )`,
    // Email unsubscribes — global suppression list (migration 0014)
    `CREATE TABLE IF NOT EXISTS \`emailUnsubscribes\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`token\` varchar(64) NOT NULL,
      \`reason\` varchar(200),
      \`source\` varchar(50) DEFAULT 'link',
      \`unsubscribedAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`emailUnsubscribes_id\` PRIMARY KEY(\`id\`),
      UNIQUE KEY \`idx_unsub_email\` (\`email\`),
      KEY \`idx_unsub_token\` (\`token\`)
    )`,
    // Campaign sequences — drip steps (migration 0014 + 0016)
    `CREATE TABLE IF NOT EXISTS \`campaignSequences\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`campaignId\` int NOT NULL,
      \`stepNumber\` int NOT NULL,
      \`delayDays\` int NOT NULL,
      \`scheduledDate\` varchar(10),
      \`subject\` varchar(500) NOT NULL,
      \`htmlBody\` text NOT NULL,
      \`templateId\` varchar(50),
      \`status\` varchar(30) NOT NULL DEFAULT 'pending',
      \`sentAt\` timestamp NULL,
      \`sentCount\` int NOT NULL DEFAULT 0,
      \`failedCount\` int NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`campaignSequences_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_seq_campaign\` (\`campaignId\`)
    )`,
    // Campaign sequence recipients — per-step delivery tracking (migration 0014)
    `CREATE TABLE IF NOT EXISTS \`campaignSequenceRecipients\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`sequenceId\` int NOT NULL,
      \`campaignId\` int NOT NULL,
      \`email\` varchar(320) NOT NULL,
      \`status\` varchar(30) NOT NULL DEFAULT 'pending',
      \`sentAt\` timestamp NULL,
      \`error\` text,
      CONSTRAINT \`campaignSequenceRecipients_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_seqr_sequence\` (\`sequenceId\`),
      KEY \`idx_seqr_campaign\` (\`campaignId\`),
      KEY \`idx_seqr_email\` (\`email\`)
    )`,
    // Campaign send log — daily send count for rate limiting (migration 0016)
    `CREATE TABLE IF NOT EXISTS \`campaignSendLog\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`campaignId\` int NOT NULL,
      \`sendDate\` varchar(10) NOT NULL,
      \`sendCount\` int NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`campaignSendLog_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_csl_campaign_date\` (\`campaignId\`, \`sendDate\`)
    )`,
    // Marketing App backend foundation (PR40)
    `CREATE TABLE IF NOT EXISTS \`marketingCampaigns\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL DEFAULT 'global',
      \`workspaceId\` varchar(120) NOT NULL DEFAULT 'default',
      \`hostAppId\` varchar(120) NOT NULL DEFAULT 'equiprofile',
      \`name\` varchar(220) NOT NULL,
      \`goal\` text,
      \`audience\` text,
      \`channelsJson\` text,
      \`startDate\` date,
      \`durationDays\` int NOT NULL DEFAULT 7,
      \`status\` varchar(30) NOT NULL DEFAULT 'draft',
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`marketingCampaigns_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_marketingCampaigns_tenant_workspace\` (\`tenantId\`, \`workspaceId\`),
      KEY \`idx_marketingCampaigns_status\` (\`status\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`marketingCampaignItems\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`campaignId\` int NOT NULL,
      \`tenantId\` varchar(100) NOT NULL DEFAULT 'global',
      \`type\` varchar(30) NOT NULL DEFAULT 'post',
      \`platform\` varchar(80),
      \`title\` varchar(260),
      \`content\` text,
      \`prompt\` text,
      \`status\` varchar(30) NOT NULL DEFAULT 'export_only',
      \`scheduledFor\` timestamp NULL,
      \`metadataJson\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`marketingCampaignItems_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_marketingCampaignItems_campaign\` (\`campaignId\`),
      KEY \`idx_marketingCampaignItems_tenant\` (\`tenantId\`),
      KEY \`idx_marketingCampaignItems_platform_status\` (\`platform\`, \`status\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`marketingCampaignAssets\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`campaignId\` int NOT NULL,
      \`campaignItemId\` int,
      \`mediaAssetId\` int NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`marketingCampaignAssets_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_marketingCampaignAssets_campaign\` (\`campaignId\`),
      KEY \`idx_marketingCampaignAssets_item\` (\`campaignItemId\`),
      KEY \`idx_marketingCampaignAssets_media\` (\`mediaAssetId\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`marketingSocialConnections\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL DEFAULT 'global',
      \`workspaceId\` varchar(120) NOT NULL DEFAULT 'default',
      \`platform\` varchar(50) NOT NULL,
      \`status\` varchar(40) NOT NULL DEFAULT 'not_connected',
      \`accountName\` varchar(200),
      \`requiredScopesJson\` text,
      \`lastCheckedAt\` timestamp NULL,
      \`metadataJson\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`marketingSocialConnections_id\` PRIMARY KEY(\`id\`),
      UNIQUE KEY \`uniq_marketingSocialConnections_scope\` (\`tenantId\`, \`workspaceId\`, \`platform\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`marketingScheduleDrafts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL DEFAULT 'global',
      \`workspaceId\` varchar(120) NOT NULL DEFAULT 'default',
      \`campaignId\` int,
      \`campaignItemId\` int,
      \`platform\` varchar(80) NOT NULL,
      \`title\` varchar(260) NOT NULL,
      \`content\` text,
      \`scheduledFor\` timestamp NOT NULL,
      \`status\` varchar(30) NOT NULL DEFAULT 'draft',
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`marketingScheduleDrafts_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_marketingScheduleDrafts_scope\` (\`tenantId\`, \`workspaceId\`),
      KEY \`idx_marketingScheduleDrafts_scheduled\` (\`scheduledFor\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`marketingRenderJobs\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL DEFAULT 'global',
      \`workspaceId\` varchar(120) NOT NULL DEFAULT 'default',
      \`hostAppId\` varchar(120) NOT NULL DEFAULT 'equiprofile',
      \`planId\` varchar(120),
      \`campaignId\` int,
      \`campaignItemId\` int,
      \`status\` varchar(40) NOT NULL DEFAULT 'queued',
      \`contentType\` varchar(80) NOT NULL,
      \`originalUserPrompt\` text NOT NULL,
      \`renderMode\` varchar(40) NOT NULL DEFAULT 'assembled_video',
      \`durationTargetSeconds\` int NOT NULL DEFAULT 0,
      \`timelineJson\` text NOT NULL,
      \`captionJson\` text NOT NULL,
      \`brandOverlayJson\` text NOT NULL,
      \`outputMediaAssetId\` int,
      \`outputPublicUrl\` text,
      \`errorMessage\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      \`completedAt\` timestamp NULL,
      CONSTRAINT \`marketingRenderJobs_id\` PRIMARY KEY(\`id\`)
    )`,
    // Growth Engine queue + persistence foundations (Phase 4)
    `CREATE TABLE IF NOT EXISTS \`growthQueueJobs\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`queueType\` varchar(40) NOT NULL,
      \`status\` varchar(40) NOT NULL,
      \`task\` varchar(80),
      \`provider\` varchar(50),
      \`tenantType\` varchar(50) NOT NULL DEFAULT 'individual',
      \`tenantId\` varchar(100) NOT NULL DEFAULT 'global',
      \`createdByUserId\` int,
      \`reviewedByUserId\` int,
      \`payloadJson\` text NOT NULL,
      \`outputJson\` text,
      \`metadataJson\` text,
      \`attempts\` int NOT NULL DEFAULT 0,
      \`maxAttempts\` int NOT NULL DEFAULT 3,
      \`errorMessage\` text,
      \`rejectionReason\` text,
      \`runAfter\` timestamp NOT NULL DEFAULT (now()),
      \`scheduleAt\` timestamp NULL,
      \`completedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`growthQueueJobs_id\` PRIMARY KEY(\`id\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`growthSocialConnections\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL,
      \`platform\` varchar(50) NOT NULL,
      \`state\` varchar(40) NOT NULL DEFAULT 'not_connected',
      \`encryptedAccessToken\` text,
      \`encryptedRefreshToken\` text,
      \`tokenExpiresAt\` timestamp NULL,
      \`metadataJson\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`growthSocialConnections_id\` PRIMARY KEY(\`id\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`growthOnboardingFlows\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`tenantId\` varchar(100) NOT NULL,
      \`onboardingType\` varchar(40) NOT NULL,
      \`status\` varchar(30) NOT NULL DEFAULT 'not_started',
      \`step\` int NOT NULL DEFAULT 1,
      \`progressPercent\` int NOT NULL DEFAULT 0,
      \`checklistJson\` text,
      \`quickWinsJson\` text,
      \`completedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`growthOnboardingFlows_id\` PRIMARY KEY(\`id\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`growthAutomationRuns\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL,
      \`contactId\` int,
      \`workflowKey\` varchar(120) NOT NULL,
      \`runStatus\` varchar(30) NOT NULL,
      \`triggerSource\` varchar(60) NOT NULL,
      \`triggerEvent\` varchar(80) NOT NULL,
      \`runAt\` timestamp NOT NULL DEFAULT (now()),
      \`payloadJson\` text,
      \`outcomeJson\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`growthAutomationRuns_id\` PRIMARY KEY(\`id\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`growthReferrals\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL,
      \`inviterUserId\` int,
      \`inviteeEmail\` varchar(320),
      \`referralType\` varchar(40) NOT NULL,
      \`source\` varchar(80) NOT NULL,
      \`referralCode\` varchar(80) NOT NULL,
      \`status\` varchar(30) NOT NULL DEFAULT 'sent',
      \`convertedAt\` timestamp NULL,
      \`metadataJson\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`growthReferrals_id\` PRIMARY KEY(\`id\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`growthAnalyticsEvents\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL,
      \`actorUserId\` int,
      \`eventType\` varchar(100) NOT NULL,
      \`stage\` varchar(80) NOT NULL,
      \`source\` varchar(80),
      \`metadataJson\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`growthAnalyticsEvents_id\` PRIMARY KEY(\`id\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`growthFeedback\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`tenantId\` varchar(100) NOT NULL,
      \`userId\` int,
      \`feedbackType\` varchar(40) NOT NULL,
      \`title\` varchar(240) NOT NULL,
      \`description\` text NOT NULL,
      \`satisfactionScore\` int,
      \`status\` varchar(30) NOT NULL DEFAULT 'new',
      \`metadataJson\` text,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`growthFeedback_id\` PRIMARY KEY(\`id\`)
    )`,
    // ── Student system tables (migration 0015) ──────────────────────────────
    // Virtual horses for student learning
    `CREATE TABLE IF NOT EXISTS \`virtualHorses\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`name\` varchar(100) NOT NULL,
      \`breed\` varchar(100),
      \`color\` varchar(50),
      \`age\` int,
      \`personality\` varchar(100),
      \`feedingScore\` int NOT NULL DEFAULT 80,
      \`groomingScore\` int NOT NULL DEFAULT 80,
      \`exerciseScore\` int NOT NULL DEFAULT 80,
      \`healthScore\` int NOT NULL DEFAULT 80,
      \`overallScore\` int NOT NULL DEFAULT 80,
      \`photoUrl\` text,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`virtualHorses_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_virtualHorses_userId\` (\`userId\`)
    )`,
    // Student horse assignments (links student to a real horse)
    `CREATE TABLE IF NOT EXISTS \`studentHorseAssignments\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`studentUserId\` int NOT NULL,
      \`horseId\` int NOT NULL,
      \`assignedBy\` int,
      \`stableId\` int,
      \`notes\` text,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`assignedAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`studentHorseAssignments_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_sha_studentUserId\` (\`studentUserId\`),
      KEY \`idx_sha_horseId\` (\`horseId\`)
    )`,
    // Student tasks (daily/weekly care and learning tasks)
    `CREATE TABLE IF NOT EXISTS \`studentTasks\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`title\` varchar(200) NOT NULL,
      \`description\` text,
      \`category\` varchar(50) NOT NULL DEFAULT 'care',
      \`frequency\` varchar(20) NOT NULL DEFAULT 'daily',
      \`targetDate\` date,
      \`isCompleted\` boolean NOT NULL DEFAULT false,
      \`completedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`studentTasks_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_studentTasks_userId\` (\`userId\`)
    )`,
    // Student training entries (simplified training log)
    `CREATE TABLE IF NOT EXISTS \`studentTrainingEntries\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`title\` varchar(200) NOT NULL,
      \`sessionDate\` date NOT NULL,
      \`duration\` int,
      \`sessionType\` varchar(50) NOT NULL DEFAULT 'lesson',
      \`notes\` text,
      \`wentWell\` text,
      \`needsImprovement\` text,
      \`instructor\` varchar(100),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`studentTrainingEntries_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_ste_userId\` (\`userId\`)
    )`,
    // Student progress (skill tracking)
    `CREATE TABLE IF NOT EXISTS \`studentProgress\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`skillArea\` varchar(100) NOT NULL,
      \`level\` int NOT NULL DEFAULT 1,
      \`xp\` int NOT NULL DEFAULT 0,
      \`lastActivityAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`studentProgress_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_sp_userId\` (\`userId\`)
    )`,
    // Study topics (structured learning content)
    `CREATE TABLE IF NOT EXISTS \`studyTopics\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`slug\` varchar(80) NOT NULL,
      \`title\` varchar(200) NOT NULL,
      \`description\` text,
      \`category\` varchar(80) NOT NULL,
      \`difficulty\` varchar(20) NOT NULL DEFAULT 'beginner',
      \`contentMd\` text,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`isPublished\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`studyTopics_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_studyTopics_category\` (\`category\`)
    )`,
    // AI tutor sessions (usage logging and cost tracking)
    `CREATE TABLE IF NOT EXISTS \`aiTutorSessions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`question\` text NOT NULL,
      \`answer\` text,
      \`modelUsed\` varchar(100),
      \`tier\` varchar(20) NOT NULL DEFAULT 'standard',
      \`promptTokens\` int NOT NULL DEFAULT 0,
      \`completionTokens\` int NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`aiTutorSessions_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_ats_userId\` (\`userId\`)
    )`,
    // Phase 3 — Student groups
    `CREATE TABLE IF NOT EXISTS \`studentGroups\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`description\` text,
      \`level\` varchar(30) NOT NULL DEFAULT 'beginner',
      \`academicYear\` varchar(20),
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`studentGroups_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_sg_teacherId\` (\`teacherId\`)
    )`,
    // Phase 3 — Student group members
    `CREATE TABLE IF NOT EXISTS \`studentGroupMembers\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`groupId\` int NOT NULL,
      \`studentUserId\` int NOT NULL,
      \`joinedAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`studentGroupMembers_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_sgm_groupId\` (\`groupId\`),
      KEY \`idx_sgm_studentUserId\` (\`studentUserId\`)
    )`,
    // Phase 3 — Teacher assigned tasks
    `CREATE TABLE IF NOT EXISTS \`teacherAssignedTasks\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`studentUserId\` int,
      \`groupId\` int,
      \`title\` varchar(200) NOT NULL,
      \`description\` text,
      \`category\` varchar(50) NOT NULL DEFAULT 'care',
      \`dueDate\` date,
      \`frequency\` varchar(20) NOT NULL DEFAULT 'once',
      \`isCompleted\` boolean NOT NULL DEFAULT false,
      \`completedAt\` timestamp NULL,
      \`completedByStudentId\` int,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`teacherAssignedTasks_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_tat_teacherId\` (\`teacherId\`),
      KEY \`idx_tat_studentUserId\` (\`studentUserId\`)
    )`,
    // Phase 3 — Teacher feedback
    `CREATE TABLE IF NOT EXISTS \`teacherFeedback\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`studentUserId\` int NOT NULL,
      \`entryType\` varchar(50) NOT NULL,
      \`entryId\` int,
      \`comment\` text NOT NULL,
      \`feedbackType\` varchar(30) NOT NULL DEFAULT 'general',
      \`isRead\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`teacherFeedback_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_tf_studentUserId\` (\`studentUserId\`),
      KEY \`idx_tf_teacherId\` (\`teacherId\`)
    )`,
    // Phase 3 — Learning pathway progress
    `CREATE TABLE IF NOT EXISTS \`learningPathwayProgress\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`studentUserId\` int NOT NULL,
      \`pathwayLevel\` varchar(30) NOT NULL,
      \`itemType\` varchar(30) NOT NULL,
      \`itemSlug\` varchar(100) NOT NULL,
      \`completedAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`learningPathwayProgress_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_lpp_studentUserId\` (\`studentUserId\`)
    )`,
    // Lesson Engine — structured learning pathways (migration 0017)
    `CREATE TABLE IF NOT EXISTS \`lessonPathways\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`slug\` varchar(100) NOT NULL,
      \`title\` varchar(200) NOT NULL,
      \`description\` text,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`iconName\` varchar(50),
      \`isPublished\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`lessonPathways_id\` PRIMARY KEY(\`id\`),
      UNIQUE KEY \`lessonPathways_slug\` (\`slug\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`lessonUnits\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`slug\` varchar(150) NOT NULL,
      \`pathwaySlug\` varchar(100) NOT NULL,
      \`title\` varchar(250) NOT NULL,
      \`level\` varchar(30) NOT NULL,
      \`category\` varchar(60) NOT NULL,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`objectives\` text NOT NULL,
      \`content\` text NOT NULL,
      \`keyPoints\` text NOT NULL,
      \`safetyNote\` text NOT NULL,
      \`practicalApplication\` text NOT NULL,
      \`commonMistakes\` text NOT NULL,
      \`knowledgeCheck\` text NOT NULL,
      \`aiTutorPrompts\` text NOT NULL,
      \`isPublished\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`lessonUnits_id\` PRIMARY KEY(\`id\`),
      UNIQUE KEY \`lessonUnits_slug\` (\`slug\`),
      KEY \`idx_lessonUnits_pathwaySlug\` (\`pathwaySlug\`),
      KEY \`idx_lessonUnits_level\` (\`level\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`lessonCompletion\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`studentUserId\` int NOT NULL,
      \`lessonSlug\` varchar(150) NOT NULL,
      \`pathwaySlug\` varchar(100) NOT NULL,
      \`level\` varchar(30) NOT NULL,
      \`score\` int,
      \`completedAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`lessonCompletion_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_lessonCompletion_studentUserId\` (\`studentUserId\`),
      KEY \`idx_lessonCompletion_lessonSlug\` (\`lessonSlug\`)
    )`,
    // Competency system + teacher lesson assignment + lesson reviews (migration 0018)
    `CREATE TABLE IF NOT EXISTS \`studentCompetencies\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`competencyKey\` varchar(100) NOT NULL,
      \`category\` varchar(100) NOT NULL,
      \`level\` varchar(30) NOT NULL DEFAULT 'beginner',
      \`status\` enum('not_assessed','in_progress','achieved','needs_support') NOT NULL DEFAULT 'not_assessed',
      \`teacherComment\` text,
      \`signedOffBy\` int,
      \`signedOffAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`studentCompetencies_id\` PRIMARY KEY(\`id\`),
      UNIQUE KEY \`idx_studentCompetencies_unique\` (\`userId\`, \`competencyKey\`),
      KEY \`idx_studentCompetencies_userId\` (\`userId\`),
      KEY \`idx_studentCompetencies_status\` (\`status\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`teacherLessonAssignments\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`studentUserId\` int,
      \`groupId\` int,
      \`assignmentType\` enum('lesson','pathway') NOT NULL DEFAULT 'lesson',
      \`lessonSlug\` varchar(150),
      \`pathwaySlug\` varchar(100),
      \`dueDate\` date,
      \`instructions\` text,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`teacherLessonAssignments_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_teacherLessonAssignments_teacherId\` (\`teacherId\`),
      KEY \`idx_teacherLessonAssignments_studentUserId\` (\`studentUserId\`),
      KEY \`idx_teacherLessonAssignments_groupId\` (\`groupId\`)
    )`,
    `CREATE TABLE IF NOT EXISTS \`lessonReviews\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`studentUserId\` int NOT NULL,
      \`lessonSlug\` varchar(150) NOT NULL,
      \`lessonCompletionId\` int,
      \`reviewStatus\` enum('satisfactory','needs_improvement') NOT NULL DEFAULT 'satisfactory',
      \`feedback\` text,
      \`recommendedNextLesson\` varchar(150),
      \`competencyKey\` varchar(100),
      \`isRead\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`lessonReviews_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_lessonReviews_teacherId\` (\`teacherId\`),
      KEY \`idx_lessonReviews_studentUserId\` (\`studentUserId\`),
      KEY \`idx_lessonReviews_lessonSlug\` (\`lessonSlug\`)
    )`,

    // ── Organization / School System tables ─────────────────────────────
    `CREATE TABLE IF NOT EXISTS \`organizations\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`ownerId\` int NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`description\` text,
      \`planTier\` varchar(30) NOT NULL DEFAULT 'school_10',
      \`maxStudents\` int NOT NULL DEFAULT 10,
      \`maxTeachers\` int NOT NULL DEFAULT 3,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`trialEndsAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`organizations_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_organizations_ownerId\` (\`ownerId\`)
    )`,

    `CREATE TABLE IF NOT EXISTS \`organizationMembers\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`organizationId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`role\` varchar(30) NOT NULL,
      \`joinedAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`organizationMembers_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_orgMembers_orgId\` (\`organizationId\`),
      KEY \`idx_orgMembers_userId\` (\`userId\`)
    )`,

    `CREATE TABLE IF NOT EXISTS \`organizationInvites\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`organizationId\` int NOT NULL,
      \`invitedEmail\` varchar(320) NOT NULL,
      \`role\` varchar(30) NOT NULL,
      \`token\` varchar(64) NOT NULL,
      \`expiresAt\` timestamp NOT NULL,
      \`acceptedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`organizationInvites_id\` PRIMARY KEY(\`id\`),
      UNIQUE KEY \`organizationInvites_token\` (\`token\`)
    )`,

    // ── Teacher Resources table ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS \`teacherResources\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`title\` varchar(250) NOT NULL,
      \`description\` text,
      \`fileUrl\` varchar(1000) NOT NULL,
      \`fileType\` varchar(30) NOT NULL,
      \`fileSize\` int,
      \`shareScope\` varchar(20) NOT NULL DEFAULT 'all',
      \`groupId\` int,
      \`studentId\` int,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`teacherResources_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_teacherResources_teacherId\` (\`teacherId\`)
    )`,

    // ── Student Assignments table ────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS \`studentAssignments\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`studentId\` int NOT NULL,
      \`title\` varchar(250) NOT NULL,
      \`description\` text,
      \`dueDate\` timestamp NULL,
      \`status\` varchar(30) NOT NULL DEFAULT 'pending',
      \`submissionUrl\` varchar(1000),
      \`submittedAt\` timestamp NULL,
      \`grade\` varchar(20),
      \`feedback\` text,
      \`reviewedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`studentAssignments_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_studentAssignments_teacherId\` (\`teacherId\`),
      KEY \`idx_studentAssignments_studentId\` (\`studentId\`)
    )`,

    // ── Report Templates table ───────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS \`reportTemplates\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int,
      \`name\` varchar(200) NOT NULL,
      \`description\` text,
      \`templateData\` text NOT NULL,
      \`isSystem\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`reportTemplates_id\` PRIMARY KEY(\`id\`)
    )`,

    // ── Student Reports table ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS \`studentReports\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`studentId\` int NOT NULL,
      \`templateId\` int,
      \`title\` varchar(250) NOT NULL,
      \`reportData\` text NOT NULL,
      \`sentAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`studentReports_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_studentReports_teacherId\` (\`teacherId\`),
      KEY \`idx_studentReports_studentId\` (\`studentId\`)
    )`,

    // ── Teacher-Student Messages table ───────────────────────────────────
    `CREATE TABLE IF NOT EXISTS \`teacherStudentMessages\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`teacherId\` int NOT NULL,
      \`studentId\` int NOT NULL,
      \`senderRole\` varchar(10) NOT NULL,
      \`content\` text NOT NULL,
      \`isRead\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`teacherStudentMessages_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_tsm_teacherId\` (\`teacherId\`),
      KEY \`idx_tsm_studentId\` (\`studentId\`)
    )`,

    // Campaign Replies — admin inbox for matched inbound email replies (migration 0019)
    `CREATE TABLE IF NOT EXISTS \`campaignReplies\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`messageId\` varchar(500) NOT NULL,
      \`fromEmail\` varchar(320) NOT NULL,
      \`fromName\` varchar(200),
      \`subject\` varchar(500),
      \`snippet\` text,
      \`receivedAt\` timestamp NOT NULL,
      \`matchedCampaignId\` int,
      \`matchedContactId\` int,
      \`status\` varchar(30) NOT NULL DEFAULT 'new',
      \`notes\` text,
      \`sequenceStopped\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`campaignReplies_id\` PRIMARY KEY(\`id\`),
      KEY \`idx_campaignReplies_fromEmail\` (\`fromEmail\`),
      KEY \`idx_campaignReplies_matchedCampaignId\` (\`matchedCampaignId\`),
      KEY \`idx_campaignReplies_status\` (\`status\`)
    )`,
  ];

  try {
    for (const stmt of statements) {
      // Extract table name for error reporting
      const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/);
      const tableName = tableMatch ? tableMatch[1] : "unknown";
      try {
        await db.execute(sql.raw(stmt));
      } catch (tableError) {
        console.error(`[Database] Failed to create table '${tableName}':`, tableError);
        throw tableError;
      }
    }
    console.log("[Database] All required tables verified/created");

    // Column migrations — add missing columns to existing tables.
    // Uses ALTER TABLE … ADD COLUMN IF NOT EXISTS (supported by MariaDB 10.0+).
    // On MySQL 8.0 these are caught and ignored; the Drizzle migration file handles MySQL 8.0.
    const columnMigrations: string[] = [
      `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`passwordChangedAt\` timestamp NULL`,
      // Email-verification columns (migration 0013) — added here as a runtime safety-net
      // so that production databases that have not had the formal Drizzle migration applied
      // do not throw "Unknown column 'verificationToken'" on every users SELECT query and
      // cause POST /api/auth/login to return 500.
      `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`verificationToken\` varchar(255) DEFAULT NULL`,
      `ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`verificationTokenExpiry\` timestamp NULL`,
      `ALTER TABLE \`horses\` ADD COLUMN IF NOT EXISTS \`passportNumber\` varchar(100) DEFAULT NULL`,
      `ALTER TABLE \`horses\` ADD COLUMN IF NOT EXISTS \`feiId\` varchar(100) DEFAULT NULL`,
      `ALTER TABLE \`horses\` ADD COLUMN IF NOT EXISTS \`ueln\` varchar(100) DEFAULT NULL`,
      // Campaign enhancements (migration 0016) — add country targeting + daily limit to emailCampaigns
      `ALTER TABLE \`emailCampaigns\` ADD COLUMN IF NOT EXISTS \`targetCountry\` varchar(100) DEFAULT NULL`,
      `ALTER TABLE \`emailCampaigns\` ADD COLUMN IF NOT EXISTS \`targetType\` varchar(100) DEFAULT NULL`,
      `ALTER TABLE \`emailCampaigns\` ADD COLUMN IF NOT EXISTS \`dailyLimit\` int NOT NULL DEFAULT 50`,
      `ALTER TABLE \`emailCampaigns\` ADD COLUMN IF NOT EXISTS \`sentToday\` int NOT NULL DEFAULT 0`,
      `ALTER TABLE \`emailCampaigns\` ADD COLUMN IF NOT EXISTS \`lastSendDate\` varchar(10) DEFAULT NULL`,
      `ALTER TABLE \`emailCampaigns\` ADD COLUMN IF NOT EXISTS \`pausedAt\` timestamp NULL DEFAULT NULL`,
      // Campaign enhancements (migration 0016) — add country/lead fields to marketingContacts
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`country\` varchar(100) DEFAULT NULL`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`leadFocus\` varchar(200) DEFAULT NULL`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`organizationName\` varchar(300) DEFAULT NULL`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`lastContactedAt\` timestamp NULL DEFAULT NULL`,
      // Campaign enhancements (migration 0016) — add scheduledDate to campaignSequences
      `ALTER TABLE \`campaignSequences\` ADD COLUMN IF NOT EXISTS \`scheduledDate\` varchar(10) DEFAULT NULL`,
      // Duplicate-person detection (migration 0020) — add fuzzy-dup columns to marketingContacts
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`suspectedDuplicateOf\` int DEFAULT NULL`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`dupRiskScore\` tinyint unsigned DEFAULT NULL`,
      // Growth Engine CRM extension (phase 4)
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`tenantId\` varchar(100) NOT NULL DEFAULT 'global'`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`tenantType\` varchar(50) NOT NULL DEFAULT 'individual'`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`onboardingStatus\` varchar(30) DEFAULT 'not_started'`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`referralCode\` varchar(80) DEFAULT NULL`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`engagementScore\` int DEFAULT 0`,
      `ALTER TABLE \`marketingContacts\` ADD COLUMN IF NOT EXISTS \`metadataJson\` text`,
    ];
    for (const stmt of columnMigrations) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (colError) {
        console.warn("[Database] Column migration failed (column may already exist):", colError);
      }
    }
    console.log("[Database] Column migrations applied");

    // ENUM migrations — idempotent MODIFY COLUMN for ENUM columns that gained
    // new values in later migrations.  MODIFY COLUMN replaces the full ENUM
    // definition so running these multiple times is safe.
    const enumMigrations: string[] = [
      // migrations 0006 + 0010: extended documents.category from the original
      // ('health','registration','insurance','competition','other') to include
      // passport, training, feeding, invoice, and gallery.  Production databases
      // that were set up before these migrations were applied will reject any
      // INSERT with the newer category values (MySQL: "Data truncated for column
      // 'category'"), causing uploads to fail with a "Failed query" error.
      `ALTER TABLE \`documents\` MODIFY COLUMN \`category\` ENUM(
        'health','passport','registration','insurance','competition',
        'training','feeding','invoice','gallery','other'
      ) DEFAULT 'other'`,
    ];
    for (const stmt of enumMigrations) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (enumError) {
        console.warn("[Database] ENUM migration warning:", enumError);
      }
    }
    console.log("[Database] ENUM migrations applied");

    // Index migrations — add performance indexes if not already present.
    const indexMigrations: string[] = [
      // Events query: WHERE userId=? AND startDate BETWEEN ? AND ? ORDER BY startDate
      `CREATE INDEX IF NOT EXISTS \`events_userId_startDate_idx\` ON \`events\` (\`userId\`, \`startDate\`)`,
      // Site analytics indexes (migration 0012)
      `CREATE INDEX IF NOT EXISTS \`sa_visitor_idx\` ON \`siteAnalytics\` (\`visitorId\`)`,
      `CREATE INDEX IF NOT EXISTS \`sa_session_idx\` ON \`siteAnalytics\` (\`sessionId\`)`,
      `CREATE INDEX IF NOT EXISTS \`sa_created_idx\` ON \`siteAnalytics\` (\`createdAt\`)`,
      `CREATE INDEX IF NOT EXISTS \`sa_path_idx\` ON \`siteAnalytics\` (\`path\`)`,
      // Campaign recipients indexes (migration 0012)
      `CREATE INDEX IF NOT EXISTS \`ecr_campaign_idx\` ON \`emailCampaignRecipients\` (\`campaignId\`)`,
      `CREATE INDEX IF NOT EXISTS \`ecr_email_idx\` ON \`emailCampaignRecipients\` (\`email\`)`,
      // Campaign enhancements indexes (migration 0016)
      `CREATE INDEX IF NOT EXISTS \`idx_mc_country\` ON \`marketingContacts\` (\`country\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_mc_contact_type\` ON \`marketingContacts\` (\`contactType\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_mc_tenant\` ON \`marketingContacts\` (\`tenantId\`)`,
      // Duplicate-person detection index (migration 0020)
      `CREATE INDEX IF NOT EXISTS \`idx_mc_dup_of\` ON \`marketingContacts\` (\`suspectedDuplicateOf\`)`,
      // Growth Engine foundations indexes
      `CREATE INDEX IF NOT EXISTS \`idx_ge_queue_tenant\` ON \`growthQueueJobs\` (\`tenantId\`, \`queueType\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_ge_queue_status\` ON \`growthQueueJobs\` (\`queueType\`, \`status\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_ge_social_tenant\` ON \`growthSocialConnections\` (\`tenantId\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_ge_social_platform\` ON \`growthSocialConnections\` (\`tenantId\`, \`platform\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_ge_onboarding_user\` ON \`growthOnboardingFlows\` (\`userId\`, \`tenantId\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_ge_lifecycle_tenant\` ON \`growthAutomationRuns\` (\`tenantId\`, \`runAt\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_ge_referral_tenant\` ON \`growthReferrals\` (\`tenantId\`, \`status\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_ge_analytics_tenant\` ON \`growthAnalyticsEvents\` (\`tenantId\`, \`stage\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_ge_feedback_tenant\` ON \`growthFeedback\` (\`tenantId\`, \`status\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_mrj_scope\` ON \`marketingRenderJobs\` (\`tenantId\`, \`workspaceId\`)`,
      `CREATE INDEX IF NOT EXISTS \`idx_mrj_status\` ON \`marketingRenderJobs\` (\`status\`, \`createdAt\`)`,
    ];
    for (const stmt of indexMigrations) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (idxError) {
        console.warn("[Database] Index migration warning (index may already exist):", idxError);
      }
    }
    console.log("[Database] Index migrations applied");

    _tablesEnsured = true;
  } catch (error) {
    console.error("[Database] Failed to ensure tables:", error);
    // Don't set _tablesEnsured so it retries next time
  }
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const fixedUrl = fixDatabaseUrl(process.env.DATABASE_URL);

      // Log database connection info (redacting password)
      const urlWithoutPassword = fixedUrl.replace(/:([^@]+)@/, ":****@");
      console.log("[Database] Connecting to:", urlWithoutPassword);

      _db = drizzle(fixedUrl);
      console.log("[Database] Connection established");

      // Ensure all required tables exist on first connection.
      // Use a shared promise so concurrent callers don't run ensureTables twice.
      if (!_ensureTablesPromise) {
        _ensureTablesPromise = ensureTables(_db);
      }
      await _ensureTablesPromise;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = [
      "name",
      "email",
      "loginMethod",
      "passwordHash",
    ] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.emailVerified !== undefined) {
      values.emailVerified = user.emailVerified;
      updateSet.emailVerified = user.emailVerified;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    // Set trial period for new users (7 days)
    if (!values.trialEndsAt) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);
      values.trialEndsAt = trialEnd;
      values.subscriptionStatus = "trial";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(desc(users.createdAt));
}

export async function getDeletedUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(users)
    .where(eq(users.isActive, false))
    .orderBy(desc(users.updatedAt));
}

export async function restoreUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.resetToken, token))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByVerificationToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.verificationToken, token))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByStripeSubscriptionId(subscriptionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.stripeSubscriptionId, subscriptionId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function suspendUser(id: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      isSuspended: true,
      suspendedReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}

export async function unsuspendUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      isSuspended: false,
      suspendedReason: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  // Soft delete by deactivating
  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function hardDeleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  // Permanently remove all user-owned data across every table, then the user record.
  // The schema defines no FK constraints, so deletion order is not constrained.
  // Tables are grouped logically: health/care data, activity data, system data, then user.
  await db.delete(healthRecords).where(eq(healthRecords.userId, id));
  await db.delete(trainingSessions).where(eq(trainingSessions.userId, id));
  await db.delete(feedingPlans).where(eq(feedingPlans.userId, id));
  await db.delete(documents).where(eq(documents.userId, id));
  await db.delete(weatherLogs).where(eq(weatherLogs.userId, id));
  await db.delete(vaccinations).where(eq(vaccinations.userId, id));
  await db.delete(dewormings).where(eq(dewormings.userId, id));
  await db.delete(treatments).where(eq(treatments.userId, id));
  await db.delete(appointments).where(eq(appointments.userId, id));
  await db.delete(dentalCare).where(eq(dentalCare.userId, id));
  await db.delete(xrays).where(eq(xrays.userId, id));
  await db.delete(hoofcare).where(eq(hoofcare.userId, id));
  await db.delete(nutritionLogs).where(eq(nutritionLogs.userId, id));
  await db.delete(nutritionPlans).where(eq(nutritionPlans.userId, id));
  await db.delete(notes).where(eq(notes.userId, id));
  await db.delete(rides).where(eq(rides.userId, id));
  await db.delete(feedCosts).where(eq(feedCosts.userId, id));
  await db.delete(tasks).where(eq(tasks.userId, id));
  await db.delete(contacts).where(eq(contacts.userId, id));
  await db.delete(horseTags).where(eq(horseTags.userId, id));
  await db.delete(tags).where(eq(tags.userId, id));
  await db.delete(competitions).where(eq(competitions.userId, id));
  await db.delete(competitionResults).where(eq(competitionResults.userId, id));
  await db.delete(trainingProgramTemplates).where(eq(trainingProgramTemplates.userId, id));
  await db.delete(trainingPrograms).where(eq(trainingPrograms.userId, id));
  await db.delete(reports).where(eq(reports.userId, id));
  await db.delete(reportSchedules).where(eq(reportSchedules.userId, id));
  await db.delete(shareLinks).where(eq(shareLinks.userId, id));
  await db.delete(horses).where(eq(horses.userId, id));
  await db.delete(events).where(eq(events.userId, id));
  await db.delete(eventReminders).where(eq(eventReminders.userId, id));
  await db.delete(stableMembers).where(eq(stableMembers.userId, id));
  await db.delete(apiKeys).where(eq(apiKeys.userId, id));
  await db.delete(webhooks).where(eq(webhooks.userId, id));
  await db.delete(accountFeatures).where(eq(accountFeatures.userId, id));
  await db.delete(adminSessions).where(eq(adminSessions.userId, id));
  await db.delete(adminUnlockAttempts).where(eq(adminUnlockAttempts.userId, id));
  await db.delete(activityLogs).where(eq(activityLogs.userId, id));
  // Anonymise analytics rows rather than delete them (preserves visit counts)
  await db.update(siteAnalytics).set({ userId: null }).where(eq(siteAnalytics.userId, id));
  await db.delete(users).where(eq(users.id, id));
}

export async function getOverdueSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(users)
    .where(
      and(eq(users.subscriptionStatus, "overdue"), eq(users.isActive, true)),
    );
}

export async function getExpiredTrials() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(users)
    .where(
      and(
        eq(users.subscriptionStatus, "trial"),
        lte(users.trialEndsAt, now),
        eq(users.isActive, true),
      ),
    );
}

/**
 * Get users whose trial ends within the given number of days (inclusive).
 * Used by the reminder scheduler to send trial-ending emails.
 */
export async function getTrialsEndingSoon(withinDays: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + withinDays);
  return db
    .select()
    .from(users)
    .where(
      and(
        eq(users.subscriptionStatus, "trial"),
        gte(users.trialEndsAt, now),
        lte(users.trialEndsAt, cutoff),
        eq(users.isActive, true),
      ),
    );
}

// ============ HORSE QUERIES ============

export async function createHorse(data: InsertHorse) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(horses).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getHorsesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(horses)
    .where(and(eq(horses.userId, userId), eq(horses.isActive, true)))
    .orderBy(desc(horses.createdAt));
}

export async function getHorseById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(horses)
    .where(and(eq(horses.id, id), eq(horses.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateHorse(
  id: number,
  userId: number,
  data: Partial<InsertHorse>,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(horses)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(horses.id, id), eq(horses.userId, userId)));
}

export async function deleteHorse(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(horses)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(horses.id, id), eq(horses.userId, userId)));
}

/**
 * Permanently delete a horse AND all its linked data.
 * This is destructive and cannot be undone.
 */
export async function deleteHorseAndData(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;

  // Verify ownership
  const [horse] = await db
    .select({ id: horses.id })
    .from(horses)
    .where(and(eq(horses.id, id), eq(horses.userId, userId)));
  if (!horse) return;

  // Delete all linked data (order matters for FK constraints)
  await db.delete(healthRecords).where(eq(healthRecords.horseId, id));
  await db.delete(vaccinations).where(eq(vaccinations.horseId, id));
  await db.delete(dewormings).where(eq(dewormings.horseId, id));
  await db.delete(treatments).where(eq(treatments.horseId, id));
  await db.delete(trainingSessions).where(eq(trainingSessions.horseId, id));
  await db.delete(feedingPlans).where(eq(feedingPlans.horseId, id));
  await db.delete(feedCosts).where(eq(feedCosts.horseId, id));
  await db.delete(documents).where(eq(documents.horseId, id));
  await db.delete(appointments).where(eq(appointments.horseId, id));
  await db.delete(dentalCare).where(eq(dentalCare.horseId, id));
  await db.delete(xrays).where(eq(xrays.horseId, id));
  await db.delete(hoofcare).where(eq(hoofcare.horseId, id));
  await db.delete(nutritionLogs).where(eq(nutritionLogs.horseId, id));
  await db.delete(nutritionPlans).where(eq(nutritionPlans.horseId, id));
  await db.delete(notes).where(eq(notes.horseId, id));
  await db.delete(rides).where(eq(rides.horseId, id));
  await db.delete(competitions).where(eq(competitions.horseId, id));
  await db.delete(pedigree).where(eq(pedigree.horseId, id));
  await db.delete(events).where(eq(events.horseId, id));

  // Finally, hard-delete the horse record
  await db.delete(horses).where(and(eq(horses.id, id), eq(horses.userId, userId)));
}

// ============ HEALTH RECORD QUERIES ============

export async function createHealthRecord(data: InsertHealthRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(healthRecords).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getHealthRecordsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(healthRecords)
    .where(eq(healthRecords.userId, userId))
    .orderBy(desc(healthRecords.recordDate));
}

export async function getHealthRecordsByHorseId(
  horseId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(healthRecords)
    .where(
      and(eq(healthRecords.horseId, horseId), eq(healthRecords.userId, userId)),
    )
    .orderBy(desc(healthRecords.recordDate));
}

export async function getHealthRecordById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(healthRecords)
    .where(and(eq(healthRecords.id, id), eq(healthRecords.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateHealthRecord(
  id: number,
  userId: number,
  data: Partial<InsertHealthRecord>,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(healthRecords)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(healthRecords.id, id), eq(healthRecords.userId, userId)));
}

export async function deleteHealthRecord(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(healthRecords)
    .where(and(eq(healthRecords.id, id), eq(healthRecords.userId, userId)));
}

export async function getUpcomingReminders(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return db
    .select()
    .from(healthRecords)
    .where(
      and(
        eq(healthRecords.userId, userId),
        gte(healthRecords.nextDueDate, now),
        lte(healthRecords.nextDueDate, futureDate),
      ),
    )
    .orderBy(healthRecords.nextDueDate);
}

// ============ TRAINING SESSION QUERIES ============

export async function createTrainingSession(data: InsertTrainingSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trainingSessions).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getTrainingSessionsByHorseId(
  horseId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.horseId, horseId),
        eq(trainingSessions.userId, userId),
      ),
    )
    .orderBy(desc(trainingSessions.sessionDate));
}

export async function getTrainingSessionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.userId, userId))
    .orderBy(desc(trainingSessions.sessionDate));
}

export async function getTrainingSessionById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(trainingSessions)
    .where(
      and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)),
    )
    .limit(1);
  return result[0] || null;
}

export async function getUpcomingTrainingSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  return db
    .select()
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.userId, userId),
        gte(trainingSessions.sessionDate, today),
        eq(trainingSessions.isCompleted, false),
      ),
    )
    .orderBy(trainingSessions.sessionDate);
}

export async function updateTrainingSession(
  id: number,
  userId: number,
  data: Partial<InsertTrainingSession>,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(trainingSessions)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)),
    );
}

export async function deleteTrainingSession(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(trainingSessions)
    .where(
      and(eq(trainingSessions.id, id), eq(trainingSessions.userId, userId)),
    );
}

// ============ FEEDING PLAN QUERIES ============

export async function createFeedingPlan(data: InsertFeedingPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(feedingPlans).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getFeedingPlansByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(feedingPlans)
    .where(
      and(eq(feedingPlans.userId, userId), eq(feedingPlans.isActive, true)),
    )
    .orderBy(feedingPlans.mealTime);
}

export async function getFeedingPlansByHorseId(
  horseId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(feedingPlans)
    .where(
      and(
        eq(feedingPlans.horseId, horseId),
        eq(feedingPlans.userId, userId),
        eq(feedingPlans.isActive, true),
      ),
    )
    .orderBy(feedingPlans.mealTime);
}

export async function getFeedingPlanById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(feedingPlans)
    .where(and(eq(feedingPlans.id, id), eq(feedingPlans.userId, userId)))
    .limit(1);
  return result[0] || null;
}

export async function updateFeedingPlan(
  id: number,
  userId: number,
  data: Partial<InsertFeedingPlan>,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(feedingPlans)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(feedingPlans.id, id), eq(feedingPlans.userId, userId)));
}

export async function deleteFeedingPlan(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(feedingPlans)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(feedingPlans.id, id), eq(feedingPlans.userId, userId)));
}

// ============ DOCUMENT QUERIES ============

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getDocumentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentsByHorseId(horseId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.horseId, horseId), eq(documents.userId, userId)))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);
  return result[0] || null;
}

export async function deleteDocument(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}

// ============ WEATHER LOG QUERIES ============

export async function createWeatherLog(data: InsertWeatherLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(weatherLogs).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getLatestWeatherLog(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(weatherLogs)
    .where(eq(weatherLogs.userId, userId))
    .orderBy(desc(weatherLogs.checkedAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getWeatherHistory(userId: number, limit: number = 7) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(weatherLogs)
    .where(eq(weatherLogs.userId, userId))
    .orderBy(desc(weatherLogs.checkedAt))
    .limit(limit);
}

// ============ SYSTEM SETTINGS QUERIES ============

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, key))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertSetting(
  key: string,
  value: string,
  type: "string" | "number" | "boolean" | "json" = "string",
  description?: string,
  updatedBy?: number,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(systemSettings)
    .values({
      settingKey: key,
      settingValue: value,
      settingType: type,
      description,
      updatedBy,
    })
    .onDuplicateKeyUpdate({
      set: { settingValue: value, updatedBy, updatedAt: new Date() },
    });
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemSettings).orderBy(systemSettings.settingKey);
}

// ============ ACTIVITY LOG QUERIES ============

export async function logActivity(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(activityLogs).values(data);
}

// Alias for compatibility
export const createActivityLog = logActivity;

export async function getActivityLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

export async function getUserActivityLogs(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);
}

// ============ BACKUP LOG QUERIES ============

export async function createBackupLog(data: InsertBackupLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(backupLogs).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function updateBackupLog(
  id: number,
  data: Partial<InsertBackupLog>,
) {
  const db = await getDb();
  if (!db) return;
  await db.update(backupLogs).set(data).where(eq(backupLogs.id, id));
}

export async function getRecentBackups(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(backupLogs)
    .orderBy(desc(backupLogs.startedAt))
    .limit(limit);
}

// ============ ANALYTICS QUERIES ============

export async function getSystemStats() {
  const db = await getDb();
  if (!db) return null;

  const [userStats] = await db
    .select({
      totalUsers: sql<number>`COUNT(*)`,
      activeUsers: sql<number>`SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END)`,
      trialUsers: sql<number>`SUM(CASE WHEN subscriptionStatus = 'trial' THEN 1 ELSE 0 END)`,
      paidUsers: sql<number>`SUM(CASE WHEN subscriptionStatus = 'active' THEN 1 ELSE 0 END)`,
      overdueUsers: sql<number>`SUM(CASE WHEN subscriptionStatus = 'overdue' THEN 1 ELSE 0 END)`,
      suspendedUsers: sql<number>`SUM(CASE WHEN isSuspended = 1 THEN 1 ELSE 0 END)`,
    })
    .from(users);

  const [horseStats] = await db
    .select({
      totalHorses: sql<number>`COUNT(*)`,
      activeHorses: sql<number>`SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END)`,
    })
    .from(horses);

  const [recordStats] = await db
    .select({
      totalRecords: sql<number>`COUNT(*)`,
    })
    .from(healthRecords);

  const [sessionStats] = await db
    .select({
      totalSessions: sql<number>`COUNT(*)`,
      completedSessions: sql<number>`SUM(CASE WHEN isCompleted = 1 THEN 1 ELSE 0 END)`,
    })
    .from(trainingSessions);

  return {
    users: userStats,
    horses: horseStats,
    healthRecords: recordStats,
    trainingSessions: sessionStats,
  };
}

// ============ USER SEGMENTATION ============

export async function getUserSegmentation() {
  const db = await getDb();
  if (!db) return null;

  // Get all users with their preferences to distinguish free-access from paid
  const allUsers = await db
    .select({
      id: users.id,
      isActive: users.isActive,
      isSuspended: users.isSuspended,
      subscriptionStatus: users.subscriptionStatus,
      preferences: users.preferences,
      createdAt: users.createdAt,
      stripeCustomerId: users.stripeCustomerId,
      lastPaymentAt: users.lastPaymentAt,
    })
    .from(users);

  let leads = 0;
  let freeAccessUsers = 0;
  let trialUsers = 0;
  let paidUsers = 0;
  let overdueUsers = 0;
  let deletedUsers = 0;
  let cancelledUsers = 0;
  let expiredUsers = 0;
  const recentSignups: number[] = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

  for (const u of allUsers) {
    // Deleted users (soft-deleted)
    if (!u.isActive) {
      deletedUsers++;
      continue;
    }

    // Parse preferences to check freeAccess
    let prefs: { freeAccess?: boolean } = {};
    try {
      prefs = u.preferences ? JSON.parse(u.preferences as string) : {};
    } catch { /* ignore */ }

    const status = u.subscriptionStatus;

    if (status === "overdue") {
      overdueUsers++;
    } else if (status === "cancelled") {
      cancelledUsers++;
    } else if (status === "expired") {
      expiredUsers++;
    } else if (status === "trial") {
      trialUsers++;
    } else if (status === "active") {
      if (prefs.freeAccess) {
        freeAccessUsers++;
      } else {
        paidUsers++;
      }
    }

    // Recent signups (last 7 days)
    if (u.createdAt && new Date(u.createdAt) >= sevenDaysAgo) {
      recentSignups.push(u.id);
    }
  }

  // Count leads from chatLeads table
  const { chatLeads: chatLeadsTable } = await import("../drizzle/schema");
  const [leadCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(chatLeadsTable);

  leads = leadCount?.count || 0;

  return {
    leads,
    freeAccessUsers,
    trialUsers,
    paidUsers,
    overdueUsers,
    deletedUsers,
    cancelledUsers,
    expiredUsers,
    recentSignups: recentSignups.length,
    totalReal: trialUsers + paidUsers + freeAccessUsers, // active real users
  };
}

// ============ STRIPE EVENT QUERIES ============

export async function createStripeEvent(
  eventId: string,
  eventType: string,
  payload?: string,
) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(stripeEvents).values({
      eventId,
      eventType,
      payload,
    });
    return (result[0] as ResultSetHeader).insertId as number;
  } catch (error) {
    // If duplicate, event already processed
    return null;
  }
}

export async function markStripeEventProcessed(
  eventId: string,
  error?: string,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(stripeEvents)
    .set({
      processed: !error,
      processedAt: error ? undefined : new Date(),
      error,
    })
    .where(eq(stripeEvents.eventId, eventId));
}

export async function isStripeEventProcessed(eventId: string) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.eventId, eventId))
    .limit(1);
  return result.some((event) => event.processed && !event.error);
}

// ============ COMPETITION QUERIES ============

export async function createCompetition(data: InsertCompetition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(competitions).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getCompetitionsByHorseId(
  horseId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(competitions)
    .where(
      and(eq(competitions.horseId, horseId), eq(competitions.userId, userId)),
    )
    .orderBy(desc(competitions.date));
}

export async function getCompetitionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(competitions)
    .where(eq(competitions.userId, userId))
    .orderBy(desc(competitions.date));
}

// ============ ADMIN SESSION QUERIES ============

export async function getAdminSession(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const sessions = await db
    .select()
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.userId, userId),
        gte(adminSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return sessions[0] || null;
}

export async function createAdminSession(userId: number, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Remove old sessions for this user
  await db.delete(adminSessions).where(eq(adminSessions.userId, userId));

  // Create new session
  await db.insert(adminSessions).values({ userId, expiresAt });
}

export async function revokeAdminSession(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminSessions).where(eq(adminSessions.userId, userId));
}

export async function getUnlockAttempts(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const record = await db
    .select()
    .from(adminUnlockAttempts)
    .where(eq(adminUnlockAttempts.userId, userId))
    .limit(1);

  if (!record[0]) return 0;

  // Reset if locked period expired
  if (record[0].lockedUntil && record[0].lockedUntil < new Date()) {
    await db
      .update(adminUnlockAttempts)
      .set({ attempts: 0, lockedUntil: null })
      .where(eq(adminUnlockAttempts.userId, userId));
    return 0;
  }

  return record[0].attempts;
}

export async function incrementUnlockAttempts(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const existing = await db
    .select()
    .from(adminUnlockAttempts)
    .where(eq(adminUnlockAttempts.userId, userId))
    .limit(1);

  if (!existing[0]) {
    await db.insert(adminUnlockAttempts).values({
      userId,
      attempts: 1,
      lastAttemptAt: new Date(),
    });
    return 1;
  }

  const newAttempts = existing[0].attempts + 1;
  await db
    .update(adminUnlockAttempts)
    .set({ attempts: newAttempts, lastAttemptAt: new Date() })
    .where(eq(adminUnlockAttempts.userId, userId));

  return newAttempts;
}

export async function resetUnlockAttempts(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(adminUnlockAttempts)
    .set({ attempts: 0, lockedUntil: null })
    .where(eq(adminUnlockAttempts.userId, userId));
}

export async function setUnlockLockout(userId: number, minutes: number) {
  const db = await getDb();
  if (!db) return;
  const lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await db
    .update(adminUnlockAttempts)
    .set({ lockedUntil })
    .where(eq(adminUnlockAttempts.userId, userId));
}

export async function getUnlockLockoutTime(
  userId: number,
): Promise<Date | null> {
  const db = await getDb();
  if (!db) return null;

  const record = await db
    .select()
    .from(adminUnlockAttempts)
    .where(eq(adminUnlockAttempts.userId, userId))
    .limit(1);

  return record[0]?.lockedUntil || null;
}

// ============ API KEY QUERIES ============

export async function createApiKey(data: {
  userId: number;
  stableId?: number;
  name: string;
  permissions?: string[];
  rateLimit?: number;
  expiresAt?: Date;
}): Promise<{ id: number; key: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate secure API key: prefix + random string
  const prefix = "ep_" + nanoid(4);
  const secret = nanoid(32);
  const fullKey = prefix + "_" + secret;

  // Hash the full key for storage
  const keyHash = await bcrypt.hash(fullKey, 10);

  const result = await db.insert(apiKeys).values({
    userId: data.userId,
    stableId: data.stableId,
    name: data.name,
    keyHash,
    keyPrefix: prefix,
    permissions: data.permissions ? JSON.stringify(data.permissions) : null,
    rateLimit: data.rateLimit ?? 100,
    expiresAt: data.expiresAt,
  });

  // Return the PLAIN KEY only once (never stored)
  return {
    id: (result[0] as ResultSetHeader).insertId as number,
    key: fullKey,
  };
}

export async function listApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      isActive: apiKeys.isActive,
      rateLimit: apiKeys.rateLimit,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function rotateApiKey(
  id: number,
  userId: number,
): Promise<{ key: string } | null> {
  const db = await getDb();
  if (!db) return null;

  // Get existing key
  const existing = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1);

  if (!existing[0]) return null;

  // Generate new key
  const prefix = "ep_" + nanoid(4);
  const secret = nanoid(32);
  const fullKey = prefix + "_" + secret;
  const keyHash = await bcrypt.hash(fullKey, 10);

  // Update
  await db
    .update(apiKeys)
    .set({
      keyHash,
      keyPrefix: prefix,
    })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));

  return { key: fullKey };
}

export async function updateApiKeySettings(
  id: number,
  userId: number,
  data: {
    name?: string;
    rateLimit?: number;
    permissions?: string[];
    isActive?: boolean;
  },
) {
  const db = await getDb();
  if (!db) return;

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.rateLimit !== undefined) updateData.rateLimit = data.rateLimit;
  if (data.permissions !== undefined)
    updateData.permissions = JSON.stringify(data.permissions);
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  await db
    .update(apiKeys)
    .set(updateData)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function verifyApiKey(
  key: string,
): Promise<{ userId: number; permissions: string[] } | null> {
  const db = await getDb();
  if (!db) return null;

  // Extract prefix
  const prefix = key.substring(0, 7); // "ep_xxxx"

  // Find keys with this prefix
  const keys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.isActive, true)));

  // Check each key with bcrypt
  for (const apiKey of keys) {
    const match = await bcrypt.compare(key, apiKey.keyHash);
    if (match) {
      // Check expiration
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return null; // Expired
      }

      // Update last used
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, apiKey.id));

      // Parse permissions
      const permissions = apiKey.permissions
        ? JSON.parse(apiKey.permissions)
        : [];
      return { userId: apiKey.userId, permissions };
    }
  }

  return null;
}

// =====================
// Tasks Functions
// =====================

export async function createTask(data: {
  userId: number;
  horseId?: number;
  title: string;
  description?: string;
  taskType: string;
  priority?: string;
  status?: string;
  dueDate?: Date;
  assignedTo?: string;
  notes?: string;
  reminderDays?: number;
  isRecurring?: boolean;
  recurringInterval?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { tasks } = await import("../drizzle/schema");
  const result = await db.insert(tasks).values(data as any);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getTasksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { tasks } = await import("../drizzle/schema");
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt));
}

export async function getTasksByHorseId(horseId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { tasks } = await import("../drizzle/schema");
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.horseId, horseId), eq(tasks.userId, userId)))
    .orderBy(desc(tasks.createdAt));
}

export async function getTaskById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const { tasks } = await import("../drizzle/schema");
  const results = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return results[0] || null;
}

export async function getUpcomingTasks(userId: number, days: number = 7) {
  const db = await getDb();
  if (!db) return [];

  const { tasks } = await import("../drizzle/schema");
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.status, "pending"),
        lte(tasks.dueDate, futureDate),
      ),
    )
    .orderBy(tasks.dueDate);
}

export async function updateTask(
  id: number,
  userId: number,
  data: {
    title?: string;
    description?: string;
    taskType?: string;
    priority?: string;
    status?: string;
    dueDate?: Date;
    completedAt?: Date;
    assignedTo?: string;
    notes?: string;
    reminderDays?: number;
    isRecurring?: boolean;
    recurringInterval?: string;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { tasks } = await import("../drizzle/schema");
  await db
    .update(tasks)
    .set(data as any)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function deleteTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { tasks } = await import("../drizzle/schema");
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

export async function completeTask(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { tasks } = await import("../drizzle/schema");
  await db
    .update(tasks)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

// =====================
// Contacts Functions
// =====================

export async function createContact(data: {
  userId: number;
  name: string;
  contactType: string;
  company?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  website?: string;
  notes?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { contacts } = await import("../drizzle/schema");
  const result = await db.insert(contacts).values({
    userId: data.userId,
    name: data.name,
    contactType: data.contactType as any,
    company: data.company ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    mobile: data.mobile ?? null,
    address: data.address ?? null,
    city: data.city ?? null,
    postcode: data.postcode ?? null,
    country: data.country ?? "United Kingdom",
    website: data.website ?? null,
    notes: data.notes ?? null,
    isPrimary: data.isPrimary ?? false,
    isActive: data.isActive ?? true,
  });
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getContactsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { contacts } = await import("../drizzle/schema");
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, userId))
    .orderBy(desc(contacts.createdAt));
}

export async function getContactById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const { contacts } = await import("../drizzle/schema");
  const results = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
  return results[0] || null;
}

export async function getContactsByType(userId: number, contactType: string) {
  const db = await getDb();
  if (!db) return [];

  const { contacts } = await import("../drizzle/schema");
  return db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.userId, userId),
        eq(contacts.contactType, contactType as any),
      ),
    )
    .orderBy(contacts.name);
}

export async function updateContact(
  id: number,
  userId: number,
  data: {
    name?: string;
    contactType?: string;
    company?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
    website?: string;
    notes?: string;
    isPrimary?: boolean;
    isActive?: boolean;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { contacts } = await import("../drizzle/schema");
  await db
    .update(contacts)
    .set(data as any)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function deleteContact(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { contacts } = await import("../drizzle/schema");
  await db
    .delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

// ============ VACCINATION QUERIES ============

export async function createVaccination(data: {
  horseId: number;
  userId: number;
  vaccineName: string;
  vaccineType?: string;
  dateAdministered: Date;
  nextDueDate?: Date;
  batchNumber?: string;
  vetName?: string;
  vetClinic?: string;
  cost?: number;
  notes?: string;
  documentUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { vaccinations } = await import("../drizzle/schema");
  const result = await db.insert(vaccinations).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getVaccinationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { vaccinations } = await import("../drizzle/schema");
  return db
    .select()
    .from(vaccinations)
    .where(eq(vaccinations.userId, userId))
    .orderBy(desc(vaccinations.dateAdministered));
}

export async function getVaccinationsByHorseId(
  horseId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return [];

  const { vaccinations } = await import("../drizzle/schema");
  return db
    .select()
    .from(vaccinations)
    .where(
      and(eq(vaccinations.horseId, horseId), eq(vaccinations.userId, userId)),
    )
    .orderBy(desc(vaccinations.dateAdministered));
}

export async function getVaccinationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const { vaccinations } = await import("../drizzle/schema");
  const results = await db
    .select()
    .from(vaccinations)
    .where(and(eq(vaccinations.id, id), eq(vaccinations.userId, userId)));
  return results[0] || null;
}

export async function updateVaccination(
  id: number,
  userId: number,
  data: {
    vaccineName?: string;
    vaccineType?: string;
    dateAdministered?: Date;
    nextDueDate?: Date;
    batchNumber?: string;
    vetName?: string;
    vetClinic?: string;
    cost?: number;
    notes?: string;
    documentUrl?: string;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { vaccinations } = await import("../drizzle/schema");
  await db
    .update(vaccinations)
    .set(data)
    .where(and(eq(vaccinations.id, id), eq(vaccinations.userId, userId)));
}

export async function deleteVaccination(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { vaccinations } = await import("../drizzle/schema");
  await db
    .delete(vaccinations)
    .where(and(eq(vaccinations.id, id), eq(vaccinations.userId, userId)));
}

// ============ DEWORMING QUERIES ============

export async function createDeworming(data: {
  horseId: number;
  userId: number;
  productName: string;
  activeIngredient?: string;
  dateAdministered: Date;
  nextDueDate?: Date;
  dosage?: string;
  weight?: number;
  cost?: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { dewormings } = await import("../drizzle/schema");
  const result = await db.insert(dewormings).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getDewormingsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { dewormings } = await import("../drizzle/schema");
  return db
    .select()
    .from(dewormings)
    .where(eq(dewormings.userId, userId))
    .orderBy(desc(dewormings.dateAdministered));
}

export async function getDewormingsByHorseId(horseId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { dewormings } = await import("../drizzle/schema");
  return db
    .select()
    .from(dewormings)
    .where(and(eq(dewormings.horseId, horseId), eq(dewormings.userId, userId)))
    .orderBy(desc(dewormings.dateAdministered));
}

export async function getDewormingById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const { dewormings } = await import("../drizzle/schema");
  const results = await db
    .select()
    .from(dewormings)
    .where(and(eq(dewormings.id, id), eq(dewormings.userId, userId)));
  return results[0] || null;
}

export async function updateDeworming(
  id: number,
  userId: number,
  data: {
    productName?: string;
    activeIngredient?: string;
    dateAdministered?: Date;
    nextDueDate?: Date;
    dosage?: string;
    weight?: number;
    cost?: number;
    notes?: string;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { dewormings } = await import("../drizzle/schema");
  await db
    .update(dewormings)
    .set(data)
    .where(and(eq(dewormings.id, id), eq(dewormings.userId, userId)));
}

export async function deleteDeworming(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { dewormings } = await import("../drizzle/schema");
  await db
    .delete(dewormings)
    .where(and(eq(dewormings.id, id), eq(dewormings.userId, userId)));
}

// ============ PEDIGREE QUERIES ============

export async function createOrUpdatePedigree(data: {
  horseId: number;
  sireId?: number;
  sireName?: string;
  damId?: number;
  damName?: string;
  sireOfSireId?: number;
  sireOfSireName?: string;
  damOfSireId?: number;
  damOfSireName?: string;
  sireOfDamId?: number;
  sireOfDamName?: string;
  damOfDamId?: number;
  damOfDamName?: string;
  geneticInfo?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { pedigree } = await import("../drizzle/schema");

  // Check if pedigree exists for this horse
  const existing = await db
    .select()
    .from(pedigree)
    .where(eq(pedigree.horseId, data.horseId));

  if (existing.length > 0) {
    // Update existing
    await db
      .update(pedigree)
      .set(data)
      .where(eq(pedigree.horseId, data.horseId));
    return existing[0].id;
  } else {
    // Create new
    const result = await db.insert(pedigree).values(data);
    return (result[0] as ResultSetHeader).insertId as number;
  }
}

export async function getPedigreeByHorseId(horseId: number) {
  const db = await getDb();
  if (!db) return null;

  const { pedigree } = await import("../drizzle/schema");
  const results = await db
    .select()
    .from(pedigree)
    .where(eq(pedigree.horseId, horseId));
  return results[0] || null;
}

export async function deletePedigree(horseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { pedigree } = await import("../drizzle/schema");
  await db.delete(pedigree).where(eq(pedigree.horseId, horseId));
}

// ============ TREATMENTS ============
export async function createTreatment(data: InsertTreatment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(treatments).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getTreatmentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(treatments)
    .where(eq(treatments.userId, userId))
    .orderBy(desc(treatments.startDate));
}

export async function getTreatmentsByHorseId(horseId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(treatments)
    .where(and(eq(treatments.horseId, horseId), eq(treatments.userId, userId)))
    .orderBy(desc(treatments.startDate));
}

export async function getTreatmentById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(treatments)
    .where(and(eq(treatments.id, id), eq(treatments.userId, userId)));
  return results[0] || null;
}

export async function updateTreatment(
  id: number,
  userId: number,
  data: Partial<InsertTreatment>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(treatments)
    .set(data)
    .where(and(eq(treatments.id, id), eq(treatments.userId, userId)));
}

export async function deleteTreatment(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(treatments)
    .where(and(eq(treatments.id, id), eq(treatments.userId, userId)));
}

// ============ APPOINTMENTS ============
export async function createAppointment(data: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(appointments).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getAppointmentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, userId))
    .orderBy(desc(appointments.appointmentDate));
}

export async function getAppointmentsByHorseId(
  horseId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(appointments)
    .where(
      and(eq(appointments.horseId, horseId), eq(appointments.userId, userId)),
    )
    .orderBy(desc(appointments.appointmentDate));
}

export async function getAppointmentById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
  return results[0] || null;
}

export async function updateAppointment(
  id: number,
  userId: number,
  data: Partial<InsertAppointment>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(appointments)
    .set(data)
    .where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
}

export async function deleteAppointment(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
}

// ============ DENTAL CARE ============
export async function createDentalCare(data: InsertDentalCare) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(dentalCare).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getDentalCareByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(dentalCare)
    .where(eq(dentalCare.userId, userId))
    .orderBy(desc(dentalCare.examDate));
}

export async function getDentalCareByHorseId(horseId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(dentalCare)
    .where(and(eq(dentalCare.horseId, horseId), eq(dentalCare.userId, userId)))
    .orderBy(desc(dentalCare.examDate));
}

export async function getDentalCareById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(dentalCare)
    .where(and(eq(dentalCare.id, id), eq(dentalCare.userId, userId)));
  return results[0] || null;
}

export async function updateDentalCare(
  id: number,
  userId: number,
  data: Partial<InsertDentalCare>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(dentalCare)
    .set(data)
    .where(and(eq(dentalCare.id, id), eq(dentalCare.userId, userId)));
}

export async function deleteDentalCare(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(dentalCare)
    .where(and(eq(dentalCare.id, id), eq(dentalCare.userId, userId)));
}

// ============ X-RAYS ============
export async function createXray(data: InsertXray) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(xrays).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getXraysByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(xrays)
    .where(eq(xrays.userId, userId))
    .orderBy(desc(xrays.xrayDate));
}

export async function getXraysByHorseId(horseId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(xrays)
    .where(and(eq(xrays.horseId, horseId), eq(xrays.userId, userId)))
    .orderBy(desc(xrays.xrayDate));
}

export async function getXrayById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(xrays)
    .where(and(eq(xrays.id, id), eq(xrays.userId, userId)));
  return results[0] || null;
}

export async function updateXray(
  id: number,
  userId: number,
  data: Partial<InsertXray>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(xrays)
    .set(data)
    .where(and(eq(xrays.id, id), eq(xrays.userId, userId)));
}

export async function deleteXray(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(xrays).where(and(eq(xrays.id, id), eq(xrays.userId, userId)));
}

// ============ TAGS ============
export async function createTag(data: InsertTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tags).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getTagsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(tags.name);
}

export async function getTagById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)));
  return results[0] || null;
}

export async function updateTag(
  id: number,
  userId: number,
  data: Partial<InsertTag>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(tags)
    .set(data)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)));
}

export async function deleteTag(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, userId)));
}

// ============ HORSE TAGS (many-to-many) ============

export async function attachTagToHorse(horseId: number, tagId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Upsert — ignore duplicate if already attached
  await db
    .insert(horseTags)
    .values({ horseId, tagId, userId })
    .onDuplicateKeyUpdate({ set: { horseId } }); // no-op update keeps the row
}

export async function detachTagFromHorse(horseId: number, tagId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(horseTags)
    .where(and(eq(horseTags.horseId, horseId), eq(horseTags.tagId, tagId), eq(horseTags.userId, userId)));
}

export async function getTagsByHorse(horseId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ tag: tags })
    .from(horseTags)
    .innerJoin(tags, eq(horseTags.tagId, tags.id))
    .where(and(eq(horseTags.horseId, horseId), eq(horseTags.userId, userId)))
    .orderBy(tags.name);

  return rows.map((r) => r.tag);
}

/** Return distinct horseIds that have a specific tag attached, for the user */
export async function getHorseIdsByTag(tagId: number, userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ horseId: horseTags.horseId })
    .from(horseTags)
    .where(and(eq(horseTags.tagId, tagId), eq(horseTags.userId, userId)));

  return rows.map((r) => r.horseId);
}

/** Return all tags with a count of how many horses have each tag */
export async function getTagsWithHorseCount(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const allTags = await db
    .select()
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(tags.name);

  const counts = await db
    .select({ tagId: horseTags.tagId, count: sql<number>`COUNT(*)` })
    .from(horseTags)
    .where(eq(horseTags.userId, userId))
    .groupBy(horseTags.tagId);

  const countMap = new Map(counts.map((c) => [c.tagId, Number(c.count)]));

  return allTags.map((tag) => ({
    ...tag,
    horseCount: countMap.get(tag.id) ?? 0,
  }));
}

// ============ HOOFCARE ============
export async function createHoofcare(data: InsertHoofcare) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(hoofcare).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getHoofcareByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(hoofcare)
    .where(eq(hoofcare.userId, userId))
    .orderBy(desc(hoofcare.careDate));
}

export async function getHoofcareByHorseId(horseId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(hoofcare)
    .where(and(eq(hoofcare.horseId, horseId), eq(hoofcare.userId, userId)))
    .orderBy(desc(hoofcare.careDate));
}

export async function getHoofcareById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(hoofcare)
    .where(and(eq(hoofcare.id, id), eq(hoofcare.userId, userId)));
  return results[0] || null;
}

export async function updateHoofcare(
  id: number,
  userId: number,
  data: Partial<InsertHoofcare>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(hoofcare)
    .set(data)
    .where(and(eq(hoofcare.id, id), eq(hoofcare.userId, userId)));
}

export async function deleteHoofcare(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(hoofcare)
    .where(and(eq(hoofcare.id, id), eq(hoofcare.userId, userId)));
}

// ============ NUTRITION LOGS ============
export async function createNutritionLog(data: InsertNutritionLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(nutritionLogs).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getNutritionLogsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(nutritionLogs)
    .where(eq(nutritionLogs.userId, userId))
    .orderBy(desc(nutritionLogs.logDate));
}

export async function getNutritionLogsByHorseId(
  horseId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(nutritionLogs)
    .where(
      and(eq(nutritionLogs.horseId, horseId), eq(nutritionLogs.userId, userId)),
    )
    .orderBy(desc(nutritionLogs.logDate));
}

export async function getNutritionLogById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(nutritionLogs)
    .where(and(eq(nutritionLogs.id, id), eq(nutritionLogs.userId, userId)));
  return results[0] || null;
}

export async function updateNutritionLog(
  id: number,
  userId: number,
  data: Partial<InsertNutritionLog>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(nutritionLogs)
    .set(data)
    .where(and(eq(nutritionLogs.id, id), eq(nutritionLogs.userId, userId)));
}

export async function deleteNutritionLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(nutritionLogs)
    .where(and(eq(nutritionLogs.id, id), eq(nutritionLogs.userId, userId)));
}

// ============ NUTRITION PLANS ============
export async function createNutritionPlan(data: InsertNutritionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(nutritionPlans).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getNutritionPlansByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.userId, userId))
    .orderBy(desc(nutritionPlans.startDate));
}

export async function getNutritionPlansByHorseId(
  horseId: number,
  userId: number,
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(nutritionPlans)
    .where(
      and(
        eq(nutritionPlans.horseId, horseId),
        eq(nutritionPlans.userId, userId),
      ),
    )
    .orderBy(desc(nutritionPlans.startDate));
}

export async function getNutritionPlanById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(nutritionPlans)
    .where(and(eq(nutritionPlans.id, id), eq(nutritionPlans.userId, userId)));
  return results[0] || null;
}

export async function updateNutritionPlan(
  id: number,
  userId: number,
  data: Partial<InsertNutritionPlan>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(nutritionPlans)
    .set(data)
    .where(and(eq(nutritionPlans.id, id), eq(nutritionPlans.userId, userId)));
}

export async function deleteNutritionPlan(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(nutritionPlans)
    .where(and(eq(nutritionPlans.id, id), eq(nutritionPlans.userId, userId)));
}

// ============ NOTES ============
export async function createNote(data: InsertNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Strip undefined fields to avoid DEFAULT keyword issues in MySQL
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as InsertNote;

  const result = await db.insert(notes).values(cleanData);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getNotesByUserId(
  userId: number,
  horseId?: number,
  limit: number = 50,
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(notes.userId, userId)];

  if (horseId) {
    conditions.push(eq(notes.horseId, horseId));
  }

  return await db
    .select()
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.createdAt))
    .limit(limit);
}

export async function getNoteById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db.select().from(notes).where(eq(notes.id, id));
  return results[0] || null;
}

export async function updateNote(
  id: number,
  userId: number,
  data: Partial<InsertNote>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Strip undefined fields
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  ) as Partial<InsertNote>;

  if (Object.keys(cleanData).length === 0) return;

  await db
    .update(notes)
    .set(cleanData)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

export async function deleteNote(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

// ============ RIDES (GPS Tracking) ============
export async function createRide(data: InsertRide) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(rides).values(data);
  return (result[0] as ResultSetHeader).insertId as number;
}

export async function getRidesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(rides)
    .where(eq(rides.userId, userId))
    .orderBy(desc(rides.createdAt));
}

export async function getRideById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(rides)
    .where(and(eq(rides.id, id), eq(rides.userId, userId)));
  return results[0] || null;
}

export async function deleteRide(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(rides).where(and(eq(rides.id, id), eq(rides.userId, userId)));
}

// ============ EVENT REMINDERS ============
export async function getDueEventReminders(beforeDate: Date) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(eventReminders)
    .where(
      and(
        lte(eventReminders.reminderTime, beforeDate),
        eq(eventReminders.isSent, false),
      ),
    );
}

export async function markEventReminderSent(reminderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(eventReminders)
    .set({ isSent: true, sentAt: new Date() })
    .where(eq(eventReminders.id, reminderId));
}

export async function getEventById(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  const results = await db.select().from(events).where(eq(events.id, eventId));
  return results[0] || null;
}

export async function createEventReminders(
  eventId: number,
  userId: number,
  eventStartDate: Date,
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // Schedule reminders for 24h before and 1h before the event
  const reminderOffsets = [TWENTY_FOUR_HOURS_MS, ONE_HOUR_MS];

  for (const offset of reminderOffsets) {
    const reminderTime = new Date(eventStartDate.getTime() - offset);
    // Only create reminder if it's in the future
    if (reminderTime > new Date()) {
      await db.insert(eventReminders).values({
        eventId,
        userId,
        reminderTime,
        reminderType: "email",
        isSent: false,
      });
    }
  }
}
