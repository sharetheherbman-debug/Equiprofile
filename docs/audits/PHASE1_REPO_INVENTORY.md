# Phase 1 Repo Inventory

Generated from the checked-out repo on 2026-05-24T11:34:25.460Z.

## Top-Level Folder Inventory

- dir  .github
- dir  client
- dir  deployment
- dir  docs
- dir  drizzle
- dir  knowledge
- dir  patches
- dir  scripts
- dir  server
- dir  shared
- file .env.example
- file .gitignore
- file .nvmrc
- file .prettierignore
- file .trivyignore
- file About.V2.jpg
- file About.jpg
- file Contact.jpg
- file Contactus.V2.jpg
- file Dockerfile
- file Equiprofile logo.png
- file Features.jpg
- file LICENSE
- file LOGO.png
- file Landing page.jpg
- file LandingV3.jpg
- file Pricing.jpg
- file README.md
- file bones64-stable-1683924_1280.jpg
- file components.json
- file docker-compose.yml
- file drizzle.config.ts
- file ecosystem.config.js
- file landing2.jpg
- file package-lock.json
- file package.json
- file start.sh
- file tsconfig.json
- file vite.config.ts
- file vitest.config.ts


## Frontend App Structure

- `client/management` is the management/equiprofile.online Vite entrypoint.
- `client/school` is the school.equiprofile.online Vite entrypoint.
- `client/src/pages` contains shared route pages.
- `client/src/components` contains shared app, auth, management, school, and shadcn/ui components.
- `client/src/v2/pages` contains deploy-time V2 dashboard variants.
- `dir  client/src/_core`
- `dir  client/src/components`
- `dir  client/src/config`
- `dir  client/src/content`
- `dir  client/src/contexts`
- `dir  client/src/hooks`
- `dir  client/src/lib`
- `dir  client/src/pages`
- `dir  client/src/styles`
- `dir  client/src/types`
- `dir  client/src/v2`
- `file client/src/analytics.ts`
- `file client/src/bootstrap.ts`
- `file client/src/const.ts`
- `file client/src/index.css`
- `file client/src/sw-update-prompt.ts`


## Backend/Server Structure

- dir  server/_core
- dir  server/seeds
- file server/admin.test.ts
- file server/api.test.ts
- file server/api.ts
- file server/auth.login.test.ts
- file server/auth.logout.test.ts
- file server/auth.reset.test.ts
- file server/cli.ts
- file server/csvExport.ts
- file server/db.ts
- file server/dynamicConfig.ts
- file server/health.test.ts
- file server/horses.test.ts
- file server/lessonContent.ts
- file server/notes.test.ts
- file server/onboarding.test.ts
- file server/routers.ts
- file server/schoolRouter.ts
- file server/settings.test.ts
- file server/storage.ts
- file server/stripe.ts
- file server/studentRouter.ts
- file server/teacherRouter.ts
- file server/training.test.ts


## Shared Folder Structure

- dir  shared/_core
- file shared/const.ts
- file shared/csvImport.ts
- file shared/pricing.ts
- file shared/types.ts


## Drizzle Schema/Migration Structure

- Schema: `drizzle/schema.ts`
- Relations: `drizzle/relations.ts`
- SQL migrations: 21
- Meta snapshots: 4

