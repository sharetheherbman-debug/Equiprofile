import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ManagementLayout } from "@/components/management/ManagementLayout";
import { MgmtHero } from "@/components/management/MgmtHero";

export default function AcademyLanding() {
  return (
    <ManagementLayout>
      <MgmtHero
        imageSrc="/images/hero/image4.jpg"
        imageAlt="Equestrian academy onboarding"
        eyebrow="Academy Funnel"
        title={
          <>
            Academy Onboarding Built for
            <br />
            <span className="text-[#c5a55a]">Activation and Retention</span>
          </>
        }
        subtitle="Guide learners with checklist-led onboarding and structured progress tracking. No accreditation claims are made."
      />
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[#0f1d2e]/75 text-lg leading-relaxed">
            Foundation-ready academy onboarding with clear learner progress and teacher visibility.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"><Button className="bg-[#c5a55a] text-[#0f1d2e] hover:bg-[#d4b468]">Start Free Trial</Button></Link>
            <a href="https://school.equiprofile.online" className="inline-flex"><Button variant="outline">Visit Academy Site</Button></a>
          </div>
        </div>
      </section>
    </ManagementLayout>
  );
}
