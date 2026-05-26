import { MarketingStudioV2 } from "@/components/marketing/studio/MarketingStudioV2";

export default function AdminCampaigns({ onBackToAdmin }: { onBackToAdmin?: () => void }) {
  return <MarketingStudioV2 onBackToAdmin={onBackToAdmin} />;
}
