/**
 * Frontend Serving — True 2-Frontend Architecture
 *
 * Production:
 *   dist/public/management/  →  served on equiprofile.online
 *     management-assets/     →  /management-assets/ URL namespace
 *   dist/public/school/      →  served on school.equiprofile.online
 *     school-assets/         →  /school-assets/ URL namespace
 *
 * Each frontend has its own isolated asset directory.  URL namespaces never
 * overlap, so cross-site asset collisions are impossible — no merge step needed.
 *
 * Development:
 *   Uses Vite dev server for the site set by VITE_SITE env var
 *   (defaults to "management"). Switch with: VITE_SITE=school npm run dev
 */
import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

// ── Hostname detection ─────────────────────────────────────────────────────

/** Patterns that identify the school subdomain */
const SCHOOL_HOSTNAME_PATTERNS = [
  "school.equiprofile.online",
  "school.localhost",
  "school.127.0.0.1",
];

/**
 * Determine which frontend to serve based on the request hostname.
 * Returns "school" for school.equiprofile.online, "management" for everything else.
 */
function getSiteModeFromRequest(hostname: string): "management" | "school" {
  const lower = hostname.toLowerCase().split(":")[0]; // strip port
  if (
    lower.startsWith("school.") ||
    SCHOOL_HOSTNAME_PATTERNS.some(
      (p) => lower === p || lower.startsWith(p + ":"),
    )
  ) {
    return "school";
  }
  return "management";
}

// ── Development (Vite dev server) ──────────────────────────────────────────

