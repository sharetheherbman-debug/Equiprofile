import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ManagementLayout } from "@/components/management/ManagementLayout";
import { MgmtHero } from "@/components/management/MgmtHero";

export default function AIMarketingLanding() {
  return (
    <ManagementLayout>
      <MgmtHero
        imageSrc="/images/hero/image6.jpg"
        imageAlt="AI marketing orchestration"
        eyebrow="AI Marketing"
        title={
          <>
            One AI Marketing Engine
            <br />
            <span className="text-[#c5a55a]">Across Every Tenant</span>
          </>
        }
        subtitle="Approval-aware campaigns, social scheduling states, lifecycle automation and funnel analytics from one reusable engine."
      />
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[#0f1d2e]/75 text-lg leading-relaxed">
            Replace scattered tools with a single conversion system for lead capture, onboarding activation and retention journeys.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"><Button className="bg-[#c5a55a] text-[#0f1d2e] hover:bg-[#d4b468]">Activate AI Marketing</Button></Link>
            <Link href="/features"><Button variant="outline">See Growth Features</Button></Link>
          </div>
        </div>
      </section>
    </ManagementLayout>
  );
}
