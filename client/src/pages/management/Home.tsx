import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ManagementLayout } from "@/components/management/ManagementLayout";
import { MgmtCTASection } from "@/components/management/MgmtCTASection";
import type { LucideIcon } from "lucide-react";
import {
  HeartPulse,
  Dumbbell,
  Salad,
  FileText,
  CloudSun,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Users,
  ShieldCheck,
  Check,
  MapPin,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const platformStats: { icon: LucideIcon; value: string; label: string; sub: string }[] = [
  { icon: HeartPulse, value: "10+", label: "Health Modules", sub: "vet, farrier, dental & more" },
  { icon: ShieldCheck, value: "100%", label: "Encrypted", sub: "end-to-end data security" },
  { icon: MapPin, value: "1–50+", label: "Horses", sub: "solo owner to full yard" },
  { icon: Zap, value: "7-Day", label: "Free Trial", sub: "no credit card required" },
];

const features = [
  {
    icon: HeartPulse,
    title: "Health Records",
    desc: "Centralise veterinary visits, vaccinations and medical history in one secure timeline.",
    gradient: "from-rose-500 to-pink-600",
    accentColor: "#f43f5e",
  },
  {
    icon: Dumbbell,
    title: "Training Logs",
    desc: "Track sessions, monitor progress and plan workouts tailored to each horse.",
    gradient: "from-green-500 to-emerald-600",
    accentColor: "#10b981",
  },
  {
    icon: Salad,
    title: "Nutrition Plans",
    desc: "Build custom feeding schedules, log supplements and adjust diets with ease.",
    gradient: "from-lime-500 to-green-600",
    accentColor: "#84cc16",
  },
  {
    icon: FileText,
    title: "Document Storage",
    desc: "Keep passports, insurance and certificates organised and accessible anywhere.",
    gradient: "from-indigo-500 to-violet-600",
    accentColor: "#6366f1",
  },
  {
    icon: CloudSun,
    title: "Weather & Riding",
    desc: "Real-time forecasts matched to your location so you can plan the perfect ride.",
    gradient: "from-sky-500 to-blue-600",
    accentColor: "#0ea5e9",
  },
  {
    icon: BarChart3,
    title: "Insights & Reports",
    desc: "Beautiful dashboards and exportable reports to keep every stakeholder informed.",
    gradient: "from-amber-500 to-orange-600",
    accentColor: "#f59e0b",
  },
];

const whyPoints = [
  "All-in-one: health, training, feeding, scheduling and more",
  "Offline-capable — works even at remote yards with no signal",
  "Role-based team access — grooms, vets and managers",
  "Your data is encrypted and always yours to export",
];

const trustPrinciples = [
  {
    title: "Transparent beta",
    body: "We show what is ready, what is in progress, and what is intentionally disabled until it is proven safe.",
  },
  {
    title: "Data ownership",
    body: "Your horse, care, training, and document records stay exportable and under your control.",
  },
  {
    title: "Built for yard work",
    body: "The product focuses on practical care routines, reminders, logs, and team visibility before flashy claims.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
  return (
    <ManagementLayout hidePreFooterCta>
      <div className="min-h-screen">

        {/*
          ======================== HERO ========================
          NOTE: The Home page intentionally keeps its own full-screen hero.
          It is NOT refactored to use MgmtHero because it is fundamentally
          different from the inner pages:
            - Full 96vh height (vs 460-580px for inner pages)
            - Animated eyebrow pill with live indicator (vs gold badge)
            - Very large title (80px) with gradient text animation
            - Dual CTA buttons + trust strip
            - Fades into a dark stats section (not a light section)
          Inner pages (Features, Pricing, About, Contact) use MgmtHero.
        */}
        <section className="relative min-h-[96vh] flex items-center overflow-hidden">
          <img
            src="/images/management/landingV3.jpg"
            alt="Professional equine management — stables and horses"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Deep layered overlay — school-aligned dark palette */}
          <div className="mgmt-hero-overlay" />

          {/* Subtle decorative accent */}
          <div className="absolute top-28 left-8 w-32 h-32 rounded-full bg-[#c5a55a]/5 blur-3xl pointer-events-none" />

          <div className="relative z-10 container mx-auto px-4 pt-32 pb-28 text-center">
            {/* Eyebrow pill */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-full px-5 py-2 text-sm text-white/80 font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c5a55a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c5a55a]" />
              </span>
              Professional equine management platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-bold font-serif text-white leading-[1.08] tracking-tight max-w-5xl mx-auto"
            >
              Professional Horse
              <br />
              <span className="bg-gradient-to-r from-[#c5a55a] via-[#e8d08a] to-[#c5a55a] bg-clip-text text-transparent animate-gradient">
                Management Software
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.28 }}
              className="mt-7 text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed"
            >
              The all-in-one platform for trainers, owners and stables to
              manage health records, training logs, reminders and yard workflows.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.42 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-[#c5a55a] hover:bg-[#d4b468] text-[#0f1d2e] font-bold px-10 h-13 text-base rounded-full shadow-2xl shadow-[#c5a55a]/30 border-0 transition-all duration-200 hover:shadow-[#c5a55a]/45 hover:-translate-y-0.5 group"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link href="/features">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/[0.08] hover:border-white/35 px-8 h-13 text-base rounded-full backdrop-blur-sm transition-all duration-200"
                >
                  See All Features
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.62 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            >
              {[
                { icon: ShieldCheck, text: "7-day free trial" },
                { icon: Zap, text: "No credit card required" },
                { icon: MapPin, text: "Built for real yard workflows" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5 text-xs text-white/45 font-medium tracking-wide">
                  <Icon className="w-3 h-3 text-[#c5a55a]/70" />
                  {text}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Bottom fade — dark neutral vignette to transition into stats section */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
        </section>

        {/* ====================== PLATFORM STATS ====================== */}
        <section className="relative bg-[#162d4a] pb-20 pt-4">
          <div className="container mx-auto px-4">
            {/* Decorative top separator */}
            <div className="w-full max-w-3xl mx-auto h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-12" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.06] max-w-5xl mx-auto">
              {platformStats.map((s, i) => (
                <AnimatedSection key={s.label} delay={i * 0.08}>
                  <div className="flex flex-col items-center text-center px-6 py-8 bg-[#162d4a] hover:bg-white/[0.03] transition-colors duration-300 group h-full">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#c5a55a]/10 border border-[#c5a55a]/20 mb-4 group-hover:bg-[#c5a55a]/15 transition-colors">
                      <s.icon className="w-4 h-4 text-[#c5a55a]/80" />
                    </div>
                    <p className="text-3xl md:text-4xl font-bold font-serif bg-gradient-to-r from-[#c5a55a] to-[#e8d08a] bg-clip-text text-transparent leading-none">
                      {s.value}
                    </p>
                    <p className="text-white/80 font-semibold mt-2 text-sm md:text-base">{s.label}</p>
                    <p className="text-white/30 text-[11px] mt-1 tracking-wide">{s.sub}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>

        </section>

        {/* ==================== FEATURES GRID ==================== */}
        <section className="bg-[#f8f9fb] py-24 md:py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 bg-[#1a7a6d]/8 rounded-full px-4 py-1.5 text-sm font-semibold text-[#1a7a6d] tracking-widest uppercase mb-4">
                Core Capabilities
              </div>
              <h2 className="text-3xl md:text-[42px] font-bold font-serif text-[#0f1d2e] leading-tight">
                Everything you need,
                <br />
                <span className="text-[#1a7a6d]">nothing you don't</span>
              </h2>
              <p className="mt-5 text-[#0f1d2e]/55 text-lg max-w-xl mx-auto">
                Purpose-built modules designed by equestrians, for equestrians — covering every aspect of modern horse management.
              </p>
            </AnimatedSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7 max-w-6xl mx-auto">
              {features.map((f, i) => (
                <AnimatedSection key={f.title} delay={i * 0.07}>
                  <div
                    className="group relative rounded-2xl border border-[#0f1d2e]/6 bg-white overflow-hidden h-full transition-all duration-300 hover:shadow-2xl hover:shadow-[#2e6da4]/7 hover:-translate-y-2"
                    style={{ boxShadow: "0 2px 12px -4px rgba(15,29,46,0.08)" }}
                  >
                    {/* Colored accent top strip */}
                    <div
                      className={`h-1 w-full bg-gradient-to-r ${f.gradient} opacity-80 group-hover:opacity-100 transition-opacity`}
                    />
                    <div className="p-8">
                      <div className={`relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${f.gradient} text-white mb-6 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                        <f.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold font-serif text-[#0f1d2e] mb-3">
                        {f.title}
                      </h3>
                      <p className="text-[#0f1d2e]/55 leading-relaxed text-[15px]">{f.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection delay={0.3} className="text-center mt-12">
              <Link href="/features">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full border-[#2e6da4]/25 text-[#2e6da4] hover:bg-[#2e6da4]/5 hover:border-[#2e6da4]/45 px-10 h-12 font-semibold"
                >
                  Explore all features
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* ================== WHY EQUIPROFILE ================== */}
        <section className="bg-[#1e3a5f] py-20 md:py-28 overflow-hidden border-t border-white/[0.04]">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
              <AnimatedSection>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                  <img
                    src="/images/management/bones64-stable-1683924_1280.jpg"
                    alt="Horse stable corridor with rows of wooden stalls"
                    loading="lazy"
                    className="w-full h-[380px] md:h-[500px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/8 rounded-2xl pointer-events-none" />
                  {/* Corner accent */}
                  <div className="absolute top-4 right-4 bg-[#c5a55a]/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <span className="text-[11px] font-bold text-[#0f1d2e] tracking-wider uppercase">Made for Yards</span>
                  </div>
                </div>
              </AnimatedSection>

              <AnimatedSection delay={0.15}>
                <p className="text-sm font-bold tracking-widest uppercase text-[#c5a55a] mb-4">
                  Why EquiProfile
                </p>
                <h2 className="text-3xl md:text-4xl font-bold font-serif text-white leading-tight">
                  Built for care routines.
                  <br />
                  Designed for yards.
                </h2>
                <p className="mt-6 text-white/50 leading-relaxed text-lg">
                  We started EquiProfile because no tool on the market truly
                  understood the daily reality of horse care. From morning feeds
                  to competition prep, every feature is shaped around practical
                  stable workflows and beta-user feedback.
                </p>
                <ul className="mt-8 space-y-3.5">
                  {whyPoints.map((item) => (
                    <li key={item} className="flex items-start gap-3.5 text-white/70">
                      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#1a7a6d]/25 border border-[#1a7a6d]/60 flex items-center justify-center">
                        <Check className="w-3 h-3 text-[#4eca9d]" />
                      </span>
                      <span className="text-[15px]">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col sm:flex-row gap-3 mt-10">
                  <Link href="/about">
                    <Button className="bg-[#c5a55a] hover:bg-[#d4b468] text-[#0f1d2e] font-bold rounded-full px-7 transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-[#c5a55a]/20">
                      Our Story
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/features">
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/8 rounded-full px-7">
                      All Features
                    </Button>
                  </Link>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* =================== TRUST PRINCIPLES =================== */}
        <section className="relative bg-[#f8f9fb] py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(46,109,164,0.06)_0%,_transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(26,122,109,0.05)_0%,_transparent_60%)] pointer-events-none" />

          <div className="relative container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 bg-[#2e6da4]/8 rounded-full px-4 py-1.5 text-sm font-semibold text-[#2e6da4] tracking-widest uppercase mb-4">
                Trust & Readiness
              </div>
              <h2 className="text-3xl md:text-[42px] font-bold font-serif text-[#0f1d2e] leading-tight">
                Clear, practical, beta-ready
              </h2>
              <p className="mt-4 text-[#0f1d2e]/50 text-lg">
                No fake testimonials, no fake partnerships, and no hidden claims.
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
              {trustPrinciples.map((item, i) => (
                <AnimatedSection key={item.title} delay={i * 0.1}>
                  <div className="relative bg-white rounded-2xl p-8 border border-[#0f1d2e]/5 h-full flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-[#2e6da4]/8 hover:-translate-y-2 group"
                    style={{ boxShadow: "0 2px 16px -4px rgba(15,29,46,0.07)" }}
                  >
                    <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#c5a55a]/50 to-transparent rounded-full group-hover:via-[#c5a55a]/80 transition-colors" />
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#2e6da4]/10 text-[#2e6da4]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold font-serif text-[#0f1d2e]">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-[#0f1d2e]/65 leading-relaxed flex-1 text-[15px]">
                      {item.body}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== CTA BANNER ===================== */}
        <MgmtCTASection
          eyebrow="Start today"
          heading={
            <>
              Ready to elevate your
              <br />
              horse management?
            </>
          }
          body="The platform built for equestrians who take horse care seriously. Start your free 7-day trial — no credit card required."
          primaryCta={{ label: "Start Free Trial", href: "/register" }}
          secondaryCta={{ label: "View Pricing", href: "/pricing" }}
          trustItems={[
            "No credit card required",
            "Cancel anytime",
            "Full feature access during trial",
          ]}
        />
      </div>
    </ManagementLayout>
  );
}