const SENSITIVE_PATH_PATTERNS = [
  /^\/\.env(?:[./]|$)/i,
  /^\/\.git(?:[./]|$)/i,
  /^\/proc\/self\/environ$/i,
  /terraform\.tfstate/i,
  /^\/config\/(?:database\.yml|master\.key)$/i,
  /^\/(?:graphql|graphiql)$/i,
  /^\/(?:redirect|proxy|fetch)(?:[/?#]|$)/i,
  /^\/(?:phpmyadmin|wp-admin|wp-config|wp-login|xmlrpc\.php)(?:[/?#]|$)/i,
  /^\/(?:cgi-bin|actuator|_profiler|solr|shell)(?:[/?#]|$)/i,
  /^\/(?:admin\.php|config\.php|info\.php|phpinfo|test\.php)(?:[/?#]|$)/i,
];

export function isSensitiveProbePath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(lower));
}

export function isApiLikeRoute(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return (
    lower.startsWith("/api/") ||
    lower.startsWith("/trpc") ||
    lower.startsWith("/admin.") ||
    lower === "/graphql" ||
    lower === "/graphiql"
  );
}

function sendSafeNotFound(req: express.Request, res: express.Response) {
  if (isApiLikeRoute(req.path) || req.headers.accept?.includes("application/json")) {
    return res.status(404).json({ error: "Not found" });
  }
  return res.status(404).type("text/plain").send("Not Found");
}

export async function setupVite(app: Express, server: Server) {
  // Serve generated media assets at /media/generated/* in dev mode too
  const storageRoot = path.resolve(
    process.env.EQUIPROFILE_STORAGE_ROOT ?? "/var/equiprofile/storage",
  );
  if (fs.existsSync(storageRoot)) {
    app.use(
      "/media/generated",
      express.static(storageRoot, { index: false, dotfiles: "deny" }),
    );
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };
  const resolvedViteConfig =
    typeof viteConfig === "function"
      ? await viteConfig({
          command: "serve",
          mode: process.env.NODE_ENV || "development",
          isSsrBuild: false,
          isPreview: false,
        })
      : viteConfig;

  const vite = await createViteServer({
    ...resolvedViteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // SPA fallback for development — serve index.html for non-static routes
  app.use((req, res, next) => {
    if (isSensitiveProbePath(req.path)) {
      return sendSafeNotFound(req, res);
    }
    if (
      req.originalUrl.startsWith("/api/") ||
      req.originalUrl.startsWith("/trpc") ||
      req.originalUrl.startsWith("/assets/") ||
      req.originalUrl.match(/\.[a-z0-9]+$/i)
    ) {
      return next();
    }

    const url = req.originalUrl;

    // In dev, serve the site matching VITE_SITE (defaults to management)
    const devSite = process.env.VITE_SITE || "management";
    const clientTemplate = path.resolve(
      import.meta.dirname,
      "../..",
      "client",
      devSite,
      "index.html",
    );

    (async () => {
      try {
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="./src/main.tsx"`,
          `src="./src/main.tsx?v=${nanoid()}"`,
        );

        const rawPage = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(rawPage);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    })();
  });
}

// ── Production (static files) ──────────────────────────────────────────────

export function serveStatic(app: Express) {
  const baseDist =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");

  const mgmtDist = path.resolve(baseDist, "management");
  const schoolDist = path.resolve(baseDist, "school");

  // Serve generated media assets at /media/generated/*
  // STORAGE_ROOT defaults to /var/equiprofile/storage (override: EQUIPROFILE_STORAGE_ROOT)
  const storageRoot = path.resolve(
    process.env.EQUIPROFILE_STORAGE_ROOT ?? "/var/equiprofile/storage",
  );
  if (fs.existsSync(storageRoot)) {
    app.use(
      "/media/generated",
      express.static(storageRoot, {
        index: false,
        dotfiles: "deny",
        setHeaders: (res) => {
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.setHeader("X-Content-Type-Options", "nosniff");
        },
      }),
    );
  } else {
    // Register route anyway — will 404 until storage root is created
    app.use("/media/generated", (_req, res) => res.status(404).end());
  }

  // Verify both frontend builds exist
  for (const [name, dir] of [
    ["management", mgmtDist],
    ["school", schoolDist],
  ] as const) {
    if (!fs.existsSync(dir)) {
      console.warn(
        `⚠️  ${name} frontend build not found at ${dir} — run "npm run build:${name}"`,
      );
    }
  }

  const STATIC_FILE_EXTENSIONS = [
    ".js",
    ".css",
    ".json",
    ".map",
    ".woff",
    ".woff2",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".txt",
    ".webm",
  ];

  const setStaticHeaders = (res: express.Response, filePath: string) => {
    if (filePath.endsWith(".js")) {
      res.setHeader("Content-Type", "application/javascript");
    } else if (filePath.endsWith(".css")) {
      res.setHeader("Content-Type", "text/css");
    } else if (filePath.endsWith(".json")) {
      res.setHeader("Content-Type", "application/json");
    } else if (filePath.endsWith(".woff")) {
      res.setHeader("Content-Type", "font/woff");
    } else if (filePath.endsWith(".woff2")) {
      res.setHeader("Content-Type", "font/woff2");
    } else if (filePath.endsWith(".svg")) {
      res.setHeader("Content-Type", "image/svg+xml");
    }

    if (filePath.endsWith("service-worker.js")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Service-Worker-Allowed", "/");
    } else if (
      filePath.includes("/management-assets/") ||
      filePath.includes("/school-assets/")
    ) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  };

  // Redirect /index.html → / so it goes through the SPA fallback
  app.use((req, _res, next) => {
    if (req.path === "/index.html") {
      req.url = "/";
    }
    next();
  });

  app.use((req, res, next) => {
    if (isSensitiveProbePath(req.path)) {
      return sendSafeNotFound(req, res);
    }
    next();
  });

  // Serve static assets from BOTH frontend builds.
  // Assets live in distinct URL namespaces (/management-assets/ and
  // /school-assets/) so express.static serving from both dirs is safe —
  // the paths are orthogonal and cannot collide.
  app.use(
    express.static(mgmtDist, { index: false, setHeaders: setStaticHeaders }),
  );
  app.use(
    express.static(schoolDist, { index: false, setHeaders: setStaticHeaders }),
  );

  // Known scanner / exploit probe paths — 404 immediately
  // SPA fallback — hostname-aware: serves the correct index.html per domain
  app.use((req, res, next) => {
    // Skip API / tRPC routes
    if (
      req.originalUrl.startsWith("/api/") ||
      req.originalUrl.startsWith("/trpc")
    ) {
      return next();
    }

    // Block probes
    if (isSensitiveProbePath(req.path)) {
      return sendSafeNotFound(req, res);
    }

    if (isApiLikeRoute(req.path)) {
      return res.status(404).json({ error: "Not found" });
    }

    // Don't serve index.html for real asset requests
    const isStaticFile =
      req.originalUrl.startsWith("/management-assets/") ||
      req.originalUrl.startsWith("/school-assets/") ||
      STATIC_FILE_EXTENSIONS.some((ext) => req.originalUrl.endsWith(ext));
    if (isStaticFile) {
      return res.status(404).send("Not Found");
    }

    // Determine which frontend to serve based on hostname
    const siteMode = getSiteModeFromRequest(req.hostname || "");
    const siteDistPath = siteMode === "school" ? schoolDist : mgmtDist;
    const indexPath = path.resolve(siteDistPath, "index.html");

    // No-cache for HTML shell (users always get latest)
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    if (!fs.existsSync(indexPath)) {
      console.error(
        `[vite.ts] index.html not found for ${siteMode}: ${indexPath}`,
      );
      return res.status(503).type("text/plain").send("Frontend temporarily unavailable");
    }

    res.sendFile(indexPath);
  });
}
