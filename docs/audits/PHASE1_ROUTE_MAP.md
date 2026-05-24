# Phase 1 Route Map

Routes were extracted from `client/management/src/ManagementApp.tsx` and `client/school/src/SchoolApp.tsx`. "Linked" means an exact route string was found in client links, nav config, redirects, or path config; absence is a candidate for manual verification, not deletion proof.

## All Frontend Routes/Pages

| Site | Route | Route file path | Linked in nav/source | Access |
| --- | --- | --- | --- | --- |
| management | / | client/src/pages/management/Home.tsx | yes | public |
| management | /features | client/src/pages/management/Features.tsx | yes | public |
| management | /pricing | client/src/pages/management/Pricing.tsx | yes | public |
| management | /about | client/src/pages/management/About.tsx | yes | public |
| management | /contact | client/src/pages/management/Contact.tsx | yes | public |
| management | /terms | client/src/pages/TermsPage.tsx | yes | public |
| management | /privacy | client/src/pages/PrivacyPage.tsx | yes | public |
| management | /login | client/src/pages/auth/Login.tsx | yes | public |
| management | /register | client/src/pages/auth/Register.tsx | yes | public |
| management | /forgot-password | client/src/pages/auth/ForgotPassword.tsx | yes | public |
| management | /reset-password | client/src/pages/auth/ResetPassword.tsx | not found | public |
| management | /verify-email | client/src/pages/auth/VerifyEmail.tsx | not found | public |
| management | /unsubscribe | client/src/pages/Unsubscribe.tsx | not found | public |
| management | /onboarding | client/src/pages/Onboarding.tsx | yes | protected |
| management | /dashboard | inline/resolved at runtime | yes | protected |
| management | /horses | client/src/pages/Horses.tsx | yes | protected |
| management | /horses/new | client/src/pages/HorseForm.tsx | yes | protected |
| management | /horses/:id/edit | client/src/pages/HorseForm.tsx | not found | protected |
| management | /horses/:id | client/src/pages/HorseDetail.tsx | not found | protected |
| management | /health | client/src/pages/Health.tsx | yes | protected |
| management | /vaccinations | client/src/pages/Vaccinations.tsx | yes | protected |
| management | /dental | client/src/pages/DentalCare.tsx | yes | protected |
| management | /hoofcare | client/src/pages/Hoofcare.tsx | yes | protected |
| management | /dewormings | client/src/pages/Dewormings.tsx | yes | protected |
| management | /treatments | client/src/pages/Treatments.tsx | yes | protected |
| management | /xrays | client/src/pages/Xrays.tsx | yes | protected |
| management | /pedigree | client/src/pages/Pedigree.tsx | yes | protected |
| management | /training | client/src/pages/Training.tsx | yes | protected |
| management | /training-templates | client/src/pages/TrainingTemplates.tsx | yes | protected |
| management | /breeding | client/src/pages/BreedingManagement.tsx | yes | stable-plan |
| management | /lessons | client/src/pages/LessonScheduling.tsx | yes | stable-plan |
| management | /feeding | client/src/pages/Feeding.tsx | yes | protected |
| management | /nutrition-plans | client/src/pages/NutritionPlans.tsx | yes | protected |
| management | /nutrition-logs | client/src/pages/NutritionLogs.tsx | yes | protected |
| management | /weather | client/src/pages/Weather.tsx | yes | protected |
| management | /feed-costs | client/src/pages/FeedCostTracking.tsx | yes | protected |
| management | /ride-tracking | client/src/pages/RideTracking.tsx | yes | protected |
| management | /equine-passport | client/src/pages/EquinePassport.tsx | yes | protected |
| management | /competitions | client/src/pages/Competitions.tsx | yes | protected |
| management | /documents | client/src/pages/Documents.tsx | yes | protected |
| management | /tasks | client/src/pages/Tasks.tsx | yes | protected |
| management | /contacts | client/src/pages/Contacts.tsx | yes | protected |
| management | /stable | client/src/pages/Stable.tsx | yes | stable-plan |
| management | /stable-dashboard | inline/resolved at runtime | yes | stable-plan |
| management | /staff | client/src/pages/StableStaff.tsx | yes | stable-plan |
| management | /stable-setup | client/src/pages/StableSetup.tsx | yes | stable-plan |
| management | /stable-reports | client/src/pages/StableReports.tsx | yes | stable-plan |
| management | /messages | client/src/pages/Messages.tsx | yes | protected |
| management | /analytics | client/src/pages/Analytics.tsx | yes | protected |
| management | /reports | client/src/pages/Reports.tsx | yes | protected |
| management | /calendar | client/src/pages/Calendar.tsx | yes | protected |
| management | /appointments | client/src/pages/Appointments.tsx | yes | protected |
| management | /tags | client/src/pages/Tags.tsx | yes | protected |
| management | /settings | client/src/pages/Settings.tsx | yes | protected |
| management | /billing | client/src/pages/BillingPage.tsx | yes | protected |
| management | /ai-chat | client/src/pages/AIChat.tsx | yes | protected |
| management | /client-portal | client/src/pages/ClientPortal.tsx | yes | protected |
| management | /admin | client/src/pages/Admin.tsx | yes | admin-only |
| management | /qa-check | client/src/pages/QAChecklist.tsx | yes | admin-only |
| management | /passport/:token | client/src/pages/PassportView.tsx | special | public |
| management | /stable-invite | client/src/pages/StableInviteAccept.tsx | not found | public |
| management | /404 | client/src/pages/NotFound.tsx | special | public |
| school | / | client/src/pages/school/Home.tsx | yes | public |
| school | /features | client/src/pages/school/Features.tsx | yes | public |
| school | /pricing | client/src/pages/school/Pricing.tsx | yes | public |
| school | /about | client/src/pages/school/About.tsx | yes | public |
| school | /contact | client/src/pages/school/Contact.tsx | yes | public |
| school | /terms | client/src/pages/TermsPage.tsx | yes | public |
| school | /privacy | client/src/pages/PrivacyPage.tsx | yes | public |
| school | /login | client/src/pages/auth/Login.tsx | yes | public |
| school | /register | client/src/pages/auth/Register.tsx | yes | public |
| school | /forgot-password | client/src/pages/auth/ForgotPassword.tsx | yes | public |
| school | /reset-password | client/src/pages/auth/ResetPassword.tsx | not found | public |
| school | /verify-email | client/src/pages/auth/VerifyEmail.tsx | not found | public |
| school | /unsubscribe | client/src/pages/Unsubscribe.tsx | not found | public |
| school | /onboarding | client/src/pages/Onboarding.tsx | yes | protected |
| school | /student-dashboard | client/src/pages/StudentDashboard.tsx | yes | student-only |
| school | /teacher-dashboard | client/src/pages/TeacherDashboard.tsx | yes | teacher-only |
| school | /school-dashboard | client/src/pages/SchoolDashboard.tsx | yes | school-only or protected |
| school | /dashboard | inline/resolved at runtime | yes | protected |
| school | /horses | client/src/pages/Horses.tsx | yes | protected |
| school | /horses/new | client/src/pages/HorseForm.tsx | yes | protected |
| school | /horses/:id/edit | client/src/pages/HorseForm.tsx | not found | protected |
| school | /horses/:id | client/src/pages/HorseDetail.tsx | not found | protected |
| school | /health | client/src/pages/Health.tsx | yes | protected |
| school | /vaccinations | client/src/pages/Vaccinations.tsx | yes | protected |
| school | /dental | client/src/pages/DentalCare.tsx | yes | protected |
| school | /hoofcare | client/src/pages/Hoofcare.tsx | yes | protected |
| school | /dewormings | client/src/pages/Dewormings.tsx | yes | protected |
| school | /treatments | client/src/pages/Treatments.tsx | yes | protected |
| school | /xrays | client/src/pages/Xrays.tsx | yes | protected |
| school | /training | client/src/pages/Training.tsx | yes | protected |
| school | /training-templates | client/src/pages/TrainingTemplates.tsx | yes | protected |
| school | /feeding | client/src/pages/Feeding.tsx | yes | protected |
| school | /nutrition-plans | client/src/pages/NutritionPlans.tsx | yes | protected |
| school | /nutrition-logs | client/src/pages/NutritionLogs.tsx | yes | protected |
| school | /weather | client/src/pages/Weather.tsx | yes | protected |
| school | /documents | client/src/pages/Documents.tsx | yes | protected |
| school | /tasks | client/src/pages/Tasks.tsx | yes | protected |
| school | /contacts | client/src/pages/Contacts.tsx | yes | protected |
| school | /calendar | client/src/pages/Calendar.tsx | yes | protected |
| school | /appointments | client/src/pages/Appointments.tsx | yes | protected |
| school | /reports | client/src/pages/Reports.tsx | yes | protected |
| school | /analytics | client/src/pages/Analytics.tsx | yes | protected |
| school | /stable | client/src/pages/Stable.tsx | yes | stable-plan |
| school | /stable-dashboard | inline/resolved at runtime | yes | stable-plan |
| school | /staff | client/src/pages/StableStaff.tsx | yes | stable-plan |
| school | /stable-setup | client/src/pages/StableSetup.tsx | yes | stable-plan |
| school | /stable-reports | client/src/pages/StableReports.tsx | yes | stable-plan |
| school | /breeding | client/src/pages/BreedingManagement.tsx | yes | stable-plan |
| school | /lessons | client/src/pages/LessonScheduling.tsx | yes | stable-plan |
| school | /feed-costs | client/src/pages/FeedCostTracking.tsx | yes | protected |
| school | /ride-tracking | client/src/pages/RideTracking.tsx | yes | protected |
| school | /equine-passport | client/src/pages/EquinePassport.tsx | yes | protected |
| school | /competitions | client/src/pages/Competitions.tsx | yes | protected |
| school | /tags | client/src/pages/Tags.tsx | yes | protected |
| school | /settings | client/src/pages/Settings.tsx | yes | protected |
| school | /billing | client/src/pages/BillingPage.tsx | yes | protected |
| school | /messages | client/src/pages/Messages.tsx | yes | protected |
| school | /ai-chat | client/src/pages/AIChat.tsx | yes | protected |
| school | /client-portal | client/src/pages/ClientPortal.tsx | yes | protected |
| school | /admin | client/src/pages/Admin.tsx | yes | admin-only |
| school | /qa-check | client/src/pages/QAChecklist.tsx | yes | admin-only |
| school | /passport/:token | client/src/pages/PassportView.tsx | special | public |
| school | /stable-invite | client/src/pages/StableInviteAccept.tsx | not found | public |
| school | /404 | client/src/pages/NotFound.tsx | special | public |


