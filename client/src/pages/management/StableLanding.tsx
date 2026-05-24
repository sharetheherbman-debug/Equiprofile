import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ManagementLayout } from "@/components/management/ManagementLayout";
import { MgmtHero } from "@/components/management/MgmtHero";

export default function StableLanding() {
  return (
    <ManagementLayout>
      <MgmtHero
        imageSrc="/images/management/landingV3.jpg"
        imageAlt="Premium UK stable operations"
        eyebrow="Stable Growth"
        title={
          <>
            Grow Your Stable with
            <br />
            <span className="text-[#c5a55a]">AI-Assisted Operations</span>
          </>
        }
        subtitle="Built for UK livery yards and training stables: onboarding, lifecycle reminders, CRM and campaign automation in one premium workflow."
      />
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[#0f1d2e]/75 text-lg leading-relaxed">
            Launch a conversion-focused stable funnel with guided onboarding, referral-ready invite links, approval-safe content workflows and persistent growth analytics.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"><Button className="bg-[#c5a55a] text-[#0f1d2e] hover:bg-[#d4b468]">Start Stable Trial</Button></Link>
            <Link href="/contact"><Button variant="outline">Book UK Demo</Button></Link>
          </div>
        </div>
      </section>
    </ManagementLayout>
  );
}
