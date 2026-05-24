// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
/**
 * Vite Configuration — True 2-Frontend Architecture
 *
 * This repo serves TWO separate frontend applications from one codebase:
 *
 *   1. Management frontend  → equiprofile.online
 *      Entry:  client/management/index.html
 *      Output: dist/public/management/
 *      Assets: dist/public/management/management-assets/  (URL: /management-assets/)
 *
 *   2. School frontend      → school.equiprofile.online
 *      Entry:  client/school/index.html
 *      Output: dist/public/school/
 *      Assets: dist/public/school/school-assets/          (URL: /school-assets/)
 *
 * Asset namespacing guarantees zero cross-site collisions:
 *   - Management HTML references /management-assets/...
 *   - School HTML references /school-assets/...
 *   - The two namespaces never overlap, even for shared dependency chunks.
 *   - No post-build merge step required or used.
 *
 * Both frontends share:
 *   - client/src/          (shared UI, hooks, contexts, lib, dashboard pages)
 *   - shared/              (types, pricing, constants)
 *   - One Express backend  (API, auth, SMTP, admin)
 *
 * Build target is selected by VITE_SITE env var:
 *   VITE_SITE=management  → builds management frontend only
 *   VITE_SITE=school      → builds school frontend only
 *   (no VITE_SITE)        → builds management (default, backward compat)
 *
 * The `npm run build` script builds BOTH by invoking Vite twice.
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig, Plugin, loadEnv } from "vite";

// ── Site target ────────────────────────────────────────────────────────────
// Which frontend to build. Set via VITE_SITE env var.
const SITE_TARGET = (process.env.VITE_SITE || "management") as
  | "management"
  | "school";

const SITE_ROOTS: Record<string, string> = {
  management: path.resolve(import.meta.dirname, "client", "management"),
  school: path.resolve(import.meta.dirname, "client", "school"),
};

const siteRoot = SITE_ROOTS[SITE_TARGET];

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

function injectServiceWorkerVersion(pwaEnabled: boolean): Plugin {
  return {
    name: "inject-service-worker-version",
    apply: "build",
    generateBundle() {
      if (!pwaEnabled) {
        console.log("⚠️  PWA disabled - service worker will NOT be generated");
        console.log("   To enable: set ENABLE_PWA=true in .env");
        return;
      }

      const packageJsonPath = path.resolve(import.meta.dirname, "package.json");
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const version = packageJson.version || "1.0.0";

      const swPath = path.resolve(
        import.meta.dirname,
        "client/public/service-worker.js",
      );
      if (fs.existsSync(swPath)) {
        let swContent = fs.readFileSync(swPath, "utf-8");
        swContent = swContent.replace(
          /const CACHE_VERSION = ['"]([^'"]+)['"]/,
          `const CACHE_VERSION = '${version}'`,
        );

        this.emitFile({
          type: "asset",
          fileName: "service-worker.js",
          source: swContent,
        });

        console.log(`✓ Service worker generated (version: ${version})`);
      } else {
        console.log("⚠️  Service worker source not found at:", swPath);
      }
    },
  };
}

// ── Shared config ──────────────────────────────────────────────────────────
const sharedAlias = {
  "@": path.resolve(import.meta.dirname, "client", "src"),
  "@shared": path.resolve(import.meta.dirname, "shared"),
  "@assets": path.resolve(import.meta.dirname, "attached_assets"),
  mermaid: path.resolve(
    import.meta.dirname,
    "node_modules/mermaid/dist/mermaid.core.mjs",
  ),
};

const sharedManualChunks = (id: string) => {
  // PDF/export (rarely used, lazy-loaded)
  if (
    id.includes("node_modules/jspdf") ||
    id.includes("node_modules/html2canvas") ||
    id.includes("node_modules/qrcode")
  ) {
    return "export-utils";
  }
  // tsParticles (heavy, optional)
  if (
    id.includes("node_modules/@tsparticles") ||
    id.includes("node_modules/tsparticles")
  ) {
    return "tsparticles";
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "");
  const pwaEnabled =
    parseBooleanFlag(env.VITE_PWA_ENABLED) || parseBooleanFlag(env.ENABLE_PWA);

  const plugins = [react(), tailwindcss(), injectServiceWorkerVersion(pwaEnabled)];

  console.log(`\n🏗️  Building ${SITE_TARGET.toUpperCase()} frontend from ${siteRoot}\n`);

  return {
    plugins,
    resolve: {
      alias: sharedAlias,
    },
    envDir: path.resolve(import.meta.dirname),
    root: siteRoot,
    publicDir: path.resolve(import.meta.dirname, "client", "public"),
    optimizeDeps: {
      include: ["mermaid"],
    },
    build: {
      outDir: path.resolve(import.meta.dirname, "dist", "public", SITE_TARGET),
      // Each frontend gets its own asset directory name so their URL paths never
      // overlap.  Management HTML references /management-assets/..., school HTML
      // references /school-assets/...  This eliminates any possibility of cross-
      // site asset collisions without requiring a post-build merge step.
      assetsDir: `${SITE_TARGET}-assets`,
      emptyOutDir: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: sharedManualChunks,
        },
      },
    },
    server: {
      host: true,
      allowedHosts: [".equiprofile.online", "localhost", "127.0.0.1"],
      fs: {
        // Allow reading from parent directories since site roots reference
        // shared code in client/src/ via @/ alias
        strict: false,
        deny: ["**/.*"],
      },
    },
  };
});
