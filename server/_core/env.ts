// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// Load environment variables with fallback to .env.default in non-production
const isProduction = process.env.NODE_ENV === "production";

if (!isProduction) {
  // In development/test, load .env first, then fallback to .env.default
  config(); // Load .env if exists

  // If .env doesn't exist or variables are missing, try .env.default
  const envDefaultPath = resolve(process.cwd(), ".env.default");
  if (existsSync(envDefaultPath)) {
    config({ path: envDefaultPath, override: false }); // Don't override existing vars
  }
} else {
  // In production, only load .env (no fallback)
  config();
}

// Feature flags (default to false for plug-and-play deployment)
const parseBooleanFlag = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "on"
  );
};

const enableStripe = parseBooleanFlag(process.env.ENABLE_STRIPE);
const enableUploads = parseBooleanFlag(process.env.ENABLE_UPLOADS);

// Startup validation helper
function validateEnvironment() {
  // Core required vars (always needed)
  const coreRequiredVars = [
    { name: "DATABASE_URL", description: "Database connection string" },
    { name: "JWT_SECRET", description: "JWT secret for token signing" },
    { name: "ADMIN_UNLOCK_PASSWORD", description: "Admin unlock password" },
  ];

  const missing: Array<{ name: string; description: string }> = [];

  // Check core required variables
  coreRequiredVars.forEach((v) => {
    if (!process.env[v.name]) {
      missing.push(v);
    }
  });

  // Conditionally require Stripe vars if enabled
  if (enableStripe) {
    const stripeVars = [
      { name: "STRIPE_SECRET_KEY", description: "Stripe secret key" },
      { name: "STRIPE_WEBHOOK_SECRET", description: "Stripe webhook secret" },
    ];
    stripeVars.forEach((v) => {
      if (!process.env[v.name]) {
        missing.push(v);
      }
    });
  }

  // Conditionally require upload/storage vars if enabled
  if (enableUploads) {
    // Uploads fall back to local disk storage when no proxy is configured
  }

  // Report missing variables and exit if any
  if (missing.length > 0) {
    console.error("❌ STARTUP ERROR: Missing required environment variables\n");
    console.error(
      "The following required environment variables are not set:\n",
    );
    missing.forEach((v) => {
      console.error(`  • ${v.name} - ${v.description}`);
    });
    console.error("\nFeature flags:");
    console.error(`  • ENABLE_STRIPE=${enableStripe}`);
    console.error(`  • ENABLE_UPLOADS=${enableUploads}`);
    console.error(
      "\nPlease configure all required environment variables in your .env file.",
    );
    console.error(
      "See .env.example for a complete list of available options.\n",
    );
    process.exit(1);
  }

  // Validate admin password is not weak or default in production
  const hasWeakAdminPassword = (password: string) => {
    // Check for common weak patterns
    const weakPatterns = [/^admin$/i, /^password/i, /^12345/, /^equiprofile/i];
    return (
      password.length < 8 ||
      weakPatterns.some((pattern) => pattern.test(password))
    );
  };

  if (
    isProduction &&
    process.env.ADMIN_UNLOCK_PASSWORD &&
    hasWeakAdminPassword(process.env.ADMIN_UNLOCK_PASSWORD)
  ) {
    console.error(
      "❌ PRODUCTION ERROR: ADMIN_UNLOCK_PASSWORD is weak or set to a default value!",
    );
    console.error(
      "You MUST set a strong, secure password before running in production.",
    );
    console.error(
      "Use a password with at least 8 characters, including letters, numbers, and symbols.\n",
    );
    process.exit(1);
  }

  // Validate JWT_SECRET is not set to default values in production
  // Check for common patterns in JWT secrets that indicate they haven't been changed
  const hasDefaultPattern = (secret: string) => {
    const patterns = [
      /your.*secret/i,
      /change.*this/i,
      /placeholder/i,
      /example/i,
      /default/i,
    ];
    return patterns.some((pattern) => pattern.test(secret));
  };

  if (
    isProduction &&
    process.env.JWT_SECRET &&
    hasDefaultPattern(process.env.JWT_SECRET)
  ) {
    console.error(
      "❌ PRODUCTION ERROR: JWT_SECRET appears to be a default/placeholder value!",
    );
    console.error("Generate a secure secret with: openssl rand -base64 32");
    console.error("Update your .env file before running in production.\n");
    process.exit(1);
  }

  // Log OAuth configuration status
  if (process.env.OAUTH_SERVER_URL) {
    if (!process.env.VITE_APP_ID) {
      console.warn(
        "⚠️  WARNING: OAUTH_SERVER_URL is set but VITE_APP_ID is missing.",
      );
      console.warn(
        "   OAuth login will not work correctly without an app ID.\n",
      );
    } else {
      console.log("✅ OAuth configured:", process.env.OAUTH_SERVER_URL);
    }
  } else {
    console.log(
      "ℹ️  OAuth not configured - using email/password authentication only",
    );
  }

  // Log feature status
  console.log("ℹ️  Feature flags:");
  console.log(
    `   • Stripe billing: ${enableStripe ? "✅ enabled" : "❌ disabled"}`,
  );
  console.log(
    `   • Document uploads: ${enableUploads ? "✅ enabled" : "✅ enabled (local disk storage)"}`,
  );

  // Validate JWT secret length in production
  if (isProduction && process.env.JWT_SECRET) {
    const secret = process.env.JWT_SECRET;
    if (secret.length < 32) {
      if (process.env.AUTO_FIX_SECRETS === "true") {
        console.warn(
          "⚠️  WARNING: JWT_SECRET is shorter than 32 characters. AUTO_FIX_SECRETS=true set – continuing anyway.",
        );
        console.warn(
          "   Generate a proper secret with: openssl rand -base64 32\n",
        );
      } else {
        console.error(
          "❌ PRODUCTION ERROR: JWT_SECRET must be at least 32 characters long!",
        );
        console.error(
          "   Generate a secure secret with: openssl rand -base64 32",
        );
        console.error(
          "   To bypass (NOT recommended): set AUTO_FIX_SECRETS=true\n",
        );
        process.exit(1);
      }
    }
  }
}

// Run validation
validateEnvironment();

export const ENV = {
  // Feature flags
  enableStripe,
  enableUploads,

  // App config
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Local file storage path (used when ENABLE_UPLOADS=false or proxy storage is not configured)
  storagePath:
    process.env.STORAGE_PATH ??
    (process.env.NODE_ENV === "production"
      ? "/var/www/equiprofile/uploads"
      : "./uploads"),

  // Admin
  adminUnlockPassword: process.env.ADMIN_UNLOCK_PASSWORD ?? "",
  // Primary admin email — if set, this user is automatically granted the admin role on
  // first login/registration. Remove or leave blank to disable automatic admin promotion.
  primaryAdminEmail: (process.env.PRIMARY_ADMIN_EMAIL ?? "").toLowerCase().trim(),

  // Security
  baseUrl: process.env.BASE_URL ?? "http://localhost:3000",
  cookieDomain: process.env.COOKIE_DOMAIN ?? undefined,
  cookieSecure: process.env.COOKIE_SECURE === "true",

  // Stripe (only used if enableStripe is true)
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // AWS S3 (legacy - kept for backward compatibility)
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  awsRegion: process.env.AWS_REGION ?? "eu-west-2",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",

  // AI providers
  genxApiKey: process.env.GENX_API_KEY ?? "",
  genxBaseUrl: process.env.GENX_BASE_URL ?? "",
  genxModel: process.env.GENX_MODEL ?? "",
};
