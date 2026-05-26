import { useState } from "react";
import { CheckCircle2, ChevronRight, Upload, Globe, Target, Palette, Plug, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workspaceConfig } from "./workspaceConfig";
import type { QualityMode } from "./types";

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS: Array<{ id: Step; icon: React.ComponentType<{ className?: string }>; label: string; subtitle: string }> = [
  { id: 1, icon: Globe, label: "Business Discovery", subtitle: "Tell your AI team about the business" },
  { id: 2, icon: Target, label: "Growth Targets", subtitle: "Set your marketing goals" },
  { id: 3, icon: Palette, label: "Brand & Creative", subtitle: "Define your voice and visual style" },
  { id: 4, icon: Plug, label: "Platform Connections", subtitle: "Connect your publishing channels" },
  { id: 5, icon: Zap, label: "AI Operating Mode", subtitle: "Choose how your AI team works" },
];

const PLATFORM_CARDS = [
  { id: "facebook-pages", label: "Facebook Pages", create: true, publish: true, monitor: true, ads: true },
  { id: "instagram-business", label: "Instagram Business", create: true, publish: true, monitor: true, ads: true },
  { id: "tiktok-business", label: "TikTok Business", create: true, publish: true, monitor: true, ads: false },
  { id: "youtube-shorts", label: "YouTube Shorts", create: true, publish: true, monitor: true, ads: false },
  { id: "youtube-long-form", label: "YouTube Long-form", create: true, publish: true, monitor: true, ads: false },
  { id: "linkedin-company-pages", label: "LinkedIn Company Pages", create: true, publish: true, monitor: true, ads: false },
  { id: "google-business-profile", label: "Google Business Profile", create: true, publish: true, monitor: true, ads: false },
  { id: "email", label: "Email", create: true, publish: true, monitor: true, ads: false },
  { id: "blog-seo", label: "Blog / SEO", create: true, publish: false, monitor: false, ads: false },
];

const AI_MODES = [
  { id: "safe", label: "Safe Mode", description: "All content requires manual approval before anything moves forward.", color: "bg-stone-100 border-stone-300 text-stone-800" },
  { id: "assisted", label: "Assisted Mode", description: "AI creates drafts and queues them for your review on a daily digest.", color: "bg-violet-50 border-violet-300 text-violet-800" },
  { id: "growth", label: "Growth Mode", description: "AI operates as your full marketing team, handling creation and scheduling.", color: "bg-emerald-50 border-emerald-300 text-emerald-800" },
];

