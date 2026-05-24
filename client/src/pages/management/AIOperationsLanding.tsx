import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ManagementLayout } from "@/components/management/ManagementLayout";
import { MgmtHero } from "@/components/management/MgmtHero";

export default function AIOperationsLanding() {
  return (
    <ManagementLayout>
      <MgmtHero
        imageSrc="/images/gallery/19.jpg"
        imageAlt="AI operations for equestrian businesses"
        eyebrow="AI Operations"
        title={
          <>
            AI Operations for
            <br />
            <span className="text-[#c5a55a]">Modern Equestrian Teams</span>
          </>
        }
        subtitle="Queue-safe automation, approval workflows, onboarding guidance, CRM lifecycle state and social readiness in one operational layer."
      />
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[#0f1d2e]/75 text-lg leading-relaxed">
            Built for mobile-first teams in UK yards and schools, with reusable architecture that scales to future AmarktAI apps.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"><Button className="bg-[#c5a55a] text-[#0f1d2e] hover:bg-[#d4b468]">Start Operations Setup</Button></Link>
            <Link href="/contact"><Button variant="outline">Request Rollout Plan</Button></Link>
          </div>
        </div>
      </section>
    </ManagementLayout>
  );
}