| Export | SQL table |
| --- | --- |
| users | users |
| horses | horses |
| healthRecords | healthRecords |
| trainingSessions | trainingSessions |
| feedingPlans | feedingPlans |
| documents | documents |
| weatherLogs | weatherLogs |
| systemSettings | systemSettings |
| adminSessions | adminSessions |
| adminUnlockAttempts | adminUnlockAttempts |
| activityLogs | activityLogs |
| backupLogs | backupLogs |
| stables | stables |
| stableMembers | stableMembers |
| stableInvites | stableInvites |
| events | events |
| eventReminders | eventReminders |
| feedCosts | feedCosts |
| vaccinations | vaccinations |
| dewormings | dewormings |
| shareLinks | shareLinks |
| competitions | competitions |
| documentTags | documentTags |
| stripeEvents | stripeEvents |
| messageThreads | messageThreads |
| messages | messages |
| competitionResults | competitionResults |
| trainingProgramTemplates | trainingProgramTemplates |
| trainingPrograms | trainingPrograms |
| reports | reports |
| reportSchedules | reportSchedules |
| breeding | breeding |
| foals | foals |
| pedigree | pedigree |
| lessonBookings | lessonBookings |
| trainerAvailability | trainerAvailability |
| apiKeys | apiKeys |
| webhooks | webhooks |
| accountFeatures | accountFeatures |
| tasks | tasks |
| contacts | contacts |
| treatments | treatments |
| appointments | appointments |
| dentalCare | dentalCare |
| xrays | xrays |
| tags | tags |
| horseTags | horseTags |
| hoofcare | hoofcare |
| nutritionLogs | nutritionLogs |
| nutritionPlans | nutritionPlans |
| notes | notes |
| rides | rides |
| chatLeads | chatLeads |
| contactSubmissions | contactSubmissions |
| siteSettings | siteSettings |
| emailCampaigns | emailCampaigns |
| emailCampaignRecipients | emailCampaignRecipients |
| siteAnalytics | siteAnalytics |
| marketingContacts | marketingContacts |
| emailUnsubscribes | emailUnsubscribes |
| campaignSequences | campaignSequences |
| campaignSequenceRecipients | campaignSequenceRecipients |
| campaignSendLog | campaignSendLog |
| campaignReplies | campaignReplies |
| virtualHorses | virtualHorses |
| studentHorseAssignments | studentHorseAssignments |
| studentTasks | studentTasks |
| studentTrainingEntries | studentTrainingEntries |
| studentProgress | studentProgress |
| studyTopics | studyTopics |
| aiTutorSessions | aiTutorSessions |
| studentGroups | studentGroups |
| studentGroupMembers | studentGroupMembers |
| teacherAssignedTasks | teacherAssignedTasks |
| teacherFeedback | teacherFeedback |
| learningPathwayProgress | learningPathwayProgress |
| lessonPathways | lessonPathways |
| lessonUnits | lessonUnits |
| lessonCompletion | lessonCompletion |
| studentCompetencies | studentCompetencies |
| teacherLessonAssignments | teacherLessonAssignments |
| lessonReviews | lessonReviews |
| organizations | organizations |
| organizationMembers | organizationMembers |
| organizationInvites | organizationInvites |
| teacherResources | teacherResources |
| studentAssignments | studentAssignments |
| reportTemplates | reportTemplates |
| studentReports | studentReports |
| teacherStudentMessages | teacherStudentMessages |


## Deployment/Systemd/Nginx/Doc Structure

- deployment/archive
- deployment/archive/DEPRECATED.md
- deployment/archive/ops-deprecated
- deployment/archive/ops-deprecated/deploy.sh
- deployment/archive/ops-deprecated/healthcheck.sh
- deployment/archive/ops-deprecated/logrotate
- deployment/archive/ops-deprecated/logrotate/equiprofile
- deployment/archive/ops-deprecated/nginx
- deployment/archive/ops-deprecated/nginx/equiprofile.nginx.conf
- deployment/archive/ops-deprecated/nginx/equiprofile.webdock.conf
- deployment/archive/ops-deprecated/preflight.sh
- deployment/archive/ops-deprecated/systemd
- deployment/archive/ops-deprecated/systemd/equiprofile.service
- deployment/archive/ops-deprecated/verify.sh
- deployment/archive/systemd-deprecated
- deployment/archive/systemd-deprecated/equiprofile.service
- deployment/deploy.sh
- deployment/doctor.sh
- deployment/env-check.sh
- deployment/equiprofile.service
- deployment/install.sh
- deployment/nginx
- deployment/nginx/archive
- deployment/nginx/archive/README.md
- deployment/nginx/archive/nginx-equiprofile.conf
- deployment/nginx/archive/nginx-webdock.conf
- deployment/nginx/equiprofile-static.conf
- deployment/nginx/equiprofile.conf
- deployment/ubuntu24
- deployment/ubuntu24/README.md
- deployment/ubuntu24/equiprofile.service.template
- deployment/ubuntu24/install.sh
- deployment/ubuntu24/nginx.equiprofile.conf.template
- deployment/ubuntu24/uninstall.sh
- deployment/update.sh


## Public Assets Structure