## All Dashboard Routes

| Site | Route | Route file path | Linked | Access |
| --- | --- | --- | --- | --- |
| management | /onboarding | client/src/pages/Onboarding.tsx | yes | protected |
| management | /dashboard | inline/resolved at runtime | yes | protected |
| management | /horses | client/src/pages/Horses.tsx | yes | protected |
| management | /horses/new | client/src/pages/HorseForm.tsx | yes | protected |
| management | /horses/:id/edit | client/src/pages/HorseForm.tsx | not found | protected |
| management | /horses/:id | client/src/pages/HorseDetail.tsx | not found | protected |
| management | /health | client/src/pages/Health.tsx | yes | protected |
| management | /vaccinations | client/src/pages/Vaccinations.tsx | yes | protected |
| management | /dental | client/src/pages/DentalCare.tsx | yes | protected |
| management | /hoofcare | client/src/pages/Hoofcare.tsx | yes | protected |
| management | /dewormings | client/src/pages/Dewormings.tsx | yes | protected |
| management | /treatments | client/src/pages/Treatments.tsx | yes | protected |
| management | /xrays | client/src/pages/Xrays.tsx | yes | protected |
| management | /pedigree | client/src/pages/Pedigree.tsx | yes | protected |
| management | /training | client/src/pages/Training.tsx | yes | protected |
| management | /training-templates | client/src/pages/TrainingTemplates.tsx | yes | protected |
| management | /breeding | client/src/pages/BreedingManagement.tsx | yes | stable-plan |
| management | /lessons | client/src/pages/LessonScheduling.tsx | yes | stable-plan |
| management | /feeding | client/src/pages/Feeding.tsx | yes | protected |
| management | /nutrition-plans | client/src/pages/NutritionPlans.tsx | yes | protected |
| management | /nutrition-logs | client/src/pages/NutritionLogs.tsx | yes | protected |
| management | /weather | client/src/pages/Weather.tsx | yes | protected |
| management | /feed-costs | client/src/pages/FeedCostTracking.tsx | yes | protected |
| management | /ride-tracking | client/src/pages/RideTracking.tsx | yes | protected |
| management | /equine-passport | client/src/pages/EquinePassport.tsx | yes | protected |
| management | /competitions | client/src/pages/Competitions.tsx | yes | protected |
| management | /documents | client/src/pages/Documents.tsx | yes | protected |
| management | /tasks | client/src/pages/Tasks.tsx | yes | protected |
| management | /contacts | client/src/pages/Contacts.tsx | yes | protected |
| management | /stable | client/src/pages/Stable.tsx | yes | stable-plan |
| management | /stable-dashboard | inline/resolved at runtime | yes | stable-plan |
| management | /staff | client/src/pages/StableStaff.tsx | yes | stable-plan |
| management | /stable-setup | client/src/pages/StableSetup.tsx | yes | stable-plan |
| management | /stable-reports | client/src/pages/StableReports.tsx | yes | stable-plan |
| management | /messages | client/src/pages/Messages.tsx | yes | protected |
| management | /analytics | client/src/pages/Analytics.tsx | yes | protected |
| management | /reports | client/src/pages/Reports.tsx | yes | protected |
| management | /calendar | client/src/pages/Calendar.tsx | yes | protected |
| management | /appointments | client/src/pages/Appointments.tsx | yes | protected |
| management | /tags | client/src/pages/Tags.tsx | yes | protected |
| management | /settings | client/src/pages/Settings.tsx | yes | protected |
| management | /billing | client/src/pages/BillingPage.tsx | yes | protected |
| management | /ai-chat | client/src/pages/AIChat.tsx | yes | protected |
| management | /client-portal | client/src/pages/ClientPortal.tsx | yes | protected |
| management | /admin | client/src/pages/Admin.tsx | yes | admin-only |
| management | /qa-check | client/src/pages/QAChecklist.tsx | yes | admin-only |
| school | /onboarding | client/src/pages/Onboarding.tsx | yes | protected |
| school | /student-dashboard | client/src/pages/StudentDashboard.tsx | yes | student-only |
| school | /teacher-dashboard | client/src/pages/TeacherDashboard.tsx | yes | teacher-only |
| school | /school-dashboard | client/src/pages/SchoolDashboard.tsx | yes | school-only or protected |
| school | /dashboard | inline/resolved at runtime | yes | protected |
| school | /horses | client/src/pages/Horses.tsx | yes | protected |
| school | /horses/new | client/src/pages/HorseForm.tsx | yes | protected |
| school | /horses/:id/edit | client/src/pages/HorseForm.tsx | not found | protected |
| school | /horses/:id | client/src/pages/HorseDetail.tsx | not found | protected |
| school | /health | client/src/pages/Health.tsx | yes | protected |
| school | /vaccinations | client/src/pages/Vaccinations.tsx | yes | protected |
| school | /dental | client/src/pages/DentalCare.tsx | yes | protected |
| school | /hoofcare | client/src/pages/Hoofcare.tsx | yes | protected |
| school | /dewormings | client/src/pages/Dewormings.tsx | yes | protected |
| school | /treatments | client/src/pages/Treatments.tsx | yes | protected |
| school | /xrays | client/src/pages/Xrays.tsx | yes | protected |
| school | /training | client/src/pages/Training.tsx | yes | protected |
| school | /training-templates | client/src/pages/TrainingTemplates.tsx | yes | protected |
| school | /feeding | client/src/pages/Feeding.tsx | yes | protected |
| school | /nutrition-plans | client/src/pages/NutritionPlans.tsx | yes | protected |
| school | /nutrition-logs | client/src/pages/NutritionLogs.tsx | yes | protected |
| school | /weather | client/src/pages/Weather.tsx | yes | protected |
| school | /documents | client/src/pages/Documents.tsx | yes | protected |
| school | /tasks | client/src/pages/Tasks.tsx | yes | protected |
| school | /contacts | client/src/pages/Contacts.tsx | yes | protected |
| school | /calendar | client/src/pages/Calendar.tsx | yes | protected |
| school | /appointments | client/src/pages/Appointments.tsx | yes | protected |
| school | /reports | client/src/pages/Reports.tsx | yes | protected |
| school | /analytics | client/src/pages/Analytics.tsx | yes | protected |
| school | /stable | client/src/pages/Stable.tsx | yes | stable-plan |
| school | /stable-dashboard | inline/resolved at runtime | yes | stable-plan |
| school | /staff | client/src/pages/StableStaff.tsx | yes | stable-plan |
| school | /stable-setup | client/src/pages/StableSetup.tsx | yes | stable-plan |
| school | /stable-reports | client/src/pages/StableReports.tsx | yes | stable-plan |
| school | /breeding | client/src/pages/BreedingManagement.tsx | yes | stable-plan |
| school | /lessons | client/src/pages/LessonScheduling.tsx | yes | stable-plan |
| school | /feed-costs | client/src/pages/FeedCostTracking.tsx | yes | protected |
| school | /ride-tracking | client/src/pages/RideTracking.tsx | yes | protected |
| school | /equine-passport | client/src/pages/EquinePassport.tsx | yes | protected |
| school | /competitions | client/src/pages/Competitions.tsx | yes | protected |
| school | /tags | client/src/pages/Tags.tsx | yes | protected |
| school | /settings | client/src/pages/Settings.tsx | yes | protected |
| school | /billing | client/src/pages/BillingPage.tsx | yes | protected |
| school | /messages | client/src/pages/Messages.tsx | yes | protected |
| school | /ai-chat | client/src/pages/AIChat.tsx | yes | protected |
| school | /client-portal | client/src/pages/ClientPortal.tsx | yes | protected |
| school | /admin | client/src/pages/Admin.tsx | yes | admin-only |
| school | /qa-check | client/src/pages/QAChecklist.tsx | yes | admin-only |


