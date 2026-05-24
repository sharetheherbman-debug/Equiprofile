import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import {
  BookOpen,
  GraduationCap,
  TrendingUp,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  Star,
  ArrowRight,
  CheckCircle2,
  Play,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const stats = [
  { value: "15", label: "Learning Pathways" },
  { value: "4", label: "Progressive Levels" },
  { value: "Structured", label: "Curriculum System" },
  { value: "Complete", label: "School Management" },
];

const steps = [
  {
    step: "01",
    title: "Enrol",
    description:
      "Register your school and add students in minutes. Invite teachers and configure your curriculum with our guided setup.",
    icon: Users,
  },
  {
    step: "02",
    title: "Learn",
    description:
      "Students follow structured lessons across 15 pathways, from beginner groundwork to advanced dressage and jumping.",
    icon: BookOpen,
  },
  {
    step: "03",
    title: "Progress",
    description:
      "Track every milestone with detailed reports. Watch students advance through levels and celebrate their achievements.",
    icon: TrendingUp,
  },
];

const features = [
  {
    icon: BookOpen,
    title: "Structured Lessons",
    description:
      "Expertly crafted lesson plans aligned with BHS and Pony Club standards, ensuring consistent quality.",
  },
  {
    icon: GraduationCap,
    title: "Progressive Pathways",
    description:
      "15 distinct learning pathways spanning 4 levels, guiding students from first steps to mastery.",
  },
  {
    icon: ClipboardCheck,
    title: "Assignments & Practice",
    description:
      "Set assignments, track completion, and reinforce learning between lessons with structured practice tasks.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Visual dashboards showing student progression, skill mastery, and areas needing attention.",
  },
  {
    icon: Settings,
    title: "Teacher Tools",
    description:
      "Powerful tools for lesson planning, student assessment, attendance tracking, and parent communication.",
  },
  {
    icon: Users,
    title: "School Management",
    description:
      "Manage students, instructors, schedules, and billing from one unified platform built for riding schools.",
  },
];

const testimonials = [
  {
    quote:
      "EquiProfile School has completely transformed how we run our riding lessons. Students are more engaged and parents love the progress reports.",
    name: "Sarah Thompson",
    role: "Head Instructor, Meadow Vale Equestrian",
    rating: 5,
  },
  {
    quote:
      "The structured pathways gave our students clear goals. Lesson retention improved noticeably once students could see their own progress.",
    name: "James Whitfield",
    role: "Owner, Bridlepath Riding Academy",
    rating: 5,
  },
  {
    quote:
      "Finally, a platform that understands equestrian education. The teacher tools alone save me hours every week.",
    name: "Emma Richardson",
    role: "Instructor, Greenfield Stables",
    rating: 5,
  },
];

const benefits = [
  "Increase student retention with visible progress tracking",
  "Save instructor time with automated lesson planning tools",
  "Delight parents with detailed progress reports",
  "Scale your school with structured, repeatable curricula",
  "Meet BHS and Pony Club standards effortlessly",
  "Reduce admin overhead with unified school management",
];

export default function SchoolHome() {
  return (
    <SchoolLayout>
      {/* ───── Hero Section ───── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero/image4.jpg"
            alt="Equestrian education"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f]/90 via-[#1e4d8c]/80 to-[#2d6a4f]/70" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium mb-6">
                <GraduationCap className="w-4 h-4" />
                Built for Riding Schools
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
            >
              Premium Equestrian
              <br />
              <span className="text-[#10b981]">Learning Platform</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg sm:text-xl text-white/80 leading-relaxed mb-8 max-w-2xl"
            >
              Structured learning paths and progressive curricula designed for
              riding schools. Help your students advance from their first lesson
              to confident horsemanship — all tracked, measured, and celebrated.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-[#2d6a4f] hover:bg-[#236b45] text-white text-base px-8 py-6 rounded-xl shadow-lg shadow-[#2d6a4f]/30"
                >
                  Book a Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/features">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white border border-white/30 hover:bg-white/10 text-base px-8 py-6 rounded-xl"
                >
                  <Play className="mr-2 w-5 h-5" />
                  Explore Features
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───── Stats Bar ───── */}
      <section className="relative z-20 -mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.4 }}
                  className="text-center"
                >
                  <p className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] font-serif">
                    {stat.value}
                  </p>
                  <p className="text-sm text-[#1e293b]/60 mt-1">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section className="py-24 bg-[#f0f4f8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#2d6a4f]/10 text-[#2d6a4f] text-sm font-semibold mb-4">
              Simple Process
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1e293b] mb-4">
              How It Works
            </h2>
            <p className="text-[#1e293b]/60 max-w-2xl mx-auto text-lg">
              Getting started is easy. Three simple steps to transform your
              school's learning experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, idx) => (
              <motion.div
                key={step.title}
                {...fadeUp}
                transition={{ delay: idx * 0.15, duration: 0.5 }}
                className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#2d6a4f] to-[#1e4d8c] text-white shadow-lg">
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-5xl font-bold text-[#1e3a5f]/10 font-serif">
                    {step.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#1e293b] font-serif mb-3">
                  {step.title}
                </h3>
                <p className="text-[#1e293b]/60 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Features Grid ───── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] text-sm font-semibold mb-4">
              Platform Features
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1e293b] mb-4">
              Everything for Modern Equestrian Education
            </h2>
            <p className="text-[#1e293b]/60 max-w-2xl mx-auto text-lg">
              Built specifically for riding schools, our platform covers every
              aspect of equestrian teaching and learning.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                {...fadeUp}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className="group bg-[#f0f4f8] rounded-2xl p-7 hover:bg-white hover:shadow-lg border border-transparent hover:border-gray-100 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2d6a4f] to-[#1e4d8c] flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1e293b] font-serif mb-2">
                  {feature.title}
                </h3>
                <p className="text-[#1e293b]/60 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="text-center mt-12">
            <Link href="/features">
              <Button
                variant="outline"
                size="lg"
                className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white rounded-xl px-8"
              >
                View All Features
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ───── Testimonials ───── */}
      <section className="py-24 bg-gradient-to-br from-[#1e3a5f] to-[#1e4d8c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-white/90 text-sm font-semibold mb-4">
              Educator Voices
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for Schools Like Yours
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg">
              Representative feedback from instructors and school owners across the UK equestrian community.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((t, idx) => (
              <motion.div
                key={t.name}
                {...fadeUp}
                transition={{ delay: idx * 0.12, duration: 0.5 }}
                className="bg-white/[0.07] backdrop-blur-sm border border-white/10 rounded-2xl p-7"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-[#f59e0b] text-[#f59e0b]"
                    />
                  ))}
                </div>
                <p className="text-white/80 leading-relaxed mb-6 italic">
                  "{t.quote}"
                </p>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/50 text-sm">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── School Benefits Split ───── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#10b981]/10 text-[#10b981] text-sm font-semibold mb-4">
                Why Choose Us
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1e293b] mb-6">
                Built for Riding Schools,{" "}
                <span className="text-[#2d6a4f]">Not Adapted</span>
              </h2>
              <p className="text-[#1e293b]/60 text-lg mb-8 leading-relaxed">
                Unlike generic learning platforms, EquiProfile was designed from
                the ground up for equestrian education. Every feature, pathway,
                and tool reflects the real needs of riding schools.
              </p>
              <ul className="space-y-4 mb-8">
                {benefits.map((benefit, idx) => (
                  <motion.li
                    key={idx}
                    {...fadeUp}
                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#10b981] mt-0.5 shrink-0" />
                    <span className="text-[#1e293b]/70">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button
                  size="lg"
                  className="bg-[#2d6a4f] hover:bg-[#236b45] text-white rounded-xl px-8"
                >
                  View Pricing Plans
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/images/hero/image5.jpg"
                  alt="Equestrian school training"
                  className="w-full h-[500px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-5 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#10b981]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1e293b]">
                      Measurable
                    </p>
                    <p className="text-xs text-[#1e293b]/50">
                      Student Progress
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───── CTA Banner ───── */}
      <section className="py-20 bg-gradient-to-r from-[#2d6a4f] to-[#1e4d8c]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Transform Your School?
            </h2>
            <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
              Built for riding schools — deliver structured, trackable, and inspiring
              equestrian education from day one.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-white text-[#1e3a5f] hover:bg-white/90 text-base px-8 py-6 rounded-xl font-semibold shadow-lg"
                >
                  Book Your Free Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white border border-white/30 hover:bg-white/10 text-base px-8 py-6 rounded-xl"
                >
                  See Pricing
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </SchoolLayout>
  );
}
