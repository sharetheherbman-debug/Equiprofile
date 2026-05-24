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
            Marketing Studio Beta
            <br />
            <span className="text-[#c5a55a]">Approval-First Tools</span>
          </>
        }
        subtitle="Email campaigns, CRM, approval queues and provider diagnostics are being beta-tested. Direct social publishing is not enabled yet."
      />
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[#0f1d2e]/75 text-lg leading-relaxed">
            This direct campaign page is intentionally hidden from primary navigation while Marketing Studio finishes beta QA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"><Button className="bg-[#c5a55a] text-[#0f1d2e] hover:bg-[#d4b468]">Start Free Trial</Button></Link>
            <Link href="/features"><Button variant="outline">See Growth Features</Button></Link>
          </div>
        </div>
      </section>
    </ManagementLayout>
  );
}
