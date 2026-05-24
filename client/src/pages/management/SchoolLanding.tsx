import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ManagementLayout } from "@/components/management/ManagementLayout";
import { MgmtHero } from "@/components/management/MgmtHero";

export default function SchoolLanding() {
  return (
    <ManagementLayout>
      <MgmtHero
        imageSrc="/images/school/school-hero.jpg"
        imageAlt="Equestrian school growth funnel"
        eyebrow="School Growth"
        title={
          <>
            Convert More Riders into
            <br />
            <span className="text-[#c5a55a]">Long-Term School Members</span>
          </>
        }
        subtitle="UK-focused school positioning with onboarding flows for students and teachers, lifecycle education campaigns and retention analytics."
      />
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[#0f1d2e]/75 text-lg leading-relaxed">
            Align school onboarding, referrals, teacher invitations and lifecycle nudges from one reusable Growth Engine foundation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"><Button className="bg-[#c5a55a] text-[#0f1d2e] hover:bg-[#d4b468]">Start School Trial</Button></Link>
            <Link href="/contact"><Button variant="outline">Talk to Sales</Button></Link>
          </div>
        </div>
      </section>
    </ManagementLayout>
  );
}