export function WorkspaceSetupWizard({ quality, onQualityChange, onComplete }: { quality: QualityMode; onQualityChange: (q: QualityMode) => void; onComplete: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [aiMode, setAiMode] = useState<"safe" | "assisted" | "growth">("assisted");
  const [approvalRequired, setApprovalRequired] = useState(true);

  function next() {
    if (step < 5) setStep((s) => (s + 1) as Step);
    else onComplete();
  }
  function back() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  return (
    <section className="min-h-screen rounded-3xl bg-gradient-to-br from-[#faf8f4] to-[#f0ece4] p-6 md:p-10" aria-label="Workspace Setup Wizard">
      {/* Progress header */}
      <div className="mb-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const done = s.id < step;
            const active = s.id === step;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={`Step ${s.id}: ${s.label}`}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${active ? "bg-[#1a1a1a] text-white shadow-md" : done ? "bg-emerald-100 text-emerald-800" : "bg-white/70 text-stone-500 border border-stone-200"}`}
                onClick={() => s.id < step && setStep(s.id)}
              >
                {done ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
                <span className="hidden sm:inline">{s.label}</span>
                <span className="inline sm:hidden">{s.id}</span>
              </button>
            );
          })}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-500"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-2xl">
        {step === 1 && <StepBusinessDiscovery appName={workspaceConfig.appName} />}
        {step === 2 && <StepGrowthTargets goals={workspaceConfig.defaultGoals} />}
        {step === 3 && <StepBrandCreative />}
        {step === 4 && <StepPlatformConnections />}
        {step === 5 && (
          <StepAIOperatingMode
            aiMode={aiMode}
            setAiMode={setAiMode}
            quality={quality}
            onQualityChange={onQualityChange}
            approvalRequired={approvalRequired}
            setApprovalRequired={setApprovalRequired}
          />
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full text-stone-600 hover:bg-stone-100"
            onClick={back}
            disabled={step === 1}
          >
            Back
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[#1a1a1a] px-8 py-2.5 text-white hover:bg-[#2d2d2d] focus:outline-none focus:ring-2 focus:ring-violet-400"
            onClick={next}
          >
            {step === 5 ? "Start creating" : "Continue"}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function StepBusinessDiscovery({ appName }: { appName: string }) {
  return (
    <div className="space-y-5">
      <StepHeader step={1} title="Tell your AI team about the business" description={`Training your AI marketing team to represent ${appName} accurately.`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website URL" placeholder="https://yourwebsite.com" />
        <Field label="Business / app name" placeholder={appName} />
        <Field label="Industry" placeholder="Equestrian management" />
        <Field label="Country" placeholder="United Kingdom" />
      </div>
      <Field label="What do you sell?" placeholder="Stable management and riding school software" />
      <Field label="Who do you help?" placeholder="Stable owners, riding school operators, horse owners" />
      <Field label="Main offer" placeholder="Free 14-day trial, no card required" />
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
        <p className="mb-2 text-sm font-semibold text-violet-800">Scan website / Learn my business</p>
        <p className="mb-3 text-xs text-violet-600">Paste your URL and your AI team will learn your product automatically.</p>
        <div className="flex gap-2">
          <Input className="rounded-xl border-violet-200 bg-white text-stone-800" placeholder="https://yourwebsite.com" />
          <Button type="button" className="shrink-0 rounded-xl bg-violet-600 text-white hover:bg-violet-700">Scan</Button>
        </div>
        <p className="mt-2 text-xs text-violet-400">Live scanning coming soon. Your AI team will auto-populate your brand details.</p>
      </div>
    </div>
  );
}

function StepGrowthTargets({ goals }: { goals: string[] }) {
  return (
    <div className="space-y-5">
      <StepHeader step={2} title="Set your marketing goals" description="Your AI team uses these targets to prioritise content and campaigns." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Monthly signup target" placeholder="e.g. 50 signups" type="number" />
        <Field label="Lead target" placeholder="e.g. 200 leads" type="number" />
        <Field label="Follower growth target" placeholder="e.g. 500 new followers" type="number" />
        <Field label="Engagement rate target" placeholder="e.g. 5%" />
        <Field label="Revenue / sales target" placeholder="e.g. £5,000 MRR" />
        <Field label="Main growth goal" placeholder="Choose or type your primary goal" />
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-stone-700">Quick goal examples</p>
        <div className="flex flex-wrap gap-2">
          {goals.map((goal) => (
            <Badge key={goal} className="cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-normal text-stone-700 hover:bg-stone-50">
              {goal}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepBrandCreative() {
  return (
    <div className="space-y-5">
      <StepHeader step={3} title="Define your brand voice and visual style" description="Your AI team will match your tone and creative style in every piece of content." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand tone" placeholder="e.g. warm, professional, bold" />
        <Field label="Visual style" placeholder="e.g. premium, minimal, energetic" />
        <Field label="CTA style" placeholder="e.g. direct, soft invite, urgency-led" />
        <Field label="Content personality" placeholder="e.g. expert, relatable, aspirational" />
      </div>
      <Field label="Compliance rules" placeholder="Any claims or phrases to avoid" />
      <div className="grid gap-3 sm:grid-cols-3">
        <UploadCard label="Upload logo" icon="🖼️" />
        <UploadCard label="Upload media" icon="🎬" />
        <UploadCard label="Upload brand pack" icon="📦" />
      </div>
    </div>
  );
}

function StepPlatformConnections() {
  return (
    <div className="space-y-5">
      <StepHeader step={4} title="Connect your publishing channels" description="Your AI team will create content for every connected platform." />
      <div className="grid gap-3 sm:grid-cols-2">
        {PLATFORM_CARDS.map((p) => (
          <article key={p.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-800">{p.label}</h3>
              <Badge className="rounded-full bg-stone-100 text-stone-500 text-xs">Not connected</Badge>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-stone-500">
              {p.create && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Create</span>}
              {p.publish && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">Publish</span>}
              {p.monitor && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">Monitor</span>}
              {p.ads && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Ads</span>}
            </div>
            <Button type="button" size="sm" className="w-full rounded-xl bg-stone-800 text-white hover:bg-stone-900">
              Connect
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}

function StepAIOperatingMode({
  aiMode, setAiMode, quality, onQualityChange, approvalRequired, setApprovalRequired,
}: {
  aiMode: "safe" | "assisted" | "growth";
  setAiMode: (m: "safe" | "assisted" | "growth") => void;
  quality: QualityMode;
  onQualityChange: (q: QualityMode) => void;
  approvalRequired: boolean;
  setApprovalRequired: (v: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader step={5} title="Choose how your AI team works" description="You can change this at any time from your workspace settings." />
      <div className="space-y-3">
        {AI_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            aria-pressed={aiMode === mode.id}
            className={`w-full rounded-2xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${aiMode === mode.id ? mode.color + " border-current shadow-md" : "border-stone-200 bg-white hover:border-stone-300"}`}
            onClick={() => setAiMode(mode.id as "safe" | "assisted" | "growth")}
          >
            <p className="font-semibold">{mode.label}</p>
            <p className="mt-1 text-sm opacity-75">{mode.description}</p>
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-stone-800">Content quality</p>
        <div className="flex gap-2">
          {(["standard", "elite"] as const).map((q) => (
            <button
              key={q}
              type="button"
              aria-pressed={quality === q}
              className={`rounded-xl px-5 py-2 text-sm font-medium capitalize transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${quality === q ? "bg-[#1a1a1a] text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
              onClick={() => onQualityChange(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-stone-800">Require approval before publishing</p>
            <p className="text-xs text-stone-500">Your AI team will always ask before any content goes live.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={approvalRequired}
            className={`relative h-6 w-11 rounded-full transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${approvalRequired ? "bg-emerald-500" : "bg-stone-300"}`}
            onClick={() => setApprovalRequired(!approvalRequired)}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${approvalRequired ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </label>
      </div>
    </div>
  );
}

function StepHeader({ step, title, description }: { step: Step; title: string; description: string }) {
  return (
    <div className="mb-2">
      <Badge className="mb-3 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
        Step {step} of 5
      </Badge>
      <h2 className="text-2xl font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-sm text-stone-500">{description}</p>
    </div>
  );
}

function Field({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      <Input type={type} placeholder={placeholder} className="rounded-xl border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:ring-violet-400" />
    </label>
  );
}

function UploadCard({ label, icon }: { label: string; icon: string }) {
  return (
    <button
      type="button"
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 bg-white p-5 text-center hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
      aria-label={label}
    >
      <Upload className="size-5 text-stone-400" />
      <span className="text-xs font-medium text-stone-600">{label}</span>
    </button>
  );
}
