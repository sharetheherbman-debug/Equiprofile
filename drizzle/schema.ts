import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// Core user table with subscription management
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }), // For local email/password auth
  emailVerified: boolean("emailVerified").default(false), // Email verification status
  verificationToken: varchar("verificationToken", { length: 255 }), // Email verification token
  verificationTokenExpiry: timestamp("verificationTokenExpiry"), // Verification token expiration
  resetToken: varchar("resetToken", { length: 255 }), // Password reset token
  resetTokenExpiry: timestamp("resetTokenExpiry"), // Reset token expiration
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Subscription fields
  subscriptionStatus: mysqlEnum("subscriptionStatus", [
    "trial",
    "active",
    "cancelled",
    "overdue",
    "expired",
  ])
    .default("trial")
    .notNull(),
  subscriptionPlan: mysqlEnum("subscriptionPlan", [
    "monthly",
    "yearly",
  ]).default("monthly"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  trialEndsAt: timestamp("trialEndsAt"),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  lastPaymentAt: timestamp("lastPaymentAt"),
  // Account status
  isActive: boolean("isActive").default(true).notNull(),
  isSuspended: boolean("isSuspended").default(false).notNull(),
  suspendedReason: text("suspendedReason"),
  // Profile
  phone: varchar("phone", { length: 20 }),
  location: varchar("location", { length: 255 }), // City/region text
  latitude: varchar("latitude", { length: 20 }), // Geographic coordinates
  longitude: varchar("longitude", { length: 20 }), // Geographic coordinates
  profileImageUrl: text("profileImageUrl"),
  // Storage tracking
  storageUsedBytes: int("storageUsedBytes").default(0).notNull(),
  storageQuotaBytes: int("storageQuotaBytes").default(104857600).notNull(), // 100MB default
  // User preferences and settings
  preferences: text("preferences"), // JSON: theme, language, dashboard layout
  language: varchar("language", { length: 10 }).default("en"),
  theme: mysqlEnum("theme", ["light", "dark", "system"]).default("system"),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordChangedAt: timestamp("passwordChangedAt"), // Set when password is changed; used to invalidate older JWTs
});