## Academy/Student/Teacher/School Routes

| Site | Route | Route file path | Linked | Access |
| --- | --- | --- | --- | --- |
| management | /lessons | client/src/pages/LessonScheduling.tsx | yes | stable-plan |
| school | / | client/src/pages/school/Home.tsx | yes | public |
| school | /features | client/src/pages/school/Features.tsx | yes | public |
| school | /pricing | client/src/pages/school/Pricing.tsx | yes | public |
| school | /about | client/src/pages/school/About.tsx | yes | public |
| school | /contact | client/src/pages/school/Contact.tsx | yes | public |
| school | /terms | client/src/pages/TermsPage.tsx | yes | public |
| school | /privacy | client/src/pages/PrivacyPage.tsx | yes | public |
| school | /login | client/src/pages/auth/Login.tsx | yes | public |
| school | /register | client/src/pages/auth/Register.tsx | yes | public |
| school | /forgot-password | client/src/pages/auth/ForgotPassword.tsx | yes | public |
| school | /reset-password | client/src/pages/auth/ResetPassword.tsx | not found | public |
| school | /verify-email | client/src/pages/auth/VerifyEmail.tsx | not found | public |
| school | /unsubscribe | client/src/pages/Unsubscribe.tsx | not found | public |
| school | /onboarding | client/src/pages/Onboarding.tsx | yes | protected |
| school | /student-dashboard | client/src/pages/StudentDashboard.tsx | yes | student-only |
| school | /teacher-dashboard | client/src/pages/TeacherDashboard.tsx | yes | teacher-only |
| school | /school-dashboard | client/src/pages/SchoolDashboard.tsx | yes | school-only or protected |
| school | /dashboard | inline/resolved at runtime | yes | protected |
| school | /horses | client/src/pages/Horses.tsx | yes | protected |
| school | /horses/new | client/src/pages/HorseForm.tsx | yes | protected |
| school | /horses/:id/edit | client/src/pages/HorseForm.tsx | not found | protected |
| school | /horses/:id | client/src/pages/HorseDetail.tsx | not found | protected |
| school | /health | client/src/pages/Health.tsx | yes | protected |
| school | /vaccinations | client/src/pages/Vaccinations.tsx | yes | protected |
| school | /dental | client/src/pages/DentalCare.tsx | yes | protected |
| school | /hoofcare | client/src/pages/Hoofcare.tsx | yes | protected |
| school | /dewormings | client/src/pages/Dewormings.tsx | yes | protected |
| school | /treatments | client/src/pages/Treatments.tsx | yes | protected |
| school | /xrays | client/src/pages/Xrays.tsx | yes | protected |
| school | /training | client/src/pages/Training.tsx | yes | protected |
| school | /training-templates | client/src/pages/TrainingTemplates.tsx | yes | protected |
| school | /feeding | client/src/pages/Feeding.tsx | yes | protected |
| school | /nutrition-plans | client/src/pages/NutritionPlans.tsx | yes | protected |
| school | /nutrition-logs | client/src/pages/NutritionLogs.tsx | yes | protected |
| school | /weather | client/src/pages/Weather.tsx | yes | protected |
| school | /documents | client/src/pages/Documents.tsx | yes | protected |
| school | /tasks | client/src/pages/Tasks.tsx | yes | protected |
| school | /contacts | client/src/pages/Contacts.tsx | yes | protected |
| school | /calendar | client/src/pages/Calendar.tsx | yes | protected |
| school | /appointments | client/src/pages/Appointments.tsx | yes | protected |
| school | /reports | client/src/pages/Reports.tsx | yes | protected |
| school | /analytics | client/src/pages/Analytics.tsx | yes | protected |
| school | /stable | client/src/pages/Stable.tsx | yes | stable-plan |
| school | /stable-dashboard | inline/resolved at runtime | yes | stable-plan |
| school | /staff | client/src/pages/StableStaff.tsx | yes | stable-plan |
| school | /stable-setup | client/src/pages/StableSetup.tsx | yes | stable-plan |
| school | /stable-reports | client/src/pages/StableReports.tsx | yes | stable-plan |
| school | /breeding | client/src/pages/BreedingManagement.tsx | yes | stable-plan |
| school | /lessons | client/src/pages/LessonScheduling.tsx | yes | stable-plan |
| school | /feed-costs | client/src/pages/FeedCostTracking.tsx | yes | protected |
| school | /ride-tracking | client/src/pages/RideTracking.tsx | yes | protected |
| school | /equine-passport | client/src/pages/EquinePassport.tsx | yes | protected |
| school | /competitions | client/src/pages/Competitions.tsx | yes | protected |
| school | /tags | client/src/pages/Tags.tsx | yes | protected |
| school | /settings | client/src/pages/Settings.tsx | yes | protected |
| school | /billing | client/src/pages/BillingPage.tsx | yes | protected |
| school | /messages | client/src/pages/Messages.tsx | yes | protected |
| school | /ai-chat | client/src/pages/AIChat.tsx | yes | protected |
| school | /client-portal | client/src/pages/ClientPortal.tsx | yes | protected |
| school | /admin | client/src/pages/Admin.tsx | yes | admin-only |
| school | /qa-check | client/src/pages/QAChecklist.tsx | yes | admin-only |
| school | /passport/:token | client/src/pages/PassportView.tsx | special | public |
| school | /stable-invite | client/src/pages/StableInviteAccept.tsx | not found | public |
| school | /404 | client/src/pages/NotFound.tsx | special | public |


