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
            Run Your Stable with
            <br />
            <span className="text-[#c5a55a]">Clearer Operations</span>
          </>
        }
        subtitle="Built for livery yards and training stables: care records, reminders, team visibility and beta-ready growth surfaces."
      />
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-[#0f1d2e]/75 text-lg leading-relaxed">
            Use EquiProfile to keep horse care, staff tasks, contacts and reminders organized while Marketing Studio remains approval-first.
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