// Horse profiles
export const horses = mysqlTable("horses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  age: int("age"),
  dateOfBirth: date("dateOfBirth"),
  height: int("height"), // in hands × 10 (e.g. 152 = 15.2 hh)
  weight: int("weight"), // in kilograms
  color: varchar("color", { length: 50 }),
  gender: mysqlEnum("gender", ["stallion", "mare", "gelding"]),
  discipline: varchar("discipline", { length: 100 }), // dressage, jumping, eventing, etc.
  level: varchar("level", { length: 50 }), // beginner, intermediate, advanced, competition
  registrationNumber: varchar("registrationNumber", { length: 100 }),
  microchipNumber: varchar("microchipNumber", { length: 100 }),
  passportNumber: varchar("passportNumber", { length: 100 }),
  feiId: varchar("feiId", { length: 100 }),
  ueln: varchar("ueln", { length: 100 }),
  notes: text("notes"),
  photoUrl: text("photoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Health records
export const healthRecords = mysqlTable("healthRecords", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  recordType: mysqlEnum("recordType", [
    "vaccination",
    "deworming",
    "dental",
    "farrier",
    "veterinary",
    "injury",
    "medication",
    "other",
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  recordDate: date("recordDate").notNull(),
  nextDueDate: date("nextDueDate"),
  vetName: varchar("vetName", { length: 100 }),
  vetPhone: varchar("vetPhone", { length: 20 }),
  vetClinic: varchar("vetClinic", { length: 200 }),
  cost: int("cost"), // in pence/cents
  documentUrl: text("documentUrl"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Training sessions
export const trainingSessions = mysqlTable("trainingSessions", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  sessionDate: date("sessionDate").notNull(),
  startTime: varchar("startTime", { length: 10 }), // HH:MM format
  endTime: varchar("endTime", { length: 10 }),
  duration: int("duration"), // in minutes
  sessionType: mysqlEnum("sessionType", [
    "flatwork",
    "jumping",
    "hacking",
    "lunging",
    "groundwork",
    "competition",
    "lesson",
    "other",
  ]).notNull(),
  discipline: varchar("discipline", { length: 100 }),
  trainer: varchar("trainer", { length: 100 }),
  location: varchar("location", { length: 200 }),
  goals: text("goals"),
  exercises: text("exercises"),
  notes: text("notes"),
  performance: mysqlEnum("performance", [
    "excellent",
    "good",
    "average",
    "poor",
  ]),
  weather: varchar("weather", { length: 100 }),
  temperature: int("temperature"), // in celsius
  isCompleted: boolean("isCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Feeding plans
export const feedingPlans = mysqlTable("feedingPlans", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  feedType: varchar("feedType", { length: 100 }).notNull(), // hay, grain, supplements, etc.
  brandName: varchar("brandName", { length: 100 }),
  quantity: varchar("quantity", { length: 50 }).notNull(), // e.g., "2kg", "1 scoop"
  unit: varchar("unit", { length: 20 }), // kg, lbs, scoops, flakes
  mealTime: mysqlEnum("mealTime", [
    "morning",
    "midday",
    "evening",
    "night",
  ]).notNull(),
  frequency: varchar("frequency", { length: 50 }).default("daily"), // daily, twice daily, etc.
  specialInstructions: text("specialInstructions"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Documents storage
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  horseId: int("horseId"),
  healthRecordId: int("healthRecordId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // pdf, image, etc.
  fileSize: int("fileSize"), // in bytes
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  category: mysqlEnum("category", [
    "health",
    "passport",
    "registration",
    "insurance",
    "competition",
    "training",
    "feeding",
    "invoice",
    "gallery",
    "other",
  ]).default("other"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Weather logs for AI analysis
export const weatherLogs = mysqlTable("weatherLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  temperature: int("temperature"), // celsius
  humidity: int("humidity"), // percentage
  windSpeed: int("windSpeed"), // km/h
  precipitation: int("precipitation"), // mm
  conditions: varchar("conditions", { length: 100 }), // sunny, cloudy, rainy, etc.
  uvIndex: int("uvIndex"),
  visibility: int("visibility"), // km
  ridingRecommendation: mysqlEnum("ridingRecommendation", [
    "excellent",
    "good",
    "fair",
    "poor",
    "not_recommended",
  ]),
  aiAnalysis: text("aiAnalysis"),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
});

// System settings for admin
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue"),
  settingType: mysqlEnum("settingType", [
    "string",
    "number",
    "boolean",
    "json",
  ]).default("string"),
  description: text("description"),
  isEncrypted: boolean("isEncrypted").default(false),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Admin sessions for time-limited admin access
export const adminSessions = mysqlTable("adminSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Admin unlock attempts tracking for rate limiting
export const adminUnlockAttempts = mysqlTable("adminUnlockAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  attempts: int("attempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),
  lastAttemptAt: timestamp("lastAttemptAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Activity logs for admin monitoring
export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 50 }), // user, horse, health_record, etc.
  entityId: int("entityId"),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Backup logs
export const backupLogs = mysqlTable("backupLogs", {
  id: int("id").autoincrement().primaryKey(),
  backupType: mysqlEnum("backupType", [
    "full",
    "incremental",
    "users",
    "horses",
  ]).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "running",
    "completed",
    "failed",
  ]).notNull(),
  fileName: varchar("fileName", { length: 255 }),
  fileSize: int("fileSize"),
  fileUrl: text("fileUrl"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

// Stables/Teams for multi-user management
export const stables = mysqlTable("stables", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  ownerId: int("ownerId").notNull(), // The user who created the stable
  location: varchar("location", { length: 255 }),
  logo: text("logo"),
  // Branding and customization
  primaryColor: varchar("primaryColor", { length: 7 }), // Hex color
  secondaryColor: varchar("secondaryColor", { length: 7 }),
  customDomain: varchar("customDomain", { length: 255 }),
  branding: text("branding"), // JSON: additional branding settings
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Stable members with role-based permissions
export const stableMembers = mysqlTable("stableMembers", {
  id: int("id").autoincrement().primaryKey(),
  stableId: int("stableId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", [
    "owner",
    "admin",
    "trainer",
    "member",
    "viewer",
  ]).notNull(),
  permissions: text("permissions"), // JSON string of specific permissions
  isActive: boolean("isActive").default(true).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Invitations to join stables
export const stableInvites = mysqlTable("stableInvites", {
  id: int("id").autoincrement().primaryKey(),
  stableId: int("stableId").notNull(),
  invitedByUserId: int("invitedByUserId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "trainer", "member", "viewer"]).notNull(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "expired"])
    .default("pending")
    .notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Events and calendar
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stableId: int("stableId"),
  horseId: int("horseId"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventType: mysqlEnum("eventType", [
    "training",
    "competition",
    "veterinary",
    "farrier",
    "lesson",
    "meeting",
    "other",
  ]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  location: varchar("location", { length: 255 }),
  isAllDay: boolean("isAllDay").default(false).notNull(),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurrenceRule: text("recurrenceRule"), // iCal RRULE format
  color: varchar("color", { length: 7 }), // Hex color code
  isCompleted: boolean("isCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Event reminders
export const eventReminders = mysqlTable("eventReminders", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  reminderTime: timestamp("reminderTime").notNull(),
  reminderType: mysqlEnum("reminderType", ["email", "push", "sms"]).notNull(),
  isSent: boolean("isSent").default(false).notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Feed costs tracking
export const feedCosts = mysqlTable("feedCosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  horseId: int("horseId"),
  feedType: varchar("feedType", { length: 100 }).notNull(),
  brandName: varchar("brandName", { length: 100 }),
  quantity: varchar("quantity", { length: 50 }).notNull(),
  unit: varchar("unit", { length: 20 }),
  costPerUnit: int("costPerUnit").notNull(), // in pence/cents
  purchaseDate: date("purchaseDate").notNull(),
  supplier: varchar("supplier", { length: 200 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Vaccinations tracking
export const vaccinations = mysqlTable("vaccinations", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  vaccineName: varchar("vaccineName", { length: 200 }).notNull(),
  vaccineType: varchar("vaccineType", { length: 100 }), // flu, tetanus, etc.
  dateAdministered: date("dateAdministered").notNull(),
  nextDueDate: date("nextDueDate"),
  batchNumber: varchar("batchNumber", { length: 100 }),
  vetName: varchar("vetName", { length: 100 }),
  vetClinic: varchar("vetClinic", { length: 200 }),
  cost: int("cost"), // in pence/cents
  notes: text("notes"),
  documentUrl: text("documentUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Deworming tracking
export const dewormings = mysqlTable("dewormings", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  activeIngredient: varchar("activeIngredient", { length: 200 }),
  dateAdministered: date("dateAdministered").notNull(),
  nextDueDate: date("nextDueDate"),
  dosage: varchar("dosage", { length: 100 }),
  weight: int("weight"), // horse weight at time of treatment
  cost: int("cost"), // in pence/cents
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Shareable profile links
export const shareLinks = mysqlTable("shareLinks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  horseId: int("horseId"),
  linkType: mysqlEnum("linkType", [
    "horse",
    "stable",
    "medical_passport",
  ]).notNull(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  isPublic: boolean("isPublic").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  viewCount: int("viewCount").default(0).notNull(),
  lastViewedAt: timestamp("lastViewedAt"),
  settings: text("settings"), // JSON string for privacy settings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Competitions tracking
export const competitions = mysqlTable("competitions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  horseId: int("horseId").notNull(),
  competitionName: varchar("competitionName", { length: 200 }).notNull(),
  venue: varchar("venue", { length: 200 }),
  date: date("date").notNull(),
  discipline: varchar("discipline", { length: 100 }), // dressage, jumping, etc.
  level: varchar("level", { length: 50 }),
  class: varchar("class", { length: 100 }), // specific class/event name
  placement: varchar("placement", { length: 50 }), // 1st, 2nd, etc. or score
  score: varchar("score", { length: 50 }),
  notes: text("notes"),
  cost: int("cost"), // entry fee in pence/cents
  winnings: int("winnings"), // prize money in pence/cents
  documentUrl: text("documentUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Document tags for better organization
export const documentTags = mysqlTable("documentTags", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  tag: varchar("tag", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Stripe webhook events for idempotency
export const stripeEvents = mysqlTable("stripeEvents", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 255 }).notNull().unique(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  processed: boolean("processed").default(false).notNull(),
  payload: text("payload"), // Full event payload for debugging
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

// Message threads for stable communication
export const messageThreads = mysqlTable("messageThreads", {
  id: int("id").autoincrement().primaryKey(),
  stableId: int("stableId").notNull(),
  title: varchar("title", { length: 200 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Messages for in-app communication
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  threadId: int("threadId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content").notNull(),
  attachments: text("attachments"), // JSON array of file URLs
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Competition results with detailed scoring
export const competitionResults = mysqlTable("competitionResults", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  userId: int("userId").notNull(),
  horseId: int("horseId").notNull(),
  roundNumber: int("roundNumber").default(1),
  score: varchar("score", { length: 50 }),
  penalties: int("penalties"),
  time: varchar("time", { length: 20 }),
  judgeScores: text("judgeScores"), // JSON array of judge scores
  technicalScore: int("technicalScore"),
  artisticScore: int("artisticScore"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Training program templates
export const trainingProgramTemplates = mysqlTable("trainingProgramTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stableId: int("stableId"),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  duration: int("duration"), // in weeks
  discipline: varchar("discipline", { length: 100 }),
  level: varchar("level", { length: 50 }),
  goals: text("goals"),
  programData: text("programData").notNull(), // JSON: weekly schedule
  isPublic: boolean("isPublic").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Training programs (instances of templates)
export const trainingPrograms = mysqlTable("trainingPrograms", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  templateId: int("templateId"),
  name: varchar("name", { length: 200 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  status: mysqlEnum("status", ["active", "completed", "paused", "cancelled"])
    .default("active")
    .notNull(),
  progress: int("progress").default(0), // percentage
  programData: text("programData").notNull(), // JSON: customized schedule
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Automated reports
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stableId: int("stableId"),
  horseId: int("horseId"),
  reportType: mysqlEnum("reportType", [
    "monthly_summary",
    "health_report",
    "training_progress",
    "cost_analysis",
    "competition_summary",
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  reportData: text("reportData").notNull(), // JSON: report content
  fileUrl: text("fileUrl"), // PDF URL
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

// Report schedules for automation
export const reportSchedules = mysqlTable("reportSchedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stableId: int("stableId"),
  reportType: mysqlEnum("reportType", [
    "monthly_summary",
    "health_report",
    "training_progress",
    "cost_analysis",
    "competition_summary",
  ]).notNull(),
  frequency: mysqlEnum("frequency", [
    "daily",
    "weekly",
    "monthly",
    "quarterly",
  ]).notNull(),
  recipients: text("recipients"), // JSON array of email addresses
  isActive: boolean("isActive").default(true).notNull(),
  lastRunAt: timestamp("lastRunAt"),
  nextRunAt: timestamp("nextRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Breeding records
export const breeding = mysqlTable("breeding", {
  id: int("id").autoincrement().primaryKey(),
  mareId: int("mareId").notNull(), // horseId of mare
  stallionId: int("stallionId"), // horseId of stallion (if owned)
  stallionName: varchar("stallionName", { length: 200 }),
  breedingDate: date("breedingDate").notNull(),
  method: mysqlEnum("method", [
    "natural",
    "artificial",
    "embryo_transfer",
  ]).notNull(),
  veterinarianName: varchar("veterinarianName", { length: 100 }),
  cost: int("cost"),
  pregnancyConfirmed: boolean("pregnancyConfirmed").default(false),
  confirmationDate: date("confirmationDate"),
  dueDate: date("dueDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Foal tracking
export const foals = mysqlTable("foals", {
  id: int("id").autoincrement().primaryKey(),
  breedingId: int("breedingId").notNull(),
  horseId: int("horseId"), // linked to horses table after birth
  birthDate: date("birthDate").notNull(),
  gender: mysqlEnum("gender", ["colt", "filly"]),
  name: varchar("name", { length: 100 }),
  color: varchar("color", { length: 50 }),
  markings: text("markings"),
  birthWeight: int("birthWeight"), // in kg
  currentWeight: int("currentWeight"),
  healthStatus: varchar("healthStatus", { length: 100 }),
  milestones: text("milestones"), // JSON array of development milestones
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Pedigree information
export const pedigree = mysqlTable("pedigree", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  sireId: int("sireId"), // horseId of sire
  sireName: varchar("sireName", { length: 200 }),
  damId: int("damId"), // horseId of dam
  damName: varchar("damName", { length: 200 }),
  sireOfSireId: int("sireOfSireId"),
  sireOfSireName: varchar("sireOfSireName", { length: 200 }),
  damOfSireId: int("damOfSireId"),
  damOfSireName: varchar("damOfSireName", { length: 200 }),
  sireOfDamId: int("sireOfDamId"),
  sireOfDamName: varchar("sireOfDamName", { length: 200 }),
  damOfDamId: int("damOfDamId"),
  damOfDamName: varchar("damOfDamName", { length: 200 }),
  geneticInfo: text("geneticInfo"), // JSON: genetic markers, health predispositions
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Lesson bookings for trainers
export const lessonBookings = mysqlTable("lessonBookings", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  clientId: int("clientId").notNull(),
  horseId: int("horseId"),
  lessonDate: timestamp("lessonDate").notNull(),
  duration: int("duration").notNull(), // in minutes
  lessonType: varchar("lessonType", { length: 100 }),
  location: varchar("location", { length: 200 }),
  status: mysqlEnum("status", [
    "scheduled",
    "completed",
    "cancelled",
    "no_show",
  ])
    .default("scheduled")
    .notNull(),
  fee: int("fee"), // in pence/cents
  paid: boolean("paid").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Trainer availability
export const trainerAvailability = mysqlTable("trainerAvailability", {
  id: int("id").autoincrement().primaryKey(),
  trainerId: int("trainerId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  startTime: varchar("startTime", { length: 5 }).notNull(), // HH:MM
  endTime: varchar("endTime", { length: 5 }).notNull(), // HH:MM
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// API keys for third-party integrations
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stableId: int("stableId"),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: varchar("keyHash", { length: 255 }).notNull(), // bcrypt hash of key
  keyPrefix: varchar("keyPrefix", { length: 20 }).notNull(), // first few chars for identification
  permissions: text("permissions"), // JSON array of allowed endpoints
  rateLimit: int("rateLimit").default(100).notNull(), // requests per hour
  isActive: boolean("isActive").default(true).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Webhooks for third-party integrations
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stableId: int("stableId"),
  url: text("url").notNull(),
  events: text("events").notNull(), // JSON array of subscribed events
  secret: varchar("secret", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  failureCount: int("failureCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Horse = typeof horses.$inferSelect;
export type InsertHorse = typeof horses.$inferInsert;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertHealthRecord = typeof healthRecords.$inferInsert;
export type TrainingSession = typeof trainingSessions.$inferSelect;
export type InsertTrainingSession = typeof trainingSessions.$inferInsert;
export type FeedingPlan = typeof feedingPlans.$inferSelect;
export type InsertFeedingPlan = typeof feedingPlans.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type WeatherLog = typeof weatherLogs.$inferSelect;
export type InsertWeatherLog = typeof weatherLogs.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type BackupLog = typeof backupLogs.$inferSelect;
export type InsertBackupLog = typeof backupLogs.$inferInsert;
export type Stable = typeof stables.$inferSelect;
export type InsertStable = typeof stables.$inferInsert;
export type StableMember = typeof stableMembers.$inferSelect;
export type InsertStableMember = typeof stableMembers.$inferInsert;
export type StableInvite = typeof stableInvites.$inferSelect;
export type InsertStableInvite = typeof stableInvites.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type EventReminder = typeof eventReminders.$inferSelect;
export type InsertEventReminder = typeof eventReminders.$inferInsert;
export type FeedCost = typeof feedCosts.$inferSelect;
export type InsertFeedCost = typeof feedCosts.$inferInsert;
export type Vaccination = typeof vaccinations.$inferSelect;
export type InsertVaccination = typeof vaccinations.$inferInsert;
export type Deworming = typeof dewormings.$inferSelect;
export type InsertDeworming = typeof dewormings.$inferInsert;
export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = typeof competitions.$inferInsert;
export type DocumentTag = typeof documentTags.$inferSelect;
export type InsertDocumentTag = typeof documentTags.$inferInsert;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type InsertStripeEvent = typeof stripeEvents.$inferInsert;
export type MessageThread = typeof messageThreads.$inferSelect;
export type InsertMessageThread = typeof messageThreads.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type CompetitionResult = typeof competitionResults.$inferSelect;
export type InsertCompetitionResult = typeof competitionResults.$inferInsert;
export type TrainingProgramTemplate =
  typeof trainingProgramTemplates.$inferSelect;
export type InsertTrainingProgramTemplate =
  typeof trainingProgramTemplates.$inferInsert;
export type TrainingProgram = typeof trainingPrograms.$inferSelect;
export type InsertTrainingProgram = typeof trainingPrograms.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
export type ReportSchedule = typeof reportSchedules.$inferSelect;
export type InsertReportSchedule = typeof reportSchedules.$inferInsert;
export type Breeding = typeof breeding.$inferSelect;
export type InsertBreeding = typeof breeding.$inferInsert;
export type Foal = typeof foals.$inferSelect;
export type InsertFoal = typeof foals.$inferInsert;
export type Pedigree = typeof pedigree.$inferSelect;
export type InsertPedigree = typeof pedigree.$inferInsert;
export type LessonBooking = typeof lessonBookings.$inferSelect;
export type InsertLessonBooking = typeof lessonBookings.$inferInsert;
export type TrainerAvailability = typeof trainerAvailability.$inferSelect;
export type InsertTrainerAvailability = typeof trainerAvailability.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertAdminSession = typeof adminSessions.$inferInsert;
export type AdminUnlockAttempt = typeof adminUnlockAttempts.$inferSelect;
export type InsertAdminUnlockAttempt = typeof adminUnlockAttempts.$inferInsert;

// Feature flags for account-level feature enablement
export const accountFeatures = mysqlTable("accountFeatures", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Core features (always enabled)
  horsesEnabled: boolean("horsesEnabled").default(true).notNull(),
  healthEnabled: boolean("healthEnabled").default(true).notNull(),
  trainingEnabled: boolean("trainingEnabled").default(true).notNull(),
  // Add-on features (require subscription tier)
  breedingEnabled: boolean("breedingEnabled").default(false).notNull(),
  financeEnabled: boolean("financeEnabled").default(false).notNull(),
  salesEnabled: boolean("salesEnabled").default(false).notNull(),
  teamsEnabled: boolean("teamsEnabled").default(false).notNull(),
  advancedReportsEnabled: boolean("advancedReportsEnabled")
    .default(false)
    .notNull(),
  // Beta features
  peppolEnabled: boolean("peppolEnabled").default(false).notNull(),
  aiInvoiceScanEnabled: boolean("aiInvoiceScanEnabled")
    .default(false)
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccountFeatures = typeof accountFeatures.$inferSelect;
export type InsertAccountFeatures = typeof accountFeatures.$inferInsert;

// Tasks system for general horse care and management
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  horseId: int("horseId"), // Optional - task may be for specific horse or general
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  taskType: mysqlEnum("taskType", [
    "hoofcare",
    "health_appointment",
    "treatment",
    "vaccination",
    "deworming",
    "dental",
    "general_care",
    "training",
    "feeding",
    "other",
  ]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"])
    .default("medium")
    .notNull(),
  status: mysqlEnum("status", [
    "pending",
    "in_progress",
    "completed",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  dueDate: date("dueDate"),
  completedAt: timestamp("completedAt"),
  assignedTo: varchar("assignedTo", { length: 100 }), // Name of person assigned
  notes: text("notes"),
  reminderDays: int("reminderDays").default(1), // Days before due date to remind
  isRecurring: boolean("isRecurring").default(false).notNull(),
  recurringInterval: mysqlEnum("recurringInterval", [
    "daily",
    "weekly",
    "biweekly",
    "monthly",
    "quarterly",
    "yearly",
  ]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// Contacts for vets, farriers, trainers, etc.
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  contactType: mysqlEnum("contactType", [
    "vet",
    "farrier",
    "trainer",
    "instructor",
    "stable",
    "breeder",
    "supplier",
    "emergency",
    "other",
  ]).notNull(),
  company: varchar("company", { length: 200 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  postcode: varchar("postcode", { length: 20 }),
  country: varchar("country", { length: 100 }).default("United Kingdom"),
  website: varchar("website", { length: 500 }),
  notes: text("notes"),
  isPrimary: boolean("isPrimary").default(false).notNull(), // Primary contact for this type
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// Treatments module
export const treatments = mysqlTable("treatments", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  treatmentType: varchar("treatmentType", { length: 100 }).notNull(), // medication, therapy, procedure, etc.
  treatmentName: varchar("treatmentName", { length: 200 }).notNull(),
  description: text("description"),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  frequency: varchar("frequency", { length: 100 }), // daily, twice daily, weekly, etc.
  dosage: varchar("dosage", { length: 200 }),
  administeredBy: varchar("administeredBy", { length: 100 }),
  vetName: varchar("vetName", { length: 100 }),
  vetClinic: varchar("vetClinic", { length: 200 }),
  cost: int("cost"), // in pence
  status: mysqlEnum("status", ["active", "completed", "discontinued"])
    .default("active")
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Treatment = typeof treatments.$inferSelect;
export type InsertTreatment = typeof treatments.$inferInsert;

// Health appointments module
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  appointmentType: varchar("appointmentType", { length: 100 }).notNull(), // vet, farrier, dentist, physio, etc.
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  appointmentDate: date("appointmentDate").notNull(),
  appointmentTime: varchar("appointmentTime", { length: 10 }), // HH:MM format
  duration: int("duration"), // in minutes
  providerName: varchar("providerName", { length: 100 }),
  providerPhone: varchar("providerPhone", { length: 20 }),
  providerClinic: varchar("providerClinic", { length: 200 }),
  location: varchar("location", { length: 200 }),
  cost: int("cost"), // in pence
  status: mysqlEnum("status", [
    "scheduled",
    "confirmed",
    "completed",
    "cancelled",
  ])
    .default("scheduled")
    .notNull(),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// Dental care module
export const dentalCare = mysqlTable("dentalCare", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  examDate: date("examDate").notNull(),
  dentistName: varchar("dentistName", { length: 100 }),
  dentistClinic: varchar("dentistClinic", { length: 200 }),
  procedureType: varchar("procedureType", { length: 200 }), // routine exam, floating, extraction, etc.
  findings: text("findings"),
  treatmentPerformed: text("treatmentPerformed"),
  nextDueDate: date("nextDueDate"),
  cost: int("cost"), // in pence
  sedationUsed: boolean("sedationUsed").default(false).notNull(),
  teethCondition: mysqlEnum("teethCondition", [
    "excellent",
    "good",
    "fair",
    "poor",
  ]),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DentalCare = typeof dentalCare.$inferSelect;
export type InsertDentalCare = typeof dentalCare.$inferInsert;

// X-rays module
export const xrays = mysqlTable("xrays", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  xrayDate: date("xrayDate").notNull(),
  bodyPart: varchar("bodyPart", { length: 100 }).notNull(), // front left hoof, hock, stifle, etc.
  reason: varchar("reason", { length: 200 }),
  vetName: varchar("vetName", { length: 100 }),
  vetClinic: varchar("vetClinic", { length: 200 }),
  findings: text("findings"),
  diagnosis: text("diagnosis"),
  fileUrl: text("fileUrl"), // Path to stored x-ray image
  fileName: varchar("fileName", { length: 255 }),
  fileSize: int("fileSize"), // in bytes
  mimeType: varchar("mimeType", { length: 100 }),
  cost: int("cost"), // in pence
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Xray = typeof xrays.$inferSelect;
export type InsertXray = typeof xrays.$inferInsert;

// Tags module (for organizing horses, documents, etc.)
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }), // hex color code
  category: varchar("category", { length: 50 }), // horse, document, task, etc.
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// Horse tag assignments (many-to-many: horses ↔ tags)
export const horseTags = mysqlTable("horseTags", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  tagId: int("tagId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HorseTag = typeof horseTags.$inferSelect;
export type InsertHorseTag = typeof horseTags.$inferInsert;

// Hoofcare module
export const hoofcare = mysqlTable("hoofcare", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  careDate: date("careDate").notNull(),
  careType: mysqlEnum("careType", [
    "shoeing",
    "trimming",
    "remedial",
    "inspection",
    "other",
  ]).notNull(),
  farrierName: varchar("farrierName", { length: 100 }),
  farrierPhone: varchar("farrierPhone", { length: 20 }),
  hoofCondition: mysqlEnum("hoofCondition", [
    "excellent",
    "good",
    "fair",
    "poor",
  ]),
  shoesType: varchar("shoesType", { length: 100 }), // e.g., front only, all four, barefoot
  findings: text("findings"),
  workPerformed: text("workPerformed"),
  nextDueDate: date("nextDueDate"),
  cost: int("cost"), // in pence
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Hoofcare = typeof hoofcare.$inferSelect;
export type InsertHoofcare = typeof hoofcare.$inferInsert;

// Nutrition logs module
export const nutritionLogs = mysqlTable("nutritionLogs", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  logDate: date("logDate").notNull(),
  feedType: varchar("feedType", { length: 100 }).notNull(),
  feedName: varchar("feedName", { length: 200 }),
  amount: varchar("amount", { length: 100 }), // e.g., "2 kg", "3 scoops"
  mealTime: varchar("mealTime", { length: 50 }), // morning, midday, evening
  supplements: text("supplements"),
  hay: varchar("hay", { length: 100 }),
  water: varchar("water", { length: 100 }),
  bodyConditionScore: int("bodyConditionScore"), // 1-9 scale
  weight: int("weight"), // in kg
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NutritionLog = typeof nutritionLogs.$inferSelect;
export type InsertNutritionLog = typeof nutritionLogs.$inferInsert;

// Nutrition plans module (enhanced feeding plans)
export const nutritionPlans = mysqlTable("nutritionPlans", {
  id: int("id").autoincrement().primaryKey(),
  horseId: int("horseId").notNull(),
  userId: int("userId").notNull(),
  planName: varchar("planName", { length: 200 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  targetWeight: int("targetWeight"), // in kg
  targetBodyCondition: int("targetBodyCondition"), // 1-9 scale
  dailyHay: varchar("dailyHay", { length: 100 }),
  dailyConcentrates: varchar("dailyConcentrates", { length: 200 }),
  supplements: text("supplements"),
  specialInstructions: text("specialInstructions"),
  feedingSchedule: text("feedingSchedule"), // JSON with meal times and amounts
  caloriesPerDay: int("caloriesPerDay"),
  proteinPerDay: varchar("proteinPerDay", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NutritionPlan = typeof nutritionPlans.$inferSelect;
export type InsertNutritionPlan = typeof nutritionPlans.$inferInsert;

// Notes module - voice dictation and general notes
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  horseId: int("horseId"), // optional, can be general note
  title: varchar("title", { length: 200 }),
  content: text("content").notNull(),
  transcribed: boolean("transcribed").default(false).notNull(), // true if from voice
  tags: text("tags"), // JSON array of tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// GPS Ride Tracking – recorded rides with GPS route data
// ─────────────────────────────────────────────────────────────────────────────
export const rides = mysqlTable("rides", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  horseId: int("horseId"),
  name: varchar("name", { length: 200 }).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  duration: int("duration").notNull(), // seconds
  distance: int("distance").notNull(), // meters (stored as integer)
  avgSpeed: int("avgSpeed").default(0).notNull(), // km/h * 100 (store as int for precision)
  maxSpeed: int("maxSpeed").default(0).notNull(), // km/h * 100
  // Route points stored as JSON: [{lat,lng,timestamp,speed?}]
  routeData: text("routeData"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Ride = typeof rides.$inferSelect;
export type InsertRide = typeof rides.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Sales chat leads – persisted from the floating chat widget
// ─────────────────────────────────────────────────────────────────────────────
export const chatLeads = mysqlTable("chatLeads", {
  id: int("id").autoincrement().primaryKey(),
  leadId: varchar("leadId", { length: 40 }).notNull().unique(), // client-generated id
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  message: text("message"),
  source: varchar("source", { length: 50 }).default("chat"),
  // Full chat transcript stored as JSON string: [{role, content}]
  transcript: text("transcript"),
  ipHash: varchar("ipHash", { length: 64 }), // SHA-256 of IP for audit, not raw IP
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatLead = typeof chatLeads.$inferSelect;
export type InsertChatLead = typeof chatLeads.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Contact form submissions
// ─────────────────────────────────────────────────────────────────────────────
export const contactSubmissions = mysqlTable("contactSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  message: text("message").notNull(),
  ipHash: varchar("ipHash", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Site settings - key/value store for admin-configurable runtime options.
// Provider keys may be saved here by the hidden admin UI; environment
// variables remain the fallback source.
// ─────────────────────────────────────────────────────────────────────────────
export const siteSettings = mysqlTable("siteSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SiteSetting = typeof siteSettings.$inferSelect;
export type InsertSiteSetting = typeof siteSettings.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Email campaigns – admin-sent marketing/outreach emails
// ─────────────────────────────────────────────────────────────────────────────
export const emailCampaigns = mysqlTable("emailCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlBody: text("htmlBody").notNull(),
  templateId: varchar("templateId", { length: 50 }),
  segment: varchar("segment", { length: 50 }).notNull(), // 'leads','trial','paid','all','marketing'
  customFilter: text("customFilter"), // JSON filter criteria for custom segments
  targetCountry: varchar("targetCountry", { length: 100 }), // UK, Ireland, USA, etc.
  targetType: varchar("targetType", { length: 100 }), // school, stable, etc.
  dailyLimit: int("dailyLimit").default(50).notNull(),
  sentToday: int("sentToday").default(0).notNull(),
  lastSendDate: varchar("lastSendDate", { length: 10 }), // YYYY-MM-DD
  recipientCount: int("recipientCount").default(0).notNull(),
  sentCount: int("sentCount").default(0).notNull(),
  failedCount: int("failedCount").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("draft").notNull(), // draft, sending, sent, paused, failed
  sentAt: timestamp("sentAt"),
  pausedAt: timestamp("pausedAt"),
  sentByUserId: int("sentByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Email campaign recipients – tracks individual sends to prevent duplicates
// ─────────────────────────────────────────────────────────────────────────────
export const emailCampaignRecipients = mysqlTable("emailCampaignRecipients", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }),
  status: varchar("status", { length: 30 }).default("pending").notNull(), // pending, sent, failed
  sentAt: timestamp("sentAt"),
  error: text("error"),
});

export type EmailCampaignRecipient = typeof emailCampaignRecipients.$inferSelect;
export type InsertEmailCampaignRecipient = typeof emailCampaignRecipients.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Site analytics – lightweight page view / session tracking
// ─────────────────────────────────────────────────────────────────────────────
export const siteAnalytics = mysqlTable("siteAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  visitorId: varchar("visitorId", { length: 64 }).notNull(), // hashed fingerprint
  path: varchar("path", { length: 500 }).notNull(),
  referrer: varchar("referrer", { length: 500 }),
  userAgent: varchar("userAgent", { length: 500 }),
  deviceType: varchar("deviceType", { length: 20 }), // desktop, mobile, tablet
  country: varchar("country", { length: 10 }),
  duration: int("duration").default(0), // seconds spent on page
  isCtaClick: boolean("isCtaClick").default(false),
  ctaType: varchar("ctaType", { length: 50 }), // signup, trial, upgrade, etc.
  userId: int("userId"), // if authenticated
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SiteAnalytic = typeof siteAnalytics.$inferSelect;
export type InsertSiteAnalytic = typeof siteAnalytics.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Marketing contacts – external leads imported via CSV / manual entry
// ─────────────────────────────────────────────────────────────────────────────
export const marketingContacts = mysqlTable("marketingContacts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 200 }),
  businessName: varchar("businessName", { length: 300 }),
  tenantId: varchar("tenantId", { length: 100 }).default("global").notNull(),
  tenantType: varchar("tenantType", { length: 50 }).default("individual").notNull(),
  contactType: varchar("contactType", { length: 50 }).default("individual"), // individual, riding_school, stable, school, college, academy, venue, federation, governance, health_vet, elite_luxury, racing, breeding
  source: varchar("source", { length: 100 }).default("manual"), // manual, csv_import, xlsx_import, website, referral
  tags: text("tags"), // JSON array of tag strings
  region: varchar("region", { length: 100 }),
  country: varchar("country", { length: 100 }), // UK, Ireland, USA, etc.
  leadFocus: varchar("leadFocus", { length: 200 }), // what the lead is interested in
  organizationName: varchar("organizationName", { length: 300 }), // org name if different from businessName
  status: varchar("status", { length: 30 }).default("active").notNull(), // active, unsubscribed, bounced
  onboardingStatus: varchar("onboardingStatus", { length: 30 }).default("not_started"),
  referralCode: varchar("referralCode", { length: 80 }),
  engagementScore: int("engagementScore").default(0),
  metadataJson: text("metadataJson"), // app-agnostic CRM metadata JSON
  unsubscribeToken: varchar("unsubscribeToken", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastContactedAt: timestamp("lastContactedAt"),
  /**
   * If non-null, this contact has been flagged by the duplicate-person scan
   * as a probable duplicate of the contact with this ID.
   * Autopilot enrollment skips flagged contacts until an admin clears the flag.
   */
  suspectedDuplicateOf: int("suspectedDuplicateOf"),
  /**
   * 0–100 risk score produced by the deterministic trigram + domain + geography
   * algorithm.  Null = not yet scanned.  >= 55 triggers the suspectedDuplicateOf flag.
   */
  dupRiskScore: int("dupRiskScore"),
});

export type MarketingContact = typeof marketingContacts.$inferSelect;
export type InsertMarketingContact = typeof marketingContacts.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Email unsubscribes – global suppression list (UK GDPR / PECR compliant)
// ─────────────────────────────────────────────────────────────────────────────
export const emailUnsubscribes = mysqlTable("emailUnsubscribes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull(),
  reason: varchar("reason", { length: 200 }),
  source: varchar("source", { length: 50 }).default("link"), // link, admin, bounce, complaint
  unsubscribedAt: timestamp("unsubscribedAt").defaultNow().notNull(),
});

export type EmailUnsubscribe = typeof emailUnsubscribes.$inferSelect;
export type InsertEmailUnsubscribe = typeof emailUnsubscribes.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Campaign sequences – multi-step drip sequences for campaigns
// ─────────────────────────────────────────────────────────────────────────────
export const campaignSequences = mysqlTable("campaignSequences", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  stepNumber: int("stepNumber").notNull(), // 1,2,3,4
  delayDays: int("delayDays").notNull(), // days from initial send (0,3,7,14)
  scheduledDate: varchar("scheduledDate", { length: 10 }), // YYYY-MM-DD when this step should send
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlBody: text("htmlBody").notNull(),
  templateId: varchar("templateId", { length: 50 }),
  status: varchar("status", { length: 30 }).default("pending").notNull(), // pending, sent, skipped
  sentAt: timestamp("sentAt"),
  sentCount: int("sentCount").default(0).notNull(),
  failedCount: int("failedCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignSequence = typeof campaignSequences.$inferSelect;
export type InsertCampaignSequence = typeof campaignSequences.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Campaign sequence recipients – tracks per-step delivery
// ─────────────────────────────────────────────────────────────────────────────
export const campaignSequenceRecipients = mysqlTable("campaignSequenceRecipients", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequenceId").notNull(),
  campaignId: int("campaignId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: varchar("status", { length: 30 }).default("pending").notNull(), // pending, sent, failed, skipped
  sentAt: timestamp("sentAt"),
  error: text("error"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Campaign send log — tracks daily send counts for rate limiting
// ─────────────────────────────────────────────────────────────────────────────
export const campaignSendLog = mysqlTable("campaignSendLog", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  sendDate: varchar("sendDate", { length: 10 }).notNull(), // YYYY-MM-DD
  sendCount: int("sendCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignSendLogRow = typeof campaignSendLog.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// Campaign replies — stores IMAP-fetched replies to campaign emails
// Enables operator visibility of interested/replied contacts without AI auto-reply
// ─────────────────────────────────────────────────────────────────────────────
export const campaignReplies = mysqlTable("campaignReplies", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 500 }).notNull(), // IMAP/RFC 2822 Message-ID
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 200 }),
  subject: varchar("subject", { length: 500 }),
  snippet: text("snippet"), // first ~250 chars of body
  receivedAt: timestamp("receivedAt").notNull(),
  // Matched context
  matchedCampaignId: int("matchedCampaignId"),
  matchedContactId: int("matchedContactId"),
  // Operator status
  status: varchar("status", { length: 30 }).default("new").notNull(), // new, read, interested, not_interested, follow_up, converted, do_not_contact
  notes: text("notes"),
  sequenceStopped: boolean("sequenceStopped").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignReply = typeof campaignReplies.$inferSelect;
export type InsertCampaignReply = typeof campaignReplies.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Growth Engine foundations (Phase 4)
// ─────────────────────────────────────────────────────────────────────────────
export const growthQueueJobs = mysqlTable("growthQueueJobs", {
  id: int("id").autoincrement().primaryKey(),
  queueType: varchar("queueType", { length: 40 }).notNull(), // approval, media, lifecycle
  status: varchar("status", { length: 40 }).notNull(), // approval/media lifecycle state
  task: varchar("task", { length: 80 }),
  provider: varchar("provider", { length: 50 }),
  tenantType: varchar("tenantType", { length: 50 }).default("individual").notNull(),
  tenantId: varchar("tenantId", { length: 100 }).default("global").notNull(),
  createdByUserId: int("createdByUserId"),
  reviewedByUserId: int("reviewedByUserId"),
  payloadJson: text("payloadJson").notNull(),
  outputJson: text("outputJson"),
  metadataJson: text("metadataJson"),
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  errorMessage: text("errorMessage"),
  rejectionReason: text("rejectionReason"),
  runAfter: timestamp("runAfter").defaultNow().notNull(),
  scheduleAt: timestamp("scheduleAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowthQueueJob = typeof growthQueueJobs.$inferSelect;
export type InsertGrowthQueueJob = typeof growthQueueJobs.$inferInsert;

export const growthSocialConnections = mysqlTable("growthSocialConnections", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 100 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  state: varchar("state", { length: 40 }).default("not_connected").notNull(),
  encryptedAccessToken: text("encryptedAccessToken"),
  encryptedRefreshToken: text("encryptedRefreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowthSocialConnection = typeof growthSocialConnections.$inferSelect;
export type InsertGrowthSocialConnection = typeof growthSocialConnections.$inferInsert;

export const growthOnboardingFlows = mysqlTable("growthOnboardingFlows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: varchar("tenantId", { length: 100 }).notNull(),
  onboardingType: varchar("onboardingType", { length: 40 }).notNull(),
  status: varchar("status", { length: 30 }).default("not_started").notNull(),
  step: int("step").default(1).notNull(),
  progressPercent: int("progressPercent").default(0).notNull(),
  checklistJson: text("checklistJson"),
  quickWinsJson: text("quickWinsJson"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowthOnboardingFlow = typeof growthOnboardingFlows.$inferSelect;
export type InsertGrowthOnboardingFlow = typeof growthOnboardingFlows.$inferInsert;

export const growthAutomationRuns = mysqlTable("growthAutomationRuns", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 100 }).notNull(),
  contactId: int("contactId"),
  workflowKey: varchar("workflowKey", { length: 120 }).notNull(),
  runStatus: varchar("runStatus", { length: 30 }).notNull(),
  triggerSource: varchar("triggerSource", { length: 60 }).notNull(),
  triggerEvent: varchar("triggerEvent", { length: 80 }).notNull(),
  runAt: timestamp("runAt").defaultNow().notNull(),
  payloadJson: text("payloadJson"),
  outcomeJson: text("outcomeJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowthAutomationRun = typeof growthAutomationRuns.$inferSelect;
export type InsertGrowthAutomationRun = typeof growthAutomationRuns.$inferInsert;

export const growthReferrals = mysqlTable("growthReferrals", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 100 }).notNull(),
  inviterUserId: int("inviterUserId"),
  inviteeEmail: varchar("inviteeEmail", { length: 320 }),
  referralType: varchar("referralType", { length: 40 }).notNull(), // stable, school, academy, yard, general
  source: varchar("source", { length: 80 }).notNull(),
  referralCode: varchar("referralCode", { length: 80 }).notNull(),
  status: varchar("status", { length: 30 }).default("sent").notNull(),
  convertedAt: timestamp("convertedAt"),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowthReferral = typeof growthReferrals.$inferSelect;
export type InsertGrowthReferral = typeof growthReferrals.$inferInsert;

export const growthAnalyticsEvents = mysqlTable("growthAnalyticsEvents", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 100 }).notNull(),
  actorUserId: int("actorUserId"),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  stage: varchar("stage", { length: 80 }).notNull(),
  source: varchar("source", { length: 80 }),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GrowthAnalyticsEvent = typeof growthAnalyticsEvents.$inferSelect;
export type InsertGrowthAnalyticsEvent = typeof growthAnalyticsEvents.$inferInsert;

export const growthFeedback = mysqlTable("growthFeedback", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 100 }).notNull(),
  userId: int("userId"),
  feedbackType: varchar("feedbackType", { length: 40 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description").notNull(),
  satisfactionScore: int("satisfactionScore"),
  status: varchar("status", { length: 30 }).default("new").notNull(),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowthFeedback = typeof growthFeedback.$inferSelect;
export type InsertGrowthFeedback = typeof growthFeedback.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Student System (Phase 2) — Virtual Horses, Tasks, Training, Progress, Study Hub, AI Tutor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Virtual horses – learning-oriented horse profiles for students.
 * Distinct from the main horses table. Students may also be assigned a real
 * horse via studentHorseAssignments.
 */
export const virtualHorses = mysqlTable("virtualHorses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  color: varchar("color", { length: 50 }),
  age: int("age"),
  personality: varchar("personality", { length: 100 }), // calm, spirited, gentle, etc.
  // Care status counters (0-100 scale, higher = better)
  feedingScore: int("feedingScore").default(80).notNull(),
  groomingScore: int("groomingScore").default(80).notNull(),
  exerciseScore: int("exerciseScore").default(80).notNull(),
  healthScore: int("healthScore").default(80).notNull(),
  overallScore: int("overallScore").default(80).notNull(),
  photoUrl: text("photoUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VirtualHorse = typeof virtualHorses.$inferSelect;
export type InsertVirtualHorse = typeof virtualHorses.$inferInsert;

/**
 * Student horse assignments – links a student to a REAL horse (from the
 * existing horses table) via a school/stable.
 */
export const studentHorseAssignments = mysqlTable("studentHorseAssignments", {
  id: int("id").autoincrement().primaryKey(),
  studentUserId: int("studentUserId").notNull(),
  horseId: int("horseId").notNull(),
  assignedBy: int("assignedBy"), // userId of the trainer/school admin
  stableId: int("stableId"), // optional – if assigned through a stable
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export type StudentHorseAssignment = typeof studentHorseAssignments.$inferSelect;
export type InsertStudentHorseAssignment = typeof studentHorseAssignments.$inferInsert;

/**
 * Student tasks – daily/weekly care and learning tasks.
 */
export const studentTasks = mysqlTable("studentTasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("care").notNull(), // care, grooming, feeding, study, exercise, other
  frequency: varchar("frequency", { length: 20 }).default("daily").notNull(), // daily, weekly, once
  targetDate: date("targetDate"),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentTask = typeof studentTasks.$inferSelect;
export type InsertStudentTask = typeof studentTasks.$inferInsert;

/**
 * Student training entries – simplified training log for students.
 */
export const studentTrainingEntries = mysqlTable("studentTrainingEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  sessionDate: date("sessionDate").notNull(),
  duration: int("duration"), // minutes
  sessionType: varchar("sessionType", { length: 50 }).default("lesson").notNull(), // lesson, practice, groundwork, theory, other
  notes: text("notes"),
  wentWell: text("wentWell"),
  needsImprovement: text("needsImprovement"),
  instructor: varchar("instructor", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentTrainingEntry = typeof studentTrainingEntries.$inferSelect;
export type InsertStudentTrainingEntry = typeof studentTrainingEntries.$inferInsert;

/**
 * Student progress – tracks skill development over time.
 */
export const studentProgress = mysqlTable("studentProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  skillArea: varchar("skillArea", { length: 100 }).notNull(), // riding_position, aids_control, grooming, feeding, tack, safety, health_awareness, behaviour
  level: int("level").default(1).notNull(), // 1-10 proficiency
  xp: int("xp").default(0).notNull(), // experience points within level
  lastActivityAt: timestamp("lastActivityAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentProgress = typeof studentProgress.$inferSelect;
export type InsertStudentProgress = typeof studentProgress.$inferInsert;

/**
 * Study topics – structured learning content categories.
 */
export const studyTopics = mysqlTable("studyTopics", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 80 }).notNull(), // riding, care, theory, safety
  difficulty: varchar("difficulty", { length: 20 }).default("beginner").notNull(), // beginner, intermediate, advanced
  contentMd: text("contentMd"), // Markdown content (expandable later)
  sortOrder: int("sortOrder").default(0).notNull(),
  isPublished: boolean("isPublished").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudyTopic = typeof studyTopics.$inferSelect;
export type InsertStudyTopic = typeof studyTopics.$inferInsert;

/**
 * AI tutor sessions – logs AI tutor interactions for cost tracking and auditing.
 */
export const aiTutorSessions = mysqlTable("aiTutorSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  modelUsed: varchar("modelUsed", { length: 100 }),
  tier: varchar("tier", { length: 20 }).default("standard").notNull(), // standard (cheap), smart (escalated)
  promptTokens: int("promptTokens").default(0).notNull(),
  completionTokens: int("completionTokens").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiTutorSession = typeof aiTutorSessions.$inferSelect;
export type InsertAiTutorSession = typeof aiTutorSessions.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3 — School / Teacher system
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Student groups / classes managed by a teacher.
 */
export const studentGroups = mysqlTable("studentGroups", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  level: varchar("level", { length: 30 }).default("beginner").notNull(), // beginner, developing, intermediate, advanced
  academicYear: varchar("academicYear", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentGroup = typeof studentGroups.$inferSelect;
export type InsertStudentGroup = typeof studentGroups.$inferInsert;

/**
 * Students assigned to groups.
 */
export const studentGroupMembers = mysqlTable("studentGroupMembers", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  studentUserId: int("studentUserId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type StudentGroupMember = typeof studentGroupMembers.$inferSelect;
export type InsertStudentGroupMember = typeof studentGroupMembers.$inferInsert;

/**
 * Tasks assigned by a teacher to a student or group.
 */
export const teacherAssignedTasks = mysqlTable("teacherAssignedTasks", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  studentUserId: int("studentUserId"), // null = group assignment
  groupId: int("groupId"),             // null = individual assignment
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("care").notNull(),
  dueDate: date("dueDate"),
  frequency: varchar("frequency", { length: 20 }).default("once").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  completedByStudentId: int("completedByStudentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeacherAssignedTask = typeof teacherAssignedTasks.$inferSelect;
export type InsertTeacherAssignedTask = typeof teacherAssignedTasks.$inferInsert;

/**
 * Teacher feedback on student training entries, tasks, or general progress.
 */
export const teacherFeedback = mysqlTable("teacherFeedback", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  studentUserId: int("studentUserId").notNull(),
  entryType: varchar("entryType", { length: 50 }).notNull(), // training_entry, task, general, progress
  entryId: int("entryId"),       // nullable — for general feedback
  comment: text("comment").notNull(),
  feedbackType: varchar("feedbackType", { length: 30 }).default("general").notNull(), // good, needs_improvement, urgent, general
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeacherFeedbackEntry = typeof teacherFeedback.$inferSelect;
export type InsertTeacherFeedbackEntry = typeof teacherFeedback.$inferInsert;

/**
 * Learning pathway progress — tracks which study topics and scenarios a student
 * has completed per level.
 */
export const learningPathwayProgress = mysqlTable("learningPathwayProgress", {
  id: int("id").autoincrement().primaryKey(),
  studentUserId: int("studentUserId").notNull(),
  pathwayLevel: varchar("pathwayLevel", { length: 30 }).notNull(), // beginner, developing, intermediate, advanced
  itemType: varchar("itemType", { length: 30 }).notNull(),         // study_topic, scenario
  itemSlug: varchar("itemSlug", { length: 100 }).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type LearningPathwayProgress = typeof learningPathwayProgress.$inferSelect;
export type InsertLearningPathwayProgress = typeof learningPathwayProgress.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Lesson Engine — structured learning pathways with full educational content
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lesson pathways — high-level learning tracks (e.g. "Horse Care Foundations").
 */
export const lessonPathways = mysqlTable("lessonPathways", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  iconName: varchar("iconName", { length: 50 }),
  isPublished: boolean("isPublished").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LessonPathway = typeof lessonPathways.$inferSelect;
export type InsertLessonPathway = typeof lessonPathways.$inferInsert;

/**
 * Lesson units — individual lessons with full educational content, objectives,
 * knowledge checks, safety notes, and AI tutor prompts.
 */
export const lessonUnits = mysqlTable("lessonUnits", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  pathwaySlug: varchar("pathwaySlug", { length: 100 }).notNull(),
  title: varchar("title", { length: 250 }).notNull(),
  level: varchar("level", { length: 30 }).notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  objectives: text("objectives").notNull(),
  content: text("content").notNull(),
  keyPoints: text("keyPoints").notNull(),
  safetyNote: text("safetyNote").notNull(),
  practicalApplication: text("practicalApplication").notNull(),
  commonMistakes: text("commonMistakes").notNull(),
  knowledgeCheck: text("knowledgeCheck").notNull(),
  aiTutorPrompts: text("aiTutorPrompts").notNull(),
  isPublished: boolean("isPublished").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type LessonUnit = typeof lessonUnits.$inferSelect;
export type InsertLessonUnit = typeof lessonUnits.$inferInsert;

/**
 * Lesson completion — records each lesson a student finishes, with optional
 * quiz score.
 */
export const lessonCompletion = mysqlTable("lessonCompletion", {
  id: int("id").autoincrement().primaryKey(),
  studentUserId: int("studentUserId").notNull(),
  lessonSlug: varchar("lessonSlug", { length: 150 }).notNull(),
  pathwaySlug: varchar("pathwaySlug", { length: 100 }).notNull(),
  level: varchar("level", { length: 30 }).notNull(),
  score: int("score"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Competency System + Teacher Lesson Assignment + Lesson Reviews
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Student competencies — teacher-signed records of student capability in
 * specific skill areas (BHS / Pony Club standard competency framework).
 */
export const studentCompetencies = mysqlTable("studentCompetencies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  competencyKey: varchar("competencyKey", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  level: varchar("level", { length: 30 }).default("beginner").notNull(),
  status: mysqlEnum("status", ["not_assessed", "in_progress", "achieved", "needs_support"])
    .default("not_assessed").notNull(),
  teacherComment: text("teacherComment"),
  signedOffBy: int("signedOffBy"),
  signedOffAt: timestamp("signedOffAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentCompetency = typeof studentCompetencies.$inferSelect;
export type InsertStudentCompetency = typeof studentCompetencies.$inferInsert;

/**
 * Teacher lesson assignments — teachers can assign a lesson or full pathway
 * to an individual student or a group, with a due date and optional notes.
 */
export const teacherLessonAssignments = mysqlTable("teacherLessonAssignments", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  studentUserId: int("studentUserId"),
  groupId: int("groupId"),
  assignmentType: mysqlEnum("assignmentType", ["lesson", "pathway"]).default("lesson").notNull(),
  lessonSlug: varchar("lessonSlug", { length: 150 }),
  pathwaySlug: varchar("pathwaySlug", { length: 100 }),
  dueDate: date("dueDate"),
  instructions: text("instructions"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeacherLessonAssignment = typeof teacherLessonAssignments.$inferSelect;
export type InsertTeacherLessonAssignment = typeof teacherLessonAssignments.$inferInsert;

/**
 * Lesson reviews — teacher review of a student's lesson completion, with
 * outcome, feedback, recommended next lesson, and optional competency link.
 */
export const lessonReviews = mysqlTable("lessonReviews", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  studentUserId: int("studentUserId").notNull(),
  lessonSlug: varchar("lessonSlug", { length: 150 }).notNull(),
  lessonCompletionId: int("lessonCompletionId"),
  reviewStatus: mysqlEnum("reviewStatus", ["satisfactory", "needs_improvement"])
    .default("satisfactory").notNull(),
  feedback: text("feedback"),
  recommendedNextLesson: varchar("recommendedNextLesson", { length: 150 }),
  competencyKey: varchar("competencyKey", { length: 100 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LessonReview = typeof lessonReviews.$inferSelect;
export type InsertLessonReview = typeof lessonReviews.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// School / Organisation System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Organizations — schools, riding academies, colleges, training centres.
 * Each organization is owned by a school_owner user and maps to a billing
 * plan with seat limits.
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(), // FK → users.id (school_owner)
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  planTier: varchar("planTier", { length: 30 }).notNull().default("school_10"), // school_10, school_20, school_50, school_enterprise
  maxStudents: int("maxStudents").notNull().default(10),
  maxTeachers: int("maxTeachers").notNull().default(3),
  isActive: boolean("isActive").default(true).notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Organization members — links users to an organization with a specific role.
 * Enforces ONE user = ONE account rule (a user can only belong to one org).
 */
export const organizationMembers = mysqlTable("organizationMembers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(), // FK → organizations.id
  userId: int("userId").notNull(), // FK → users.id
  role: varchar("role", { length: 30 }).notNull(), // school_owner, teacher, student
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

/**
 * Organization invites — email-based invite tokens for teachers and students
 * to join a school.
 */
export const organizationInvites = mysqlTable("organizationInvites", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  invitedEmail: varchar("invitedEmail", { length: 320 }).notNull(),
  role: varchar("role", { length: 30 }).notNull(), // teacher, student
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrganizationInvite = typeof organizationInvites.$inferSelect;
export type InsertOrganizationInvite = typeof organizationInvites.$inferInsert;

/**
 * Teacher resources — files (PDFs, images, documents) uploaded by teachers
 * that can be shared with students, groups, or the whole class.
 */
export const teacherResources = mysqlTable("teacherResources", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(), // FK → users.id
  title: varchar("title", { length: 250 }).notNull(),
  description: text("description"),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileType: varchar("fileType", { length: 30 }).notNull(), // pdf, image, document
  fileSize: int("fileSize"),
  /** Share scope: 'all' | 'group' | 'individual' */
  shareScope: varchar("shareScope", { length: 20 }).notNull().default("all"),
  /** If shareScope is 'group', this is the group ID */
  groupId: int("groupId"),
  /** If shareScope is 'individual', this is the student user ID */
  studentId: int("studentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeacherResource = typeof teacherResources.$inferSelect;
export type InsertTeacherResource = typeof teacherResources.$inferInsert;

/**
 * Student assignments — work assigned by teachers that students submit.
 */
export const studentAssignments = mysqlTable("studentAssignments", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  studentId: int("studentId").notNull(),
  title: varchar("title", { length: 250 }).notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate"),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // pending, submitted, reviewed
  /** Student's submission file URL (PDF upload) */
  submissionUrl: varchar("submissionUrl", { length: 1000 }),
  submittedAt: timestamp("submittedAt"),
  /** Teacher's mark/grade */
  grade: varchar("grade", { length: 20 }),
  /** Teacher's feedback text */
  feedback: text("feedback"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentAssignment = typeof studentAssignments.$inferSelect;
export type InsertStudentAssignment = typeof studentAssignments.$inferInsert;

/**
 * Teacher report templates — pre-built report structures that teachers can
 * use to generate student progress reports.
 */
export const reportTemplates = mysqlTable("reportTemplates", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId"), // null = system-provided template
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  /** JSON structure defining report sections and fields */
  templateData: text("templateData").notNull(),
  isSystem: boolean("isSystem").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;

/**
 * Teacher-generated student reports — instances of reports generated from templates.
 */
export const studentReports = mysqlTable("studentReports", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  studentId: int("studentId").notNull(),
  templateId: int("templateId"),
  title: varchar("title", { length: 250 }).notNull(),
  /** JSON report content */
  reportData: text("reportData").notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudentReport = typeof studentReports.$inferSelect;
export type InsertStudentReport = typeof studentReports.$inferInsert;

/**
 * Teacher ↔ Student messages — direct messaging between teachers and their
 * assigned students. Each message belongs to a teacher-student pair.
 */
export const teacherStudentMessages = mysqlTable("teacherStudentMessages", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  studentId: int("studentId").notNull(),
  senderRole: varchar("senderRole", { length: 10 }).notNull(), // 'teacher' | 'student'
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeacherStudentMessage = typeof teacherStudentMessages.$inferSelect;
export type InsertTeacherStudentMessage = typeof teacherStudentMessages.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Update 1: Growth Engine Foundation Core
// Media Assets, Brand Profiles, Brand Avatars, Growth Intelligence
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Media Assets Registry — tracks all generated media assets.
 * Links to growthQueueJobs via jobId for backwards compatibility.
 */
export const mediaAssets = mysqlTable("mediaAssets", {
  id: int("id").autoincrement().primaryKey(),
  tenantType: varchar("tenantType", { length: 50 }).notNull().default("individual"),
  tenantId: varchar("tenantId", { length: 100 }).notNull().default("global"),
  userId: int("userId"),
  campaignId: int("campaignId"),
  draftId: varchar("draftId", { length: 40 }),
  jobId: varchar("jobId", { length: 40 }),
  // type: image | video | avatar | voice | thumbnail | document | other
  type: varchar("type", { length: 30 }).notNull().default("other"),
  provider: varchar("provider", { length: 50 }),
  task: varchar("task", { length: 80 }),
  // status: created | processing | completed | failed | deleted
  status: varchar("status", { length: 30 }).notNull().default("created"),
  localPath: text("localPath"),
  publicUrl: text("publicUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  mimeType: varchar("mimeType", { length: 120 }),
  fileSizeBytes: int("fileSizeBytes"),
  durationSeconds: int("durationSeconds"),
  width: int("width"),
  height: int("height"),
  generationPrompt: text("generationPrompt"),
  generationSettingsJson: text("generationSettingsJson"),
  outputMetadataJson: text("outputMetadataJson"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertMediaAsset = typeof mediaAssets.$inferInsert;

/**
 * Brand Profiles — persistent brand identity for content generation enrichment.
 * One profile per tenant (upsert pattern).
 */
export const brandProfiles = mysqlTable("brandProfiles", {
  id: int("id").autoincrement().primaryKey(),
  tenantType: varchar("tenantType", { length: 50 }).notNull().default("individual"),
  tenantId: varchar("tenantId", { length: 100 }).notNull().default("global"),
  appKey: varchar("appKey", { length: 80 }).notNull().default("equiprofile"),
  name: varchar("name", { length: 200 }).notNull().default("EquiProfile"),
  brandVoice: text("brandVoice"),
  targetAudience: text("targetAudience"),
  positioning: text("positioning"),
  primaryCta: varchar("primaryCta", { length: 200 }),
  prohibitedClaimsJson: text("prohibitedClaimsJson"),
  approvedClaimsJson: text("approvedClaimsJson"),
  colorsJson: text("colorsJson"),
  logoAssetId: int("logoAssetId"),
  typographyJson: text("typographyJson"),
  hashtagStyle: varchar("hashtagStyle", { length: 80 }),
  contentPillarsJson: text("contentPillarsJson"),
  platformDefaultsJson: text("platformDefaultsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandProfile = typeof brandProfiles.$inferSelect;
export type InsertBrandProfile = typeof brandProfiles.$inferInsert;

/**
 * Brand Avatars — persistent brand character memory for avatar generation.
 * Injected into avatar/video generation prompts for visual consistency.
 */
export const brandAvatars = mysqlTable("brandAvatars", {
  id: int("id").autoincrement().primaryKey(),
  tenantType: varchar("tenantType", { length: 50 }).notNull().default("individual"),
  tenantId: varchar("tenantId", { length: 100 }).notNull().default("global"),
  brandProfileId: int("brandProfileId"),
  name: varchar("name", { length: 200 }).notNull(),
  role: varchar("role", { length: 120 }),
  visualDescription: text("visualDescription"),
  personality: text("personality"),
  voiceStyle: varchar("voiceStyle", { length: 120 }),
  accent: varchar("accent", { length: 80 }),
  wardrobeRules: text("wardrobeRules"),
  backgroundRules: text("backgroundRules"),
  referenceAssetId: int("referenceAssetId"),
  promptTemplate: text("promptTemplate"),
  negativePrompt: text("negativePrompt"),
  consistencySeed: varchar("consistencySeed", { length: 80 }),
  // status: active | archived
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandAvatar = typeof brandAvatars.$inferSelect;
export type InsertBrandAvatar = typeof brandAvatars.$inferInsert;

/**
 * Growth Profiles — per-tenant growth intelligence memory.
 * Tracks goals, audience, cadence, and best-performing patterns.
 */
export const growthProfiles = mysqlTable("growthProfiles", {
  id: int("id").autoincrement().primaryKey(),
  tenantType: varchar("tenantType", { length: 50 }).notNull().default("individual"),
  tenantId: varchar("tenantId", { length: 100 }).notNull().default("global"),
  brandProfileId: int("brandProfileId"),
  targetPlatformsJson: text("targetPlatformsJson"),
  growthGoal: text("growthGoal"),
  audienceDescription: text("audienceDescription"),
  postingCadenceJson: text("postingCadenceJson"),
  conversionGoal: text("conversionGoal"),
  preferredContentTypesJson: text("preferredContentTypesJson"),
  bestPerformingHooksJson: text("bestPerformingHooksJson"),
  bestPostingWindowsJson: text("bestPostingWindowsJson"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowthProfile = typeof growthProfiles.$inferSelect;
export type InsertGrowthProfile = typeof growthProfiles.$inferInsert;

/**
 * Content Scores — deterministic quality scores for marketing drafts and assets.
 * All scores are 0-100.
 */
export const contentScores = mysqlTable("contentScores", {
  id: int("id").autoincrement().primaryKey(),
  draftId: varchar("draftId", { length: 40 }),
  assetId: int("assetId"),
  platform: varchar("platform", { length: 80 }),
  hookScore: int("hookScore"),
  platformFitScore: int("platformFitScore"),
  conversionScore: int("conversionScore"),
  clarityScore: int("clarityScore"),
  complianceScore: int("complianceScore"),
  viralPotentialScore: int("viralPotentialScore"),
  reasonsJson: text("reasonsJson"),
  improvementSuggestionsJson: text("improvementSuggestionsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentScore = typeof contentScores.$inferSelect;
export type InsertContentScore = typeof contentScores.$inferInsert;

/**
 * Platform Strategy Rules — best-practice content strategy rules per platform.
 * NOT fake algorithm promises. Used to guide content generation prompts.
 */
export const platformStrategyRules = mysqlTable("platformStrategyRules", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 80 }).notNull(),
  version: varchar("version", { length: 20 }).notNull().default("1.0"),
  rulesJson: text("rulesJson"),
  recommendedCadenceJson: text("recommendedCadenceJson"),
  hookGuidelinesJson: text("hookGuidelinesJson"),
  formatGuidelinesJson: text("formatGuidelinesJson"),
  complianceNotesJson: text("complianceNotesJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformStrategyRule = typeof platformStrategyRules.$inferSelect;
export type InsertPlatformStrategyRule = typeof platformStrategyRules.$inferInsert;
