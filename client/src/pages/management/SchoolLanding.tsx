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
            School Management for
            <br />
            <span className="text-[#c5a55a]">Students and Teachers</span>
          </>
        }
        subtitle="A direct campaign page for school onboarding, student records and teacher workflows. Marketing automation remains in beta."
      />
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[#0f1d2e]/75 text-lg leading-relaxed">
            Keep school onboarding, teacher invitations and learner records clear while beta marketing tools stay hidden from standard users.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"><Button className="bg-[#c5a55a] text-[#0f1d2e] hover:bg-[#d4b468]">Start School Trial</Button></Link>
            <Link href="/contact"><Button variant="outline">Contact Us</Button></Link>
          </div>
        </div>
      </section>
    </ManagementLayout>
  );
}
