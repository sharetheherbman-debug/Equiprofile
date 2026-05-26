import { useState } from "react";
import { Upload, Mic, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * PresenterLibrary — canonical presenter/avatar system for Marketing Studio.
 *
 * Supports:
 * - Pre-created presenters (dynamically extensible for future AI-driven model discovery)
 * - Custom presenter upload flow
 *
 * No provider names, model names, or internal AI labels are exposed here.
 * Quality is shown as Standard / Elite only.
 */

type PresenterTier = "standard" | "elite";

interface Presenter {
  id: string;
  name: string;
  role: string;
  voiceStyle: string;
  accent: string;
  personality: string;
  energy: "calm" | "warm" | "energetic" | "bold";
  bestUse: string;
  tier: PresenterTier;
  avatarPlaceholder: string;
}

const PRE_CREATED_PRESENTERS: Presenter[] = [
  {
    id: "growth-coach",
    name: "Growth Coach",
    role: "Lead generation and campaign host",
    voiceStyle: "Warm UK advisor",
    accent: "British English",
    personality: "Practical, encouraging, results-focused",
    energy: "warm",
    bestUse: "Lead generation reels, campaign launches, testimonials",
    tier: "elite",
    avatarPlaceholder: "GC",
  },
  {
    id: "school-advisor",
    name: "School Advisor",
    role: "Education and enrolment guide",
    voiceStyle: "Clear and encouraging",
    accent: "Neutral British",
    personality: "Helpful, warm, authoritative",
    energy: "warm",
    bestUse: "Academy promos, onboarding, student welcome videos",
    tier: "standard",
    avatarPlaceholder: "SA",
  },
  {
    id: "calm-professional",
    name: "Calm Professional",
    role: "Operations and feature explainer",
    voiceStyle: "Measured and expert",
    accent: "Neutral English",
    personality: "Premium, polished, trustworthy",
    energy: "calm",
    bestUse: "Feature demos, explainer videos, case studies",
    tier: "elite",
    avatarPlaceholder: "CP",
  },
  {
    id: "premium-host",
    name: "Premium Brand Host",
    role: "Authority and brand presenter",
    voiceStyle: "Confident and refined",
    accent: "RP / Standard British",
    personality: "Cinematic, aspirational, commanding",
    energy: "bold",
    bestUse: "Hero videos, launch moments, brand campaigns",
    tier: "elite",
    avatarPlaceholder: "PH",
  },
];

const ENERGY_LABELS: Record<Presenter["energy"], string> = {
  calm: "Calm & measured",
  warm: "Warm & inviting",
  energetic: "Energetic & bright",
  bold: "Bold & confident",
};

export function PresenterLibrary({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [tab, setTab] = useState<"pre-created" | "custom">("pre-created");
  const [showCustomForm, setShowCustomForm] = useState(false);

  return (
    <section className="space-y-4" aria-label="Presenter Library">
      {/* Tab switcher */}
      <div className="flex gap-2 rounded-2xl bg-stone-100 p-1">
        <TabButton label="Presenters" icon={<Users className="size-4" />} active={tab === "pre-created"} onClick={() => setTab("pre-created")} />
        <TabButton label="Custom presenter" icon={<Upload className="size-4" />} active={tab === "custom"} onClick={() => setTab("custom")} />
      </div>

      {tab === "pre-created" && (
        <div className="space-y-3">
          {PRE_CREATED_PRESENTERS.map((presenter) => (
            <PresenterCard
              key={presenter.id}
              presenter={presenter}
              selected={selectedId === presenter.id}
              onSelect={onSelect}
            />
          ))}
          <p className="text-center text-xs text-stone-400">More presenters will be added as new styles become available.</p>
        </div>
      )}

      {tab === "custom" && (
        <CustomPresenterFlow show={showCustomForm} onStart={() => setShowCustomForm(true)} />
      )}
    </section>
  );
}

function PresenterCard({ presenter, selected, onSelect }: { presenter: Presenter; selected: boolean; onSelect?: (id: string) => void }) {
  return (
    <article
      className={`rounded-2xl border-2 bg-white p-4 shadow-sm transition ${selected ? "border-violet-400 shadow-violet-100" : "border-stone-200 hover:border-stone-300"}`}
      aria-label={`Presenter: ${presenter.name}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar placeholder */}
        <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${presenter.tier === "elite" ? "bg-gradient-to-br from-violet-500 to-violet-700" : "bg-gradient-to-br from-stone-500 to-stone-700"}`}>
          {presenter.avatarPlaceholder}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-stone-900">{presenter.name}</h3>
              <p className="text-sm text-stone-500">{presenter.role}</p>
            </div>
            <div className="flex items-center gap-2">
              {presenter.tier === "elite" && (
                <Badge className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 border border-amber-200">
                  <Star className="mr-1 size-3" />
                  Elite
                </Badge>
              )}
              {selected && <Badge className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">Selected</Badge>}
            </div>
          </div>
          <div className="mt-3 grid gap-1.5 text-xs text-stone-500 sm:grid-cols-2">
            <span><span className="font-medium text-stone-700">Voice:</span> {presenter.voiceStyle}</span>
            <span><span className="font-medium text-stone-700">Accent:</span> {presenter.accent}</span>
            <span><span className="font-medium text-stone-700">Energy:</span> {ENERGY_LABELS[presenter.energy]}</span>
            <span><span className="font-medium text-stone-700">Best for:</span> {presenter.bestUse}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-stone-900 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
              onClick={() => onSelect?.(presenter.id)}
              aria-pressed={selected}
            >
              {selected ? "Selected" : "Use presenter"}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-xl border-stone-200 text-stone-600 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400">
              Preview voice
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function CustomPresenterFlow({ show, onStart }: { show: boolean; onStart: () => void }) {
  if (!show) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-8 text-center">
        <Upload className="mx-auto mb-3 size-8 text-stone-400" />
        <h3 className="font-semibold text-stone-800">Create your own presenter</h3>
        <p className="mt-2 text-sm text-stone-500">Upload a reference image and we'll build a custom presenter for your brand.</p>
        <Button type="button" className="mt-4 rounded-xl bg-stone-900 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400" onClick={onStart}>
          Start custom presenter
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm" aria-label="Custom presenter creation form">
      <h3 className="font-semibold text-stone-800">Create your custom presenter</h3>

      {/* Upload area */}
      <button
        type="button"
        className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-6 text-center hover:border-violet-300 hover:bg-violet-50 transition focus:outline-none focus:ring-2 focus:ring-violet-400"
        aria-label="Upload reference image for custom presenter"
      >
        <Upload className="size-6 text-stone-400" />
        <span className="text-sm font-medium text-stone-600">Upload reference image</span>
        <span className="text-xs text-stone-400">PNG, JPG or WEBP · max 10MB</span>
      </button>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Presenter name</span>
          <Input className="rounded-xl border-stone-200" placeholder="e.g. Alex, Jordan" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Accent</span>
          <Input className="rounded-xl border-stone-200" placeholder="e.g. British English" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Energy style</span>
          <Input className="rounded-xl border-stone-200" placeholder="e.g. calm, warm, energetic" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Outfit / style notes</span>
          <Input className="rounded-xl border-stone-200" placeholder="e.g. smart casual, premium suit" />
        </label>
      </div>

      {/* Voice sample upload */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center gap-3">
          <Mic className="size-5 text-stone-400" />
          <div>
            <p className="text-sm font-medium text-stone-700">Upload voice sample (optional)</p>
            <p className="text-xs text-stone-400">MP3 or WAV · Used to match your presenter's voice style</p>
          </div>
          <Button type="button" size="sm" variant="outline" className="ml-auto shrink-0 rounded-xl border-stone-200 text-stone-600">
            Upload
          </Button>
        </div>
      </div>

      <Button type="button" className="w-full rounded-xl bg-stone-900 text-white hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
        Save presenter
      </Button>
    </div>
  );
}

function TabButton({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 ${active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