- client/public/.gitkeep
- client/public/assets
- client/public/assets/marketing
- client/public/assets/marketing/.gitkeep
- client/public/assets/marketing/about
- client/public/assets/marketing/about/mission.svg
- client/public/assets/marketing/about/team.svg
- client/public/assets/marketing/about/values.svg
- client/public/assets/marketing/auth
- client/public/assets/marketing/auth/auth-bg.svg
- client/public/assets/marketing/brand
- client/public/assets/marketing/brand/horse-1.svg
- client/public/assets/marketing/brand/logo-full.svg
- client/public/assets/marketing/brand/logo-icon.svg
- client/public/assets/marketing/contact
- client/public/assets/marketing/contact/contact-hero.svg
- client/public/assets/marketing/dashboard
- client/public/assets/marketing/dashboard/dashboard-preview.svg
- client/public/assets/marketing/features
- client/public/assets/marketing/features/icon-analytics.svg
- client/public/assets/marketing/features/icon-automation.svg
- client/public/assets/marketing/features/icon-integrations.svg
- client/public/assets/marketing/features/icon-security.svg
- client/public/assets/marketing/features/icon-speed.svg
- client/public/assets/marketing/features/icon-support.svg
- client/public/assets/pattern.svg
- client/public/favicon.svg
- client/public/icons
- client/public/icons/favicon-32x32.png
- client/public/icons/icon-128x128.png
- client/public/icons/icon-144x144.png
- client/public/icons/icon-152x152.png
- client/public/icons/icon-192x192.png
- client/public/icons/icon-384x384.png
- client/public/icons/icon-512x512.png
- client/public/icons/icon-72x72.png
- client/public/icons/icon-96x96.png
- client/public/images
- client/public/images/README.md
- client/public/images/aboutus.jpg
- client/public/images/gallery
- client/public/images/gallery/1.jpg
- client/public/images/gallery/10.jpg
- client/public/images/gallery/12.jpg
- client/public/images/gallery/15.jpg
- client/public/images/gallery/18.jpg
- client/public/images/gallery/19.jpg
- client/public/images/gallery/2.jpg
- client/public/images/hero
- client/public/images/hero/image1.jpg
- client/public/images/hero/image2.jpg
- client/public/images/hero/image3.jpg
- client/public/images/hero/image4.jpg
- client/public/images/hero/image5.jpg
- client/public/images/hero/image6.jpg
- client/public/images/logo.png
- client/public/images/management
- client/public/images/management/about-v2.jpg
- client/public/images/management/bones64-stable-1683924_1280.jpg
- client/public/images/management/contact-v2.jpg
- client/public/images/management/features.jpg
- client/public/images/management/landingV3.jpg
- client/public/images/management/pricing.jpg
- client/public/images/partners
- client/public/images/partners/.gitkeep
- client/public/images/testimonials
- client/public/images/testimonials/.gitkeep
- client/public/logo.png
- client/public/manifest.json
- client/public/robots.txt
- client/public/service-worker.js
- client/public/sitemap.xml
- client/public/theme-override.css
- client/public/videos
- client/public/videos/.gitkeep
- client/public/visual-config.json


## Test/Spec Structure

- server/admin.test.ts
- server/api.test.ts
- server/auth.login.test.ts
- server/auth.logout.test.ts
- server/auth.reset.test.ts
- server/health.test.ts
- server/horses.test.ts
- server/notes.test.ts
- server/onboarding.test.ts
- server/settings.test.ts
- server/training.test.ts


## Scripts/Ops Structure

- scripts/audit_prod.sh
- scripts/backup.sh
- scripts/build-fingerprint.sh
- scripts/build.sh
- scripts/check-pkg.mjs
- scripts/deploy_verify.sh
- scripts/go_live_audit.sh
- scripts/merge-assets.sh
- scripts/migrate.sh
- scripts/phase1-generate-audit.cjs
- scripts/preflight.sh
- scripts/prod_checklist.sh
- scripts/rebuild-native.mjs
- scripts/rotate-admin-password.mjs
- scripts/setup-db.sh
- scripts/smoke_prod.sh
- scripts/start-prod.mjs
- scripts/ui-smoke-test.mjs
- scripts/update-sw-version.js
- scripts/validate-routes.mjs
- scripts/verify-runtime.mjs
- scripts/verify_production.sh


## Package Scripts Summary

| Script | Command |
| --- | --- |
| dev | NODE_ENV=development tsx watch server/_core/index.ts |
| clean | rm -rf dist |
| prebuild | npm run clean |
| build:sw | node scripts/update-sw-version.js |
| build | NODE_OPTIONS='--max_old_space_size=2048' npm run build:sw && npm run build:management && npm run build:school && npm run build:server && bash scripts/build-fingerprint.sh |
| build:safe | NODE_OPTIONS='--max_old_space_size=2048' npm run build |
| start | NODE_ENV=production node dist/index.js |
| check | tsc --noEmit |
| preflight | node scripts/check-pkg.mjs && node scripts/validate-routes.mjs |
| format | prettier --write . |
| format:check | prettier --check . |
| test | vitest run |
| db:push | drizzle-kit migrate |
| db:migrate | bash scripts/migrate.sh |
| db:generate | drizzle-kit generate |
| seed:templates | tsx server/seeds/trainingTemplates.ts |
| build:management | VITE_SITE=management NODE_OPTIONS='--max_old_space_size=2048' vite build |
| build:school | VITE_SITE=school NODE_OPTIONS='--max_old_space_size=2048' vite build |
| build:server | NODE_OPTIONS='--max_old_space_size=2048' esbuild server/_core/index.ts --platform=node --bundle --format=esm --outdir=dist --minify --packages=external && NODE_OPTIONS='--max_old_space_size=2048' esbuild server/cli.ts --platform=node --bundle --format=esm --outdir=dist --minify --packages=external |