## Admin Routes

| Site | Route | Route file path | Linked | Access |
| --- | --- | --- | --- | --- |
| management | /admin | client/src/pages/Admin.tsx | yes | admin-only |
| management | /qa-check | client/src/pages/QAChecklist.tsx | yes | admin-only |
| school | /admin | client/src/pages/Admin.tsx | yes | admin-only |
| school | /qa-check | client/src/pages/QAChecklist.tsx | yes | admin-only |


## Public Marketing Website Routes

| Site | Route | Route file path | Linked | Access |
| --- | --- | --- | --- | --- |
| management | / | client/src/pages/management/Home.tsx | yes | public |
| management | /features | client/src/pages/management/Features.tsx | yes | public |
| management | /pricing | client/src/pages/management/Pricing.tsx | yes | public |
| management | /about | client/src/pages/management/About.tsx | yes | public |
| management | /contact | client/src/pages/management/Contact.tsx | yes | public |
| management | /terms | client/src/pages/TermsPage.tsx | yes | public |
| management | /privacy | client/src/pages/PrivacyPage.tsx | yes | public |
| school | / | client/src/pages/school/Home.tsx | yes | public |
| school | /features | client/src/pages/school/Features.tsx | yes | public |
| school | /pricing | client/src/pages/school/Pricing.tsx | yes | public |
| school | /about | client/src/pages/school/About.tsx | yes | public |
| school | /contact | client/src/pages/school/Contact.tsx | yes | public |
| school | /terms | client/src/pages/TermsPage.tsx | yes | public |
| school | /privacy | client/src/pages/PrivacyPage.tsx | yes | public |


