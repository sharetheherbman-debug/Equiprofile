import { TheMarketingApp } from "@/components/marketing/app/TheMarketingApp";

export default function AdminCampaigns({ onBackToAdmin }: { onBackToAdmin?: () => void }) {
  return <TheMarketingApp onBack={onBackToAdmin} />;
}
