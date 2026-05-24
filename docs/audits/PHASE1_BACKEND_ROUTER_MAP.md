# Phase 1 Backend Router Map

## Router Registration

- `server/_core/index.ts` registers `appRouter` at `/api/trpc`.
- `server/routers.ts` mounts `system`, `student`, `teacher`, and `school` routers.
- `server/api.ts` is mounted at `/api/v1`.
- `server/_core/authRouter.ts` is mounted at `/api/auth`.
- `server/_core/billingRouter.ts` is mounted at `/api/billing`.
- `server/_core/salesChatRouter.ts` is mounted under `/api`.


## All tRPC Routers and Procedures

| Procedure | Auth procedure | Imported/registered | Frontend reference | Category | Source |
| --- | --- | --- | --- | --- | --- |
| auth.me | publicProcedure | yes | yes | core | server/routers.ts:319 |
| auth.logout | publicProcedure | yes | yes | core | server/routers.ts:320 |
| adminUnlock.getStatus | protectedProcedure | yes | yes | core | server/routers.ts:330 |
| adminUnlock.requestUnlock | protectedProcedure | yes | not found | core | server/routers.ts:339 |
| adminUnlock.submitPassword | protectedProcedure | yes | yes | core | server/routers.ts:367 |
| adminUnlock.lock | protectedProcedure | yes | not found | core | server/routers.ts:449 |
| ai.chat | subscribedProcedure | yes | yes | AI/weather/chat | server/routers.ts:457 |
| billing.getPricing | publicProcedure | yes | yes | core | server/routers.ts:535 |
| billing.createCheckout | protectedProcedure | yes | yes | core | server/routers.ts:588 |
| billing.createPortal | protectedProcedure | yes | yes | core | server/routers.ts:654 |
| billing.getStatus | protectedProcedure | yes | yes | core | server/routers.ts:690 |
| user.getProfile | protectedProcedure | yes | yes | core | server/routers.ts:711 |
| user.updateProfile | protectedProcedure | yes | yes | core | server/routers.ts:716 |
| user.updateNotificationPreferences | protectedProcedure | yes | yes | core | server/routers.ts:779 |
| user.getNotificationPreferences | protectedProcedure | yes | yes | core | server/routers.ts:810 |
| user.getSubscriptionStatus | protectedProcedure | yes | yes | core | server/routers.ts:830 |
| user.getDashboardStats | subscribedProcedure | yes | yes | core | server/routers.ts:850 |
| user.getOnboardingStatus | protectedProcedure | yes | not found | core | server/routers.ts:867 |
| user.updateOnboardingStep | protectedProcedure | yes | yes | core | server/routers.ts:888 |
| user.completeOnboarding | protectedProcedure | yes | yes | core | server/routers.ts:898 |
| user.skipOnboarding | protectedProcedure | yes | not found | core | server/routers.ts:908 |
| user.resetOnboarding | protectedProcedure | yes | yes | core | server/routers.ts:917 |
| user.setExperience | protectedProcedure | yes | yes | core | server/routers.ts:927 |
| user.updateActivationChecklist | protectedProcedure | yes | yes | core | server/routers.ts:948 |
| user.dismissTour | protectedProcedure | yes | not found | core | server/routers.ts:972 |
| user.dismissTip | protectedProcedure | yes | not found | core | server/routers.ts:987 |
| horses.list | subscribedProcedure | yes | yes | core | server/routers.ts:1005 |
| horses.getPassport | publicProcedure | yes | not found | core | server/routers.ts:1011 |
| horses.getPassportByToken | publicProcedure | yes | yes | core | server/routers.ts:1056 |
| horses.get | subscribedProcedure | yes | yes | core | server/routers.ts:1131 |
| horses.create | subscribedProcedure | yes | yes | core | server/routers.ts:1144 |
| horses.update | subscribedProcedure | yes | yes | core | server/routers.ts:1209 |
| horses.delete | subscribedProcedure | yes | yes | core | server/routers.ts:1253 |
| horses.exportCSV | subscribedProcedure | yes | yes | core | server/routers.ts:1300 |
| healthRecords.listAll | subscribedProcedure | yes | yes | core | server/routers.ts:1315 |
| healthRecords.listByHorse | subscribedProcedure | yes | yes | core | server/routers.ts:1319 |
| healthRecords.get | subscribedProcedure | yes | not found | core | server/routers.ts:1325 |
| healthRecords.create | subscribedProcedure | yes | yes | core | server/routers.ts:1338 |
| healthRecords.update | subscribedProcedure | yes | yes | core | server/routers.ts:1388 |
| healthRecords.delete | subscribedProcedure | yes | yes | core | server/routers.ts:1432 |
| healthRecords.getReminders | subscribedProcedure | yes | yes | core | server/routers.ts:1444 |
| healthRecords.exportCSV | subscribedProcedure | yes | yes | core | server/routers.ts:1450 |
| training.listByHorse | subscribedProcedure | yes | yes | core | server/routers.ts:1465 |
| training.listAll | subscribedProcedure | yes | yes | core | server/routers.ts:1471 |
| training.getUpcoming | subscribedProcedure | yes | yes | core | server/routers.ts:1475 |
| training.create | subscribedProcedure | yes | yes | core | server/routers.ts:1479 |
| training.update | subscribedProcedure | yes | yes | core | server/routers.ts:1552 |
| training.delete | subscribedProcedure | yes | yes | core | server/routers.ts:1601 |
| training.complete | subscribedProcedure | yes | yes | core | server/routers.ts:1618 |
| training.exportCSV | subscribedProcedure | yes | yes | core | server/routers.ts:1643 |
| feeding.listAll | subscribedProcedure | yes | yes | core | server/routers.ts:1658 |
| feeding.listByHorse | subscribedProcedure | yes | yes | core | server/routers.ts:1662 |
| feeding.create | subscribedProcedure | yes | yes | core | server/routers.ts:1668 |
| feeding.update | subscribedProcedure | yes | not found | core | server/routers.ts:1695 |
| feeding.delete | subscribedProcedure | yes | yes | core | server/routers.ts:1723 |
| feeding.exportCSV | subscribedProcedure | yes | yes | core | server/routers.ts:1735 |
| tasks.list | subscribedProcedure | yes | yes | core | server/routers.ts:1750 |
| tasks.listByHorse | subscribedProcedure | yes | not found | core | server/routers.ts:1754 |
| tasks.get | subscribedProcedure | yes | not found | core | server/routers.ts:1760 |
| tasks.getUpcoming | subscribedProcedure | yes | not found | core | server/routers.ts:1770 |
| tasks.create | subscribedProcedure | yes | yes | core | server/routers.ts:1776 |
| tasks.update | subscribedProcedure | yes | yes | core | server/routers.ts:1838 |
| tasks.delete | subscribedProcedure | yes | yes | core | server/routers.ts:1894 |
| tasks.complete | subscribedProcedure | yes | yes | core | server/routers.ts:1906 |
| tasks.exportCSV | subscribedProcedure | yes | yes | core | server/routers.ts:1919 |
| contacts.list | subscribedProcedure | yes | yes | core | server/routers.ts:1940 |
| contacts.listByType | subscribedProcedure | yes | not found | core | server/routers.ts:1944 |
| contacts.get | subscribedProcedure | yes | not found | core | server/routers.ts:1950 |
| contacts.create | subscribedProcedure | yes | yes | core | server/routers.ts:1963 |
| contacts.update | subscribedProcedure | yes | yes | core | server/routers.ts:2012 |
| contacts.delete | subscribedProcedure | yes | yes | core | server/routers.ts:2056 |
| contacts.exportCSV | subscribedProcedure | yes | yes | core | server/routers.ts:2073 |
| vaccinations.list | subscribedProcedure | yes | yes | core | server/routers.ts:2086 |
| vaccinations.listByHorse | subscribedProcedure | yes | not found | core | server/routers.ts:2090 |
| vaccinations.get | subscribedProcedure | yes | not found | core | server/routers.ts:2096 |
| vaccinations.create | subscribedProcedure | yes | yes | core | server/routers.ts:2109 |
| vaccinations.update | subscribedProcedure | yes | yes | core | server/routers.ts:2150 |
| vaccinations.delete | subscribedProcedure | yes | yes | core | server/routers.ts:2178 |
| dewormings.list | subscribedProcedure | yes | yes | core | server/routers.ts:2204 |
| dewormings.listByHorse | subscribedProcedure | yes | not found | core | server/routers.ts:2208 |
| dewormings.get | subscribedProcedure | yes | not found | core | server/routers.ts:2214 |
| dewormings.create | subscribedProcedure | yes | yes | core | server/routers.ts:2227 |
| dewormings.update | subscribedProcedure | yes | yes | core | server/routers.ts:2261 |
| dewormings.delete | subscribedProcedure | yes | yes | core | server/routers.ts:2287 |
| pedigree.get | subscribedProcedure | yes | yes | core | server/routers.ts:2313 |
| pedigree.createOrUpdate | subscribedProcedure | yes | yes | core | server/routers.ts:2319 |
| pedigree.delete | subscribedProcedure | yes | not found | core | server/routers.ts:2355 |
| documents.list | subscribedProcedure | yes | yes | core | server/routers.ts:2381 |
| documents.listByHorse | subscribedProcedure | yes | not found | core | server/routers.ts:2385 |
| documents.upload | subscribedProcedure | yes | yes | core | server/routers.ts:2391 |
| documents.delete | subscribedProcedure | yes | yes | core | server/routers.ts:2561 |
| documents.exportCSV | subscribedProcedure | yes | yes | core | server/routers.ts:2578 |
| weather.analyze | subscribedProcedure | yes | not found | AI/weather/chat | server/routers.ts:2593 |
| weather.getLatest | subscribedProcedure | yes | not found | AI/weather/chat | server/routers.ts:2746 |
| weather.getHistory | subscribedProcedure | yes | not found | AI/weather/chat | server/routers.ts:2750 |
| weather.getCurrent | protectedProcedure | yes | yes | AI/weather/chat | server/routers.ts:2757 |
| weather.getForecast | protectedProcedure | yes | yes | AI/weather/chat | server/routers.ts:2782 |
| weather.getHourly | protectedProcedure | yes | yes | AI/weather/chat | server/routers.ts:2795 |
| weather.updateLocation | protectedProcedure | yes | yes | AI/weather/chat | server/routers.ts:2808 |
| notes.list | subscribedProcedure | yes | yes | core | server/routers.ts:2828 |
| notes.create | subscribedProcedure | yes | yes | core | server/routers.ts:2839 |
| notes.update | subscribedProcedure | yes | not found | core | server/routers.ts:2875 |
| notes.delete | subscribedProcedure | yes | yes | core | server/routers.ts:2904 |
| rides.list | subscribedProcedure | yes | yes | core | server/routers.ts:2927 |
| rides.get | subscribedProcedure | yes | not found | core | server/routers.ts:2931 |
| rides.create | subscribedProcedure | yes | yes | core | server/routers.ts:2937 |
| rides.delete | subscribedProcedure | yes | yes | core | server/routers.ts:2970 |
| admin.getUsers | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:2981 |
| admin.getUserDetails | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:2985 |
| admin.suspendUser | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:2997 |
| admin.unsuspendUser | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3016 |
| admin.deleteUser | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3029 |
| admin.getDeletedUsers | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3042 |
| admin.restoreUser | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3046 |
| admin.hardDeleteUser | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3060 |
| admin.updateUserRole | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3084 |
| admin.grantFreeAccess | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3104 |
| admin.revokeFreeAccess | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3188 |
| admin.resetUserPassword | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3214 |
| admin.getStats | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3262 |
| admin.getUserSegmentation | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3267 |
| admin.getOverdueUsers | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3271 |
| admin.getExpiredTrials | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3275 |
| admin.getChurnRisk | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3280 |
| admin.getDocumentHealth | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3340 |
| admin.getActivityLogs | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3391 |
| admin.getSettings | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3398 |
| admin.updateSetting | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3402 |
| admin.getBackupLogs | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3429 |
| admin.apiKeys.list | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3437 |
| admin.apiKeys.create | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3441 |
| admin.apiKeys.revoke | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3470 |
| admin.apiKeys.rotate | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3483 |
| admin.apiKeys.updateSettings | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3504 |
| admin.getWhatsAppConfig | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3528 |
| admin.updateWhatsAppConfig | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3552 |
| admin.getEnvHealth | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3586 |
| admin.getSiteSettings | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3720 |
| admin.setSiteSetting | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3727 |
| admin.getLeads | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3769 |
| admin.getTemplates | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3779 |
| admin.previewTemplate | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3790 |
| admin.getSegmentCounts | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3816 |
| admin.getCampaigns | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3884 |
| admin.getCampaignDetails | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:3893 |
| admin.createCampaign | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3913 |
| admin.sendTestEmail | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:3970 |
| admin.sendCampaign | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4004 |
| admin.deleteCampaign | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4296 |
| admin.getCampaignReplies | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4323 |
| admin.updateReplyStatus | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4355 |
| admin.triggerReplyFetch | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4417 |
| admin.getCampaignAssignmentPreview | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4436 |
| admin.runCampaignAutopilot | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4502 |
| admin.runDuplicatePersonScan | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4679 |
| admin.clearDuplicateFlag | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4732 |
| admin.pauseCampaign | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4744 |
| admin.resumeCampaign | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4755 |
| admin.getDailyLimitStatus | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:4770 |
| admin.getCampaignMailboxStatus | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4792 |
| admin.parseImportFile | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4869 |
| admin.addSuppression | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4939 |
| admin.removeSuppression | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4962 |
| admin.getMarketingContacts | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:4987 |
| admin.createMarketingContact | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5027 |
| admin.importMarketingContacts | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5069 |
| admin.deleteMarketingContact | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5173 |
| admin.bulkDeleteMarketingContacts | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5193 |
| admin.getUnsubscribes | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5271 |
| admin.getCampaignSequences | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:5281 |
| admin.addCampaignSequenceStep | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:5291 |
| admin.sendSequenceStep | adminUnlockedProcedure | yes | not found | admin | server/routers.ts:5314 |
| admin.getSequenceTemplates | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5449 |
| admin.launchSequenceFromTemplate | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5465 |
| admin.getAnalytics | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5521 |
| admin.resetAnalytics | adminUnlockedProcedure | yes | yes | admin | server/routers.ts:5680 |
| stables.create | stablePlanProcedure | yes | yes | core | server/routers.ts:5711 |
| stables.list | stablePlanProcedure | yes | yes | core | server/routers.ts:5745 |
| stables.getById | stablePlanProcedure | yes | not found | core | server/routers.ts:5766 |
| stables.update | stablePlanProcedure | yes | not found | core | server/routers.ts:5797 |
| stables.inviteMember | stablePlanProcedure | yes | yes | core | server/routers.ts:5841 |
| stables.getMembers | protectedProcedure | yes | yes | core | server/routers.ts:5908 |
| stables.getInvites | protectedProcedure | yes | yes | core | server/routers.ts:5952 |
| stables.cancelInvite | protectedProcedure | yes | yes | core | server/routers.ts:5996 |
| stables.removeMember | protectedProcedure | yes | yes | core | server/routers.ts:6035 |
| stables.getInviteByToken | publicProcedure | yes | yes | core | server/routers.ts:6091 |
| stables.acceptInvite | protectedProcedure | yes | yes | core | server/routers.ts:6138 |
| messages.getThreads | stablePlanProcedure | yes | yes | core | server/routers.ts:6198 |
| messages.getMessages | stablePlanProcedure | yes | yes | core | server/routers.ts:6216 |
| messages.sendMessage | stablePlanProcedure | yes | yes | core | server/routers.ts:6246 |
| messages.createThread | protectedProcedure | yes | yes | core | server/routers.ts:6306 |
| analytics.getTrainingStats | protectedProcedure | yes | yes | core | server/routers.ts:6328 |
| analytics.getHealthStats | protectedProcedure | yes | yes | core | server/routers.ts:6367 |
| analytics.getCostAnalysis | protectedProcedure | yes | not found | core | server/routers.ts:6389 |
| reports.generate | subscribedProcedure | yes | yes | academy | server/routers.ts:6427 |
| reports.list | protectedProcedure | yes | yes | academy | server/routers.ts:6686 |
| reports.scheduleReport | subscribedProcedure | yes | yes | academy | server/routers.ts:6704 |
| reports.listSchedules | subscribedProcedure | yes | yes | academy | server/routers.ts:6735 |
| reports.deleteSchedule | subscribedProcedure | yes | yes | academy | server/routers.ts:6751 |
| reports.delete | protectedProcedure | yes | yes | academy | server/routers.ts:6770 |
| calendar.getEvents | protectedProcedure | yes | yes | core | server/routers.ts:6791 |
| calendar.createEvent | subscribedProcedure | yes | yes | core | server/routers.ts:6816 |
| calendar.updateEvent | subscribedProcedure | yes | yes | core | server/routers.ts:6871 |
| calendar.deleteEvent | subscribedProcedure | yes | yes | core | server/routers.ts:6904 |
| competitions.create | subscribedProcedure | yes | yes | core | server/routers.ts:6920 |
| competitions.list | protectedProcedure | yes | yes | core | server/routers.ts:6950 |
| competitions.delete | protectedProcedure | yes | yes | core | server/routers.ts:6963 |
| competitions.exportCSV | subscribedProcedure | yes | not found | core | server/routers.ts:6979 |
| trainingPrograms.listTemplates | protectedProcedure | yes | yes | core | server/routers.ts:6994 |
| trainingPrograms.createTemplate | subscribedProcedure | yes | yes | core | server/routers.ts:7010 |
| trainingPrograms.getTemplate | protectedProcedure | yes | not found | core | server/routers.ts:7035 |
| trainingPrograms.updateTemplate | subscribedProcedure | yes | yes | core | server/routers.ts:7058 |
| trainingPrograms.deleteTemplate | subscribedProcedure | yes | yes | core | server/routers.ts:7097 |
| trainingPrograms.duplicateTemplate | subscribedProcedure | yes | yes | core | server/routers.ts:7121 |
| trainingPrograms.applyTemplate | subscribedProcedure | yes | yes | core | server/routers.ts:7161 |
| breeding.createRecord | stablePlanProcedure | yes | yes | core | server/routers.ts:7324 |
| breeding.list | stablePlanProcedure | yes | yes | core | server/routers.ts:7361 |
| breeding.get | stablePlanProcedure | yes | not found | core | server/routers.ts:7400 |
| breeding.update | stablePlanProcedure | yes | yes | core | server/routers.ts:7425 |
| breeding.delete | stablePlanProcedure | yes | yes | core | server/routers.ts:7484 |
| breeding.confirmPregnancy | stablePlanProcedure | yes | yes | core | server/routers.ts:7524 |
| breeding.addFoal | stablePlanProcedure | yes | yes | core | server/routers.ts:7576 |
| breeding.listFoals | stablePlanProcedure | yes | yes | core | server/routers.ts:7599 |
| breeding.exportCSV | stablePlanProcedure | yes | not found | core | server/routers.ts:7620 |
| trainerAvailability.create | protectedProcedure | yes | yes | core | server/routers.ts:7710 |
| trainerAvailability.list | protectedProcedure | yes | yes | core | server/routers.ts:7735 |
| trainerAvailability.update | protectedProcedure | yes | not found | core | server/routers.ts:7751 |
| trainerAvailability.delete | protectedProcedure | yes | yes | core | server/routers.ts:7796 |
| lessonBookings.create | protectedProcedure | yes | yes | academy | server/routers.ts:7825 |
| lessonBookings.list | protectedProcedure | yes | yes | academy | server/routers.ts:7861 |
| lessonBookings.get | protectedProcedure | yes | not found | academy | server/routers.ts:7893 |
| lessonBookings.update | protectedProcedure | yes | yes | academy | server/routers.ts:7922 |
| lessonBookings.delete | protectedProcedure | yes | yes | academy | server/routers.ts:7981 |
| lessonBookings.markCompleted | protectedProcedure | yes | yes | academy | server/routers.ts:8012 |
| lessonBookings.markCancelled | protectedProcedure | yes | yes | academy | server/routers.ts:8042 |
| treatments.list | protectedProcedure | yes | yes | core | server/routers.ts:8079 |
| treatments.listByHorse | protectedProcedure | yes | not found | core | server/routers.ts:8083 |
| treatments.get | protectedProcedure | yes | not found | core | server/routers.ts:8089 |
| treatments.create | protectedProcedure | yes | yes | core | server/routers.ts:8095 |
| treatments.update | protectedProcedure | yes | yes | core | server/routers.ts:8142 |
| treatments.delete | protectedProcedure | yes | yes | core | server/routers.ts:8188 |
| appointments.list | protectedProcedure | yes | yes | core | server/routers.ts:8217 |
| appointments.listByHorse | protectedProcedure | yes | not found | core | server/routers.ts:8221 |
| appointments.get | protectedProcedure | yes | not found | core | server/routers.ts:8227 |
| appointments.create | protectedProcedure | yes | yes | core | server/routers.ts:8233 |
| appointments.update | protectedProcedure | yes | yes | core | server/routers.ts:8287 |
| appointments.delete | protectedProcedure | yes | yes | core | server/routers.ts:8341 |
| appointments.exportCSV | protectedProcedure | yes | yes | core | server/routers.ts:8367 |
| dentalCare.list | protectedProcedure | yes | yes | core | server/routers.ts:8388 |
| dentalCare.listByHorse | protectedProcedure | yes | not found | core | server/routers.ts:8392 |
| dentalCare.get | protectedProcedure | yes | not found | core | server/routers.ts:8398 |
| dentalCare.create | protectedProcedure | yes | yes | core | server/routers.ts:8404 |
| dentalCare.update | protectedProcedure | yes | yes | core | server/routers.ts:8451 |
| dentalCare.delete | protectedProcedure | yes | yes | core | server/routers.ts:8497 |
| xrays.list | protectedProcedure | yes | yes | core | server/routers.ts:8526 |
| xrays.listByHorse | protectedProcedure | yes | not found | core | server/routers.ts:8530 |
| xrays.get | protectedProcedure | yes | not found | core | server/routers.ts:8536 |
| xrays.create | protectedProcedure | yes | yes | core | server/routers.ts:8542 |
| xrays.update | protectedProcedure | yes | yes | core | server/routers.ts:8588 |
| xrays.delete | protectedProcedure | yes | yes | core | server/routers.ts:8633 |
| tags.list | protectedProcedure | yes | yes | core | server/routers.ts:8657 |
| tags.get | protectedProcedure | yes | not found | core | server/routers.ts:8661 |
| tags.create | protectedProcedure | yes | yes | core | server/routers.ts:8667 |
| tags.update | protectedProcedure | yes | yes | core | server/routers.ts:8701 |
| tags.delete | protectedProcedure | yes | yes | core | server/routers.ts:8734 |
| tags.attachToHorse | protectedProcedure | yes | yes | core | server/routers.ts:8755 |
| tags.detachFromHorse | protectedProcedure | yes | yes | core | server/routers.ts:8770 |
| tags.listByHorse | protectedProcedure | yes | yes | core | server/routers.ts:8777 |
| tags.getHorsesByTag | protectedProcedure | yes | yes | core | server/routers.ts:8784 |
| tags.listWithCounts | protectedProcedure | yes | yes | core | server/routers.ts:8791 |
| hoofcare.list | protectedProcedure | yes | yes | core | server/routers.ts:8798 |
| hoofcare.listByHorse | protectedProcedure | yes | not found | core | server/routers.ts:8802 |
| hoofcare.get | protectedProcedure | yes | not found | core | server/routers.ts:8808 |
| hoofcare.create | protectedProcedure | yes | yes | core | server/routers.ts:8814 |
| hoofcare.update | protectedProcedure | yes | yes | core | server/routers.ts:8867 |
| hoofcare.delete | protectedProcedure | yes | yes | core | server/routers.ts:8915 |
| nutritionLogs.list | protectedProcedure | yes | yes | core | server/routers.ts:8944 |
| nutritionLogs.listByHorse | protectedProcedure | yes | not found | core | server/routers.ts:8948 |
| nutritionLogs.get | protectedProcedure | yes | not found | core | server/routers.ts:8954 |
| nutritionLogs.create | protectedProcedure | yes | yes | core | server/routers.ts:8960 |
| nutritionLogs.update | protectedProcedure | yes | yes | core | server/routers.ts:9004 |
| nutritionLogs.delete | protectedProcedure | yes | yes | core | server/routers.ts:9047 |
| nutritionPlans.list | protectedProcedure | yes | yes | core | server/routers.ts:9076 |
| nutritionPlans.listByHorse | protectedProcedure | yes | not found | core | server/routers.ts:9080 |
| nutritionPlans.get | protectedProcedure | yes | not found | core | server/routers.ts:9086 |
| nutritionPlans.create | protectedProcedure | yes | yes | core | server/routers.ts:9092 |
| nutritionPlans.update | protectedProcedure | yes | yes | core | server/routers.ts:9140 |
| nutritionPlans.delete | protectedProcedure | yes | yes | core | server/routers.ts:9187 |
| feedCosts.list | protectedProcedure | yes | yes | core | server/routers.ts:9216 |
| feedCosts.create | protectedProcedure | yes | yes | core | server/routers.ts:9240 |
| feedCosts.delete | protectedProcedure | yes | yes | core | server/routers.ts:9282 |
| feedCosts.summary | protectedProcedure | yes | yes | core | server/routers.ts:9305 |
| sharing.create | subscribedProcedure | yes | yes | core | server/routers.ts:9355 |
| sharing.list | subscribedProcedure | yes | yes | core | server/routers.ts:9387 |
| sharing.revoke | subscribedProcedure | yes | yes | core | server/routers.ts:9398 |
| timeline.getHorseTimeline | subscribedProcedure | yes | yes | core | server/routers.ts:9417 |
| timeline.getHealthAlerts | subscribedProcedure | yes | yes | core | server/routers.ts:9617 |
| marketing.unsubscribe | publicProcedure | yes | yes | campaign | server/routers.ts:9750 |
| marketing.captureLead | publicProcedure | yes | not found | campaign | server/routers.ts:9785 |
| student.getOverview | studentProcedure | yes | yes | academy | server/studentRouter.ts:913 |
| student.getVirtualHorse | studentProcedure | yes | yes | academy | server/studentRouter.ts:993 |
| student.createVirtualHorse | studentProcedure | yes | yes | academy | server/studentRouter.ts:1002 |
| student.updateVirtualHorse | studentProcedure | yes | not found | academy | server/studentRouter.ts:1033 |
| student.getAssignedHorse | studentProcedure | yes | not found | academy | server/studentRouter.ts:1054 |
| student.listTasks | studentProcedure | yes | yes | academy | server/studentRouter.ts:1079 |
| student.createTask | studentProcedure | yes | yes | academy | server/studentRouter.ts:1106 |
| student.completeTask | studentProcedure | yes | yes | academy | server/studentRouter.ts:1128 |
| student.uncompleteTask | studentProcedure | yes | yes | academy | server/studentRouter.ts:1139 |
| student.deleteTask | studentProcedure | yes | yes | academy | server/studentRouter.ts:1150 |
| student.listTraining | studentProcedure | yes | yes | academy | server/studentRouter.ts:1161 |
| student.createTraining | studentProcedure | yes | yes | academy | server/studentRouter.ts:1174 |
| student.deleteTraining | studentProcedure | yes | yes | academy | server/studentRouter.ts:1202 |
| student.getProgress | studentProcedure | yes | yes | academy | server/studentRouter.ts:1213 |
| student.listStudyTopics | studentProcedure | yes | yes | academy | server/studentRouter.ts:1222 |
| student.getStudyTopic | studentProcedure | yes | not found | academy | server/studentRouter.ts:1246 |
| student.askTutor | studentProcedure | yes | yes | academy | server/studentRouter.ts:1259 |
| student.getTutorUsage | studentProcedure | yes | yes | academy | server/studentRouter.ts:1360 |
| student.listScenarios | studentProcedure | yes | not found | academy | server/studentRouter.ts:1381 |
| student.checkScenarioAnswer | studentProcedure | yes | yes | academy | server/studentRouter.ts:1424 |
| student.getDailyScenarios | studentProcedure | yes | yes | academy | server/studentRouter.ts:1448 |
| student.updateTraining | studentProcedure | yes | yes | academy | server/studentRouter.ts:1507 |
| student.getLearnerLevel | studentProcedure | yes | yes | academy | server/studentRouter.ts:1534 |
| student.setLearnerLevel | studentProcedure | yes | yes | academy | server/studentRouter.ts:1543 |
| student.getUnlockedLevel | studentProcedure | yes | yes | academy | server/studentRouter.ts:1568 |
| student.listAssignedTasksForMe | studentProcedure | yes | yes | academy | server/studentRouter.ts:1635 |
| student.completeAssignedTask | studentProcedure | yes | yes | academy | server/studentRouter.ts:1664 |
| student.listMyFeedback | studentProcedure | yes | yes | academy | server/studentRouter.ts:1695 |
| student.markFeedbackRead | studentProcedure | yes | yes | academy | server/studentRouter.ts:1724 |
| student.getPathwayProgress | studentProcedure | yes | yes | academy | server/studentRouter.ts:1737 |
| student.markPathwayItemComplete | studentProcedure | yes | not found | academy | server/studentRouter.ts:1751 |
| student.listLessonPathways | studentProcedure | yes | yes | academy | server/studentRouter.ts:1788 |
| student.listLessons | studentProcedure | yes | yes | academy | server/studentRouter.ts:1817 |
| student.getLesson | studentProcedure | yes | yes | academy | server/studentRouter.ts:1906 |
| student.completeLesson | studentProcedure | yes | yes | academy | server/studentRouter.ts:1936 |
| student.getLessonProgress | studentProcedure | yes | yes | academy | server/studentRouter.ts:1977 |
| student.getAssignedLessons | studentProcedure | yes | yes | academy | server/studentRouter.ts:1995 |
| student.getMyCompetencies | studentProcedure | yes | yes | academy | server/studentRouter.ts:2047 |
| student.getMyLessonReviews | studentProcedure | yes | yes | academy | server/studentRouter.ts:2057 |
| student.markReviewRead | studentProcedure | yes | yes | academy | server/studentRouter.ts:2067 |
| student.getProgressIntelligence | studentProcedure | yes | yes | academy | server/studentRouter.ts:2079 |
| student.getTaskEngineStatus | studentProcedure | yes | yes | academy | server/studentRouter.ts:2199 |
| student.toggleTaskEngine | studentProcedure | yes | yes | academy | server/studentRouter.ts:2208 |
| student.generateDailyTasks | studentProcedure | yes | yes | academy | server/studentRouter.ts:2220 |
| student.sendMessageToTeacher | studentProcedure | yes | not found | academy | server/studentRouter.ts:2325 |
| student.getTeacherMessages | studentProcedure | yes | not found | academy | server/studentRouter.ts:2344 |
| student.listMyAssignments | studentProcedure | yes | not found | academy | server/studentRouter.ts:2382 |
| student.submitAssignment | studentProcedure | yes | not found | academy | server/studentRouter.ts:2408 |
| student.listSharedResources | studentProcedure | yes | not found | academy | server/studentRouter.ts:2445 |
| student.listMyReports | studentProcedure | yes | not found | academy | server/studentRouter.ts:2477 |
| teacher.verifyTeacher | teacherProcedure | yes | not found | academy | server/teacherRouter.ts:115 |
| teacher.listGroups | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:127 |
| teacher.createGroup | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:146 |
| teacher.updateGroup | teacherProcedure | yes | not found | academy | server/teacherRouter.ts:166 |
| teacher.deleteGroup | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:184 |
| teacher.listGroupMembers | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:198 |
| teacher.addGroupMember | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:237 |
| teacher.removeGroupMember | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:284 |
| teacher.listMyStudents | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:311 |
| teacher.getStudentSummary | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:354 |
| teacher.assignTask | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:421 |
| teacher.listAssignedTasksByTeacher | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:459 |
| teacher.deleteAssignedTask | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:477 |
| teacher.markAssignedTaskComplete | teacherProcedure | yes | not found | academy | server/teacherRouter.ts:487 |
| teacher.addFeedback | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:500 |
| teacher.listFeedbackByTeacher | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:539 |
| teacher.deleteFeedback | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:555 |
| teacher.generateReport | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:567 |
| teacher.getTeacherOverview | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:765 |
| teacher.listLessons | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:815 |
| teacher.assignLesson | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:833 |
| teacher.listLessonAssignments | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:873 |
| teacher.deleteLessonAssignment | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:892 |
| teacher.getStudentLessonSummary | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:904 |
| teacher.reviewLesson | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:944 |
| teacher.listLessonReviews | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:984 |
| teacher.signOffCompetency | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:997 |
| teacher.listStudentCompetencies | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1053 |
| teacher.sendMessage | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1081 |
| teacher.getThreadMessages | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1100 |
| teacher.getUnreadCounts | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1134 |
| teacher.createResource | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1162 |
| teacher.listResources | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1192 |
| teacher.deleteResource | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1203 |
| teacher.createAssignment | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1222 |
| teacher.listTeacherAssignments | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1245 |
| teacher.reviewAssignment | teacherProcedure | yes | yes | academy | server/teacherRouter.ts:1273 |
| teacher.listReportTemplates | teacherProcedure | yes | not found | academy | server/teacherRouter.ts:1302 |
| teacher.createStudentReport | teacherProcedure | yes | not found | academy | server/teacherRouter.ts:1382 |
| teacher.listStudentReports | teacherProcedure | yes | not found | academy | server/teacherRouter.ts:1405 |
| school.createOrganization | schoolOwnerProcedure | yes | yes | academy | server/schoolRouter.ts:53 |
| school.getMyOrganization | protectedProcedure | yes | yes | academy | server/schoolRouter.ts:104 |
| school.listMembers | schoolOwnerProcedure | yes | yes | academy | server/schoolRouter.ts:132 |
| school.inviteMember | schoolOwnerProcedure | yes | yes | academy | server/schoolRouter.ts:158 |
| school.listInvites | schoolOwnerProcedure | yes | not found | academy | server/schoolRouter.ts:211 |
| school.acceptInvite | protectedProcedure | yes | not found | academy | server/schoolRouter.ts:228 |
| school.removeMember | schoolOwnerProcedure | yes | yes | academy | server/schoolRouter.ts:275 |
| school.updateMemberRole | schoolOwnerProcedure | yes | not found | academy | server/schoolRouter.ts:310 |
| school.getStats | schoolOwnerProcedure | yes | yes | academy | server/schoolRouter.ts:338 |
| system.health | publicProcedure | yes | not found | core | server/_core/systemRouter.ts:46 |
| system.getFeatureFlags | publicProcedure | yes | not found | core | server/_core/systemRouter.ts:56 |
| system.getBuildInfo | adminUnlockedProcedure | yes | not found | core | server/_core/systemRouter.ts:61 |
| system.notifyOwner | adminUnlockedProcedure | yes | not found | core | server/_core/systemRouter.ts:65 |