## Stale/Unlinked Route Candidates

- `management:/reset-password` -> `client/src/pages/auth/ResetPassword.tsx`
- `management:/verify-email` -> `client/src/pages/auth/VerifyEmail.tsx`
- `management:/unsubscribe` -> `client/src/pages/Unsubscribe.tsx`
- `management:/horses/:id/edit` -> `client/src/pages/HorseForm.tsx`
- `management:/horses/:id` -> `client/src/pages/HorseDetail.tsx`
- `management:/stable-invite` -> `client/src/pages/StableInviteAccept.tsx`
- `school:/reset-password` -> `client/src/pages/auth/ResetPassword.tsx`
- `school:/verify-email` -> `client/src/pages/auth/VerifyEmail.tsx`
- `school:/unsubscribe` -> `client/src/pages/Unsubscribe.tsx`
- `school:/horses/:id/edit` -> `client/src/pages/HorseForm.tsx`
- `school:/horses/:id` -> `client/src/pages/HorseDetail.tsx`
- `school:/stable-invite` -> `client/src/pages/StableInviteAccept.tsx`

Unregistered page file candidates, do not delete without deeper proof:
- `client/src/pages/AdminAnalytics.tsx`
- `client/src/pages/AdminCampaigns.tsx`
- `client/src/pages/Dashboard.tsx`
- `client/src/pages/Schools.tsx`
- `client/src/pages/StableDashboard.tsx`
- `client/src/pages/Students.tsx`
- `client/src/v2/pages/DashboardV2.tsx`
- `client/src/v2/pages/StableDashboardV2.tsx`
