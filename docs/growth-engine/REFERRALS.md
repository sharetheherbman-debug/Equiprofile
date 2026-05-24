# Referral Engine Foundation

## Supported referral architecture
- Invite links
- Stable invites
- School invites
- Academy invites
- Yard/share referrals

## Persistence
- `growthReferrals` stores inviter, invitee, referral type, source, code, and conversion status.

## API surfaces
- `growthEngine.createReferralInvite`
- `growthEngine.getAdminData` referral analytics visibility

## Attribution model
- CRM records support `referralCode` linkage.
- Funnel events can carry referral metadata for attribution analysis.