## REST Endpoints

| Method | Path/mount | Auth requirement | Source |
| --- | --- | --- | --- |
| USE | /api | unknown or middleware | server/_core/index.ts:141 |
| POST | /api/webhooks/stripe | Stripe signature | server/_core/index.ts:160 |
| GET | /healthz | public/rate-limited | server/_core/index.ts:481 |
| GET | /build | public/rate-limited | server/_core/index.ts:489 |
| GET | /api/health | unknown or middleware | server/_core/index.ts:494 |
| GET | /api/system/config-status | admin or admin key | server/_core/index.ts:517 |
| GET | /api/admin/status | admin or admin key | server/_core/index.ts:559 |
| GET | /api/health/ping | unknown or middleware | server/_core/index.ts:676 |
| GET | /api/version | unknown or middleware | server/_core/index.ts:681 |
| GET | /api/oauth/status | public/rate-limited | server/_core/index.ts:713 |
| GET | /favicon.ico | public/rate-limited | server/_core/index.ts:726 |
| POST | /api/contact | public/rate-limited | server/_core/index.ts:787 |
| USE | /api/auth | public/rate-limited | server/_core/index.ts:858 |
| USE | /api/billing | unknown or middleware | server/_core/index.ts:863 |
| POST | /api/analytics/cta | unknown or middleware | server/_core/index.ts:871 |
| POST | /api/admin/send-test-email | admin or admin key | server/_core/index.ts:888 |
| GET | /api/realtime/events | session required | server/_core/index.ts:920 |
| GET | /api/realtime/stats | admin or admin key | server/_core/index.ts:946 |
| GET | /api/realtime/health | unknown or middleware | server/_core/index.ts:963 |
| POST | /api/webhooks/whatsapp | Twilio webhook, no signature enforcement found | server/_core/index.ts:985 |
| USE | /trpc | unknown or middleware | server/_core/index.ts:1052 |
| USE | /api/trpc | unknown or middleware | server/_core/index.ts:1053 |
| USE | /api/v1 | unknown or middleware | server/_core/index.ts:1060 |
| POST | /signup | unknown or middleware | server/_core/authRouter.ts:107 |
| POST | /login | unknown or middleware | server/_core/authRouter.ts:248 |
| POST | /request-reset | unknown or middleware | server/_core/authRouter.ts:349 |
| POST | /reset-password | unknown or middleware | server/_core/authRouter.ts:407 |
| POST | /verify-email | unknown or middleware | server/_core/authRouter.ts:458 |
| POST | /resend-verification | unknown or middleware | server/_core/authRouter.ts:530 |
| POST | /logout | unknown or middleware | server/_core/authRouter.ts:580 |
| POST | /change-password | unknown or middleware | server/_core/authRouter.ts:593 |
| GET | /plans | unknown or middleware | server/_core/billingRouter.ts:14 |
| GET | /checkout | unknown or middleware | server/_core/billingRouter.ts:70 |
| GET | /portal | unknown or middleware | server/_core/billingRouter.ts:131 |
| POST | /sales-chat | public/rate-limited | server/_core/salesChatRouter.ts:212 |
| POST | /sales-lead | public/rate-limited | server/_core/salesChatRouter.ts:283 |
| GET | /sales-leads | admin or admin key | server/_core/salesChatRouter.ts:413 |
| GET | /horses | API key | server/api.ts:92 |
| GET | /horses/:id | API key | server/api.ts:119 |
| GET | /health-records/:horseId | API key | server/api.ts:160 |
| GET | /training-sessions/:horseId | API key | server/api.ts:206 |
| GET | /competitions/:horseId | API key | server/api.ts:251 |
| GET | /api/oauth/callback | public/rate-limited | server/_core/oauth.ts:10 |
| GET | /api/files/:key | public unguessable file key | server/_core/index.ts:1070 |
| ALL | /api/* fallback | public JSON 404 | server/_core/index.ts:1129 |


## Webhook Endpoints

- `POST /api/webhooks/stripe` (Stripe signature) from `server/_core/index.ts:160`
- `POST /api/webhooks/whatsapp` (Twilio webhook, no signature enforcement found) from `server/_core/index.ts:985`


## SSE/Realtime Endpoints

- `GET /api/realtime/events` (session required) from `server/_core/index.ts:920`
- `GET /api/realtime/stats` (admin or admin key) from `server/_core/index.ts:946`
- `GET /api/realtime/health` (unknown or middleware) from `server/_core/index.ts:963`


## Procedures Referenced by Frontend

- `trpc.admin.addSuppression`
- `trpc.admin.bulkDeleteMarketingContacts`
- `trpc.admin.clearDuplicateFlag`
- `trpc.admin.createCampaign`
- `trpc.admin.createMarketingContact`
- `trpc.admin.deleteCampaign`
- `trpc.admin.deleteMarketingContact`
- `trpc.admin.deleteUser`
- `trpc.admin.getActivityLogs`
- `trpc.admin.getAnalytics`
- `trpc.admin.getCampaignAssignmentPreview`
- `trpc.admin.getCampaignMailboxStatus`
- `trpc.admin.getCampaignReplies`
- `trpc.admin.getCampaigns`
- `trpc.admin.getChurnRisk`
- `trpc.admin.getDeletedUsers`
- `trpc.admin.getDocumentHealth`
- `trpc.admin.getEnvHealth`
- `trpc.admin.getLeads`
- `trpc.admin.getMarketingContacts`
- `trpc.admin.getOverdueUsers`
- `trpc.admin.getSegmentCounts`
- `trpc.admin.getSequenceTemplates`
- `trpc.admin.getSettings`
- `trpc.admin.getSiteSettings`
- `trpc.admin.getStats`
- `trpc.admin.getTemplates`
- `trpc.admin.getUnsubscribes`
- `trpc.admin.getUserSegmentation`
- `trpc.admin.getUsers`
- `trpc.admin.getWhatsAppConfig`
- `trpc.admin.grantFreeAccess`
- `trpc.admin.hardDeleteUser`
- `trpc.admin.importMarketingContacts`
- `trpc.admin.launchSequenceFromTemplate`
- `trpc.admin.parseImportFile`
- `trpc.admin.pauseCampaign`
- `trpc.admin.previewTemplate`
- `trpc.admin.removeSuppression`
- `trpc.admin.resetAnalytics`
- `trpc.admin.resetUserPassword`
- `trpc.admin.restoreUser`
- `trpc.admin.resumeCampaign`
- `trpc.admin.revokeFreeAccess`
- `trpc.admin.runCampaignAutopilot`
- `trpc.admin.runDuplicatePersonScan`
- `trpc.admin.sendCampaign`
- `trpc.admin.sendTestEmail`
- `trpc.admin.setSiteSetting`
- `trpc.admin.suspendUser`
- `trpc.admin.triggerReplyFetch`
- `trpc.admin.unsuspendUser`
- `trpc.admin.updateReplyStatus`
- `trpc.admin.updateUserRole`
- `trpc.admin.updateWhatsAppConfig`
- `trpc.adminUnlock.getStatus`
- `trpc.adminUnlock.submitPassword`
- `trpc.ai.chat`
- `trpc.analytics.getHealthStats`
- `trpc.analytics.getTrainingStats`
- `trpc.appointments.create`
- `trpc.appointments.delete`
- `trpc.appointments.exportCSV`
- `trpc.appointments.list`
- `trpc.appointments.update`
- `trpc.auth.logout`
- `trpc.auth.me`
- `trpc.billing.createCheckout`
- `trpc.billing.createPortal`
- `trpc.billing.getPricing`
- `trpc.billing.getStatus`
- `trpc.breeding.addFoal`
- `trpc.breeding.confirmPregnancy`
- `trpc.breeding.createRecord`
- `trpc.breeding.delete`
- `trpc.breeding.list`
- `trpc.breeding.listFoals`
- `trpc.breeding.update`
- `trpc.calendar.createEvent`
- `trpc.calendar.deleteEvent`
- `trpc.calendar.getEvents`
- `trpc.calendar.updateEvent`
- `trpc.competitions.create`
- `trpc.competitions.delete`
- `trpc.competitions.list`
- `trpc.contacts.create`
- `trpc.contacts.delete`
- `trpc.contacts.exportCSV`
- `trpc.contacts.list`
- `trpc.contacts.update`
- `trpc.dentalCare.create`
- `trpc.dentalCare.delete`
- `trpc.dentalCare.list`
- `trpc.dentalCare.update`
- `trpc.dewormings.create`
- `trpc.dewormings.delete`
- `trpc.dewormings.list`
- `trpc.dewormings.update`
- `trpc.documents.delete`
- `trpc.documents.exportCSV`
- `trpc.documents.list`
- `trpc.documents.upload`
- `trpc.feedCosts.create`
- `trpc.feedCosts.delete`
- `trpc.feedCosts.list`
- `trpc.feedCosts.summary`
- `trpc.feeding.create`
- `trpc.feeding.delete`
- `trpc.feeding.exportCSV`
- `trpc.feeding.listAll`
- `trpc.feeding.listByHorse`
- `trpc.healthRecords.create`
- `trpc.healthRecords.delete`
- `trpc.healthRecords.exportCSV`
- `trpc.healthRecords.getReminders`
- `trpc.healthRecords.listAll`
- `trpc.healthRecords.listByHorse`
- `trpc.healthRecords.update`
- `trpc.hoofcare.create`
- `trpc.hoofcare.delete`
- `trpc.hoofcare.list`
- `trpc.hoofcare.update`
- `trpc.horses.create`
- `trpc.horses.delete`
- `trpc.horses.exportCSV`
- `trpc.horses.get`
- `trpc.horses.getPassportByToken`
- `trpc.horses.list`
- `trpc.horses.update`
- `trpc.lessonBookings.create`
- `trpc.lessonBookings.delete`
- `trpc.lessonBookings.list`
- `trpc.lessonBookings.markCancelled`
- `trpc.lessonBookings.markCompleted`
- `trpc.lessonBookings.update`
- `trpc.marketing.unsubscribe`
- `trpc.messages.createThread`
- `trpc.messages.getMessages`
- `trpc.messages.getThreads`
- `trpc.messages.sendMessage`
- `trpc.notes.create`
- `trpc.notes.delete`
- `trpc.notes.list`
- `trpc.nutritionLogs.create`
- `trpc.nutritionLogs.delete`
- `trpc.nutritionLogs.list`
- `trpc.nutritionLogs.update`
- `trpc.nutritionPlans.create`
- `trpc.nutritionPlans.delete`
- `trpc.nutritionPlans.list`
- `trpc.nutritionPlans.update`
- `trpc.pedigree.createOrUpdate`
- `trpc.pedigree.get`
- `trpc.reports.delete`
- `trpc.reports.deleteSchedule`
- `trpc.reports.generate`
- `trpc.reports.list`
- `trpc.reports.listSchedules`
- `trpc.reports.scheduleReport`
- `trpc.rides.create`
- `trpc.rides.delete`
- `trpc.rides.list`
- `trpc.school.createOrganization`
- `trpc.school.getMyOrganization`
- `trpc.school.getStats`
- `trpc.school.inviteMember`
- `trpc.school.listMembers`
- `trpc.school.removeMember`
- `trpc.sharing.create`
- `trpc.sharing.list`
- `trpc.sharing.revoke`
- `trpc.stables.acceptInvite`
- `trpc.stables.cancelInvite`
- `trpc.stables.create`
- `trpc.stables.getInviteByToken`
- `trpc.stables.getInvites`
- `trpc.stables.getMembers`
- `trpc.stables.inviteMember`
- `trpc.stables.list`
- `trpc.stables.removeMember`
- `trpc.student.askTutor`
- `trpc.student.checkScenarioAnswer`
- `trpc.student.completeAssignedTask`
- `trpc.student.completeLesson`
- `trpc.student.completeTask`
- `trpc.student.createTask`
- `trpc.student.createTraining`
- `trpc.student.createVirtualHorse`
- `trpc.student.deleteTask`
- `trpc.student.deleteTraining`
- `trpc.student.generateDailyTasks`
- `trpc.student.getAssignedLessons`
- `trpc.student.getDailyScenarios`
- `trpc.student.getLearnerLevel`
- `trpc.student.getLesson`
- `trpc.student.getLessonProgress`
- `trpc.student.getMyCompetencies`
- `trpc.student.getMyLessonReviews`
- `trpc.student.getOverview`
- `trpc.student.getPathwayProgress`
- `trpc.student.getProgress`
- `trpc.student.getProgressIntelligence`
- `trpc.student.getTaskEngineStatus`
- `trpc.student.getTutorUsage`
- `trpc.student.getUnlockedLevel`
- `trpc.student.getVirtualHorse`
- `trpc.student.listAssignedTasksForMe`
- `trpc.student.listLessonPathways`
- `trpc.student.listLessons`
- `trpc.student.listMyFeedback`
- `trpc.student.listStudyTopics`
- `trpc.student.listTasks`
- `trpc.student.listTraining`
- `trpc.student.markFeedbackRead`
- `trpc.student.markReviewRead`
- `trpc.student.setLearnerLevel`
- `trpc.student.toggleTaskEngine`
- `trpc.student.uncompleteTask`
- `trpc.student.updateTraining`
- `trpc.tags.attachToHorse`
- `trpc.tags.create`
- `trpc.tags.delete`
- `trpc.tags.detachFromHorse`
- `trpc.tags.getHorsesByTag`
- `trpc.tags.list`
- `trpc.tags.listByHorse`
- `trpc.tags.listWithCounts`
- `trpc.tags.update`
- `trpc.tasks.complete`
- `trpc.tasks.create`
- `trpc.tasks.delete`
- `trpc.tasks.exportCSV`
- `trpc.tasks.list`
- `trpc.tasks.update`
- `trpc.teacher.addFeedback`
- `trpc.teacher.addGroupMember`
- `trpc.teacher.assignLesson`
- `trpc.teacher.assignTask`
- `trpc.teacher.createAssignment`
- `trpc.teacher.createGroup`
- `trpc.teacher.createResource`
- `trpc.teacher.deleteAssignedTask`
- `trpc.teacher.deleteFeedback`
- `trpc.teacher.deleteGroup`
- `trpc.teacher.deleteLessonAssignment`
- `trpc.teacher.deleteResource`
- `trpc.teacher.generateReport`
- `trpc.teacher.getStudentLessonSummary`
- `trpc.teacher.getStudentSummary`
- `trpc.teacher.getTeacherOverview`
- `trpc.teacher.getThreadMessages`
- `trpc.teacher.getUnreadCounts`
- `trpc.teacher.listAssignedTasksByTeacher`
- `trpc.teacher.listFeedbackByTeacher`
- `trpc.teacher.listGroupMembers`
- `trpc.teacher.listGroups`
- `trpc.teacher.listLessonAssignments`
- `trpc.teacher.listLessonReviews`
- `trpc.teacher.listLessons`
- `trpc.teacher.listMyStudents`
- `trpc.teacher.listResources`
- `trpc.teacher.listStudentCompetencies`
- `trpc.teacher.listTeacherAssignments`
- `trpc.teacher.removeGroupMember`
- `trpc.teacher.reviewAssignment`
- `trpc.teacher.reviewLesson`
- `trpc.teacher.sendMessage`
- `trpc.teacher.signOffCompetency`
- `trpc.timeline.getHealthAlerts`
- `trpc.timeline.getHorseTimeline`
- `trpc.trainerAvailability.create`
- `trpc.trainerAvailability.delete`
- `trpc.trainerAvailability.list`
- `trpc.training.complete`
- `trpc.training.create`
- `trpc.training.delete`
- `trpc.training.exportCSV`
- `trpc.training.getUpcoming`
- `trpc.training.listAll`
- `trpc.training.listByHorse`
- `trpc.training.update`
- `trpc.trainingPrograms.applyTemplate`
- `trpc.trainingPrograms.createTemplate`
- `trpc.trainingPrograms.deleteTemplate`
- `trpc.trainingPrograms.duplicateTemplate`
- `trpc.trainingPrograms.listTemplates`
- `trpc.trainingPrograms.updateTemplate`
- `trpc.treatments.create`
- `trpc.treatments.delete`
- `trpc.treatments.list`
- `trpc.treatments.update`
- `trpc.user.completeOnboarding`
- `trpc.user.getDashboardStats`
- `trpc.user.getNotificationPreferences`
- `trpc.user.getProfile`
- `trpc.user.getSubscriptionStatus`
- `trpc.user.resetOnboarding`
- `trpc.user.setExperience`
- `trpc.user.updateActivationChecklist`
- `trpc.user.updateNotificationPreferences`
- `trpc.user.updateOnboardingStep`
- `trpc.user.updateProfile`
- `trpc.vaccinations.create`
- `trpc.vaccinations.delete`
- `trpc.vaccinations.list`
- `trpc.vaccinations.update`
- `trpc.weather.getCurrent`
- `trpc.weather.getForecast`
- `trpc.weather.getHourly`
- `trpc.weather.updateLocation`
- `trpc.xrays.create`
- `trpc.xrays.delete`
- `trpc.xrays.list`
- `trpc.xrays.update`


## Procedures That Appear Unused

- `adminUnlock.requestUnlock` (protectedProcedure, server/routers.ts:339)
- `adminUnlock.lock` (protectedProcedure, server/routers.ts:449)
- `user.getOnboardingStatus` (protectedProcedure, server/routers.ts:867)
- `user.skipOnboarding` (protectedProcedure, server/routers.ts:908)
- `user.dismissTour` (protectedProcedure, server/routers.ts:972)
- `user.dismissTip` (protectedProcedure, server/routers.ts:987)
- `horses.getPassport` (publicProcedure, server/routers.ts:1011)
- `healthRecords.get` (subscribedProcedure, server/routers.ts:1325)
- `feeding.update` (subscribedProcedure, server/routers.ts:1695)
- `tasks.listByHorse` (subscribedProcedure, server/routers.ts:1754)
- `tasks.get` (subscribedProcedure, server/routers.ts:1760)
- `tasks.getUpcoming` (subscribedProcedure, server/routers.ts:1770)
- `contacts.listByType` (subscribedProcedure, server/routers.ts:1944)
- `contacts.get` (subscribedProcedure, server/routers.ts:1950)
- `vaccinations.listByHorse` (subscribedProcedure, server/routers.ts:2090)
- `vaccinations.get` (subscribedProcedure, server/routers.ts:2096)
- `dewormings.listByHorse` (subscribedProcedure, server/routers.ts:2208)
- `dewormings.get` (subscribedProcedure, server/routers.ts:2214)
- `pedigree.delete` (subscribedProcedure, server/routers.ts:2355)
- `documents.listByHorse` (subscribedProcedure, server/routers.ts:2385)
- `weather.analyze` (subscribedProcedure, server/routers.ts:2593)
- `weather.getLatest` (subscribedProcedure, server/routers.ts:2746)
- `weather.getHistory` (subscribedProcedure, server/routers.ts:2750)
- `notes.update` (subscribedProcedure, server/routers.ts:2875)
- `rides.get` (subscribedProcedure, server/routers.ts:2931)
- `admin.getUserDetails` (adminUnlockedProcedure, server/routers.ts:2985)
- `admin.getExpiredTrials` (adminUnlockedProcedure, server/routers.ts:3275)
- `admin.updateSetting` (adminUnlockedProcedure, server/routers.ts:3402)
- `admin.getBackupLogs` (adminUnlockedProcedure, server/routers.ts:3429)
- `admin.apiKeys.list` (adminUnlockedProcedure, server/routers.ts:3437)
- `admin.apiKeys.create` (adminUnlockedProcedure, server/routers.ts:3441)
- `admin.apiKeys.revoke` (adminUnlockedProcedure, server/routers.ts:3470)
- `admin.apiKeys.rotate` (adminUnlockedProcedure, server/routers.ts:3483)
- `admin.apiKeys.updateSettings` (adminUnlockedProcedure, server/routers.ts:3504)
- `admin.getCampaignDetails` (adminUnlockedProcedure, server/routers.ts:3893)
- `admin.getDailyLimitStatus` (adminUnlockedProcedure, server/routers.ts:4770)
- `admin.getCampaignSequences` (adminUnlockedProcedure, server/routers.ts:5281)
- `admin.addCampaignSequenceStep` (adminUnlockedProcedure, server/routers.ts:5291)
- `admin.sendSequenceStep` (adminUnlockedProcedure, server/routers.ts:5314)
- `stables.getById` (stablePlanProcedure, server/routers.ts:5766)
- `stables.update` (stablePlanProcedure, server/routers.ts:5797)
- `analytics.getCostAnalysis` (protectedProcedure, server/routers.ts:6389)
- `competitions.exportCSV` (subscribedProcedure, server/routers.ts:6979)
- `trainingPrograms.getTemplate` (protectedProcedure, server/routers.ts:7035)
- `breeding.get` (stablePlanProcedure, server/routers.ts:7400)
- `breeding.exportCSV` (stablePlanProcedure, server/routers.ts:7620)
- `trainerAvailability.update` (protectedProcedure, server/routers.ts:7751)
- `lessonBookings.get` (protectedProcedure, server/routers.ts:7893)
- `treatments.listByHorse` (protectedProcedure, server/routers.ts:8083)
- `treatments.get` (protectedProcedure, server/routers.ts:8089)
- `appointments.listByHorse` (protectedProcedure, server/routers.ts:8221)
- `appointments.get` (protectedProcedure, server/routers.ts:8227)
- `dentalCare.listByHorse` (protectedProcedure, server/routers.ts:8392)
- `dentalCare.get` (protectedProcedure, server/routers.ts:8398)
- `xrays.listByHorse` (protectedProcedure, server/routers.ts:8530)
- `xrays.get` (protectedProcedure, server/routers.ts:8536)
- `tags.get` (protectedProcedure, server/routers.ts:8661)
- `hoofcare.listByHorse` (protectedProcedure, server/routers.ts:8802)
- `hoofcare.get` (protectedProcedure, server/routers.ts:8808)
- `nutritionLogs.listByHorse` (protectedProcedure, server/routers.ts:8948)
- `nutritionLogs.get` (protectedProcedure, server/routers.ts:8954)
- `nutritionPlans.listByHorse` (protectedProcedure, server/routers.ts:9080)
- `nutritionPlans.get` (protectedProcedure, server/routers.ts:9086)
- `marketing.captureLead` (publicProcedure, server/routers.ts:9785)
- `student.updateVirtualHorse` (studentProcedure, server/studentRouter.ts:1033)
- `student.getAssignedHorse` (studentProcedure, server/studentRouter.ts:1054)
- `student.getStudyTopic` (studentProcedure, server/studentRouter.ts:1246)
- `student.listScenarios` (studentProcedure, server/studentRouter.ts:1381)
- `student.markPathwayItemComplete` (studentProcedure, server/studentRouter.ts:1751)
- `student.sendMessageToTeacher` (studentProcedure, server/studentRouter.ts:2325)
- `student.getTeacherMessages` (studentProcedure, server/studentRouter.ts:2344)
- `student.listMyAssignments` (studentProcedure, server/studentRouter.ts:2382)
- `student.submitAssignment` (studentProcedure, server/studentRouter.ts:2408)
- `student.listSharedResources` (studentProcedure, server/studentRouter.ts:2445)
- `student.listMyReports` (studentProcedure, server/studentRouter.ts:2477)
- `teacher.verifyTeacher` (teacherProcedure, server/teacherRouter.ts:115)
- `teacher.updateGroup` (teacherProcedure, server/teacherRouter.ts:166)
- `teacher.markAssignedTaskComplete` (teacherProcedure, server/teacherRouter.ts:487)
- `teacher.listReportTemplates` (teacherProcedure, server/teacherRouter.ts:1302)
- `teacher.createStudentReport` (teacherProcedure, server/teacherRouter.ts:1382)
- `teacher.listStudentReports` (teacherProcedure, server/teacherRouter.ts:1405)
- `school.listInvites` (schoolOwnerProcedure, server/schoolRouter.ts:211)
- `school.acceptInvite` (protectedProcedure, server/schoolRouter.ts:228)
- `school.updateMemberRole` (schoolOwnerProcedure, server/schoolRouter.ts:310)
- `system.health` (publicProcedure, server/_core/systemRouter.ts:46)
- `system.getFeatureFlags` (publicProcedure, server/_core/systemRouter.ts:56)
- `system.getBuildInfo` (adminUnlockedProcedure, server/_core/systemRouter.ts:61)
- `system.notifyOwner` (adminUnlockedProcedure, server/_core/systemRouter.ts:65)


## Admin/Campaign/Academy/AI Groups

- Admin-only procedures found: 71.
- Campaign-related procedures found: 2.
- Academy-related procedures found: 112.
- AI/weather/chat-related procedures found: 8.
