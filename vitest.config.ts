import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/**/*.test.ts", "client/**/*.test.tsx"],
    env: {
      // Test environment variables - THESE ARE FOR TESTING ONLY
      // These are not real credentials and should never be used in production
      NODE_ENV: "test",
      // nosemgrep: generic.secrets.gitleaks.generic-api-key.generic-api-key
      DATABASE_URL: "mysql://testuser:testpass@localhost:3306/test_db",
      // nosemgrep: generic.secrets.security.detected-generic-secret.detected-generic-secret
      JWT_SECRET: "test-jwt-secret-min-32-chars-for-testing-purposes-only",
      // nosemgrep: generic.secrets.security.detected-generic-secret.detected-generic-secret
      ADMIN_UNLOCK_PASSWORD: "test-admin-password-for-testing-only",
      ENABLE_STRIPE: "false",
      ENABLE_UPLOADS: "false",
    },
  },
});
