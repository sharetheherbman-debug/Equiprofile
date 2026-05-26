import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PresenterProfile = {
  name: string;
  voice: string;
  accent: string;
  style: string;
  personality: string;
  outfit: string;
  tone: string;
  pacing: string;
  bestUse?: string;
  status?: string;
};

export const PREBUILT_PRESENTERS: PresenterProfile[] = [
  {
    name: "Stable Growth Coach",
    voice: "Warm professional",
    accent: "British",
    style: "Modern stable office",
    personality: "Practical, reassuring, commercially sharp",
    outfit: "Navy blazer",
    tone: "Helpful expert",
    pacing: "Balanced",
    bestUse: "Lead generation reels and stable owner education",
    status: "Script-ready",
  },
  {
    name: "Riding School Advisor",
    voice: "Clear instructor",
    accent: "British",
    style: "Riding school setting",
    personality: "Organised, encouraging, parent-friendly",
    outfit: "Smart yard jacket",
    tone: "Clear and trusted",
    pacing: "Measured",
    bestUse: "Lesson operations, parent communication and school campaigns",
    status: "Script-ready",
  },
  {
    name: "Calm Professional Presenter",
    voice: "Calm neutral",
    accent: "British",
    style: "Clean studio",
    personality: "Measured, credible, precise",
    outfit: "Charcoal knit and blazer",
    tone: "Premium SaaS",
    pacing: "Calm",
    bestUse: "LinkedIn posts, product explainers and founder-led updates",
    status: "Script-ready",
  },
  {
    name: "Premium Brand Host",
    voice: "Polished host",
    accent: "British",
    style: "Premium equestrian brand",
    personality: "Confident, warm, concise",
    outfit: "Tailored navy coat",
    tone: "Premium but approachable",
    pacing: "Balanced",
    bestUse: "Launch campaigns, email hero scripts and platform packs",
    status: "Script-ready",
  },
];

export function AvatarStudioFields({
  profile,
  onChange,
}: {
  profile: PresenterProfile;
  onChange: (profile: PresenterProfile) => void;
}) {
  const setField = <K extends keyof PresenterProfile>(key: K, value: PresenterProfile[K]) => {
    onChange({ ...profile, [key]: value });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presenter Library</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Presenter/avatar</Label>
            <Input value={profile.name} onChange={(event) => setField("name", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Voice</Label>
            <Input value={profile.voice} onChange={(event) => setField("voice", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Accent</Label>
            <Input value={profile.accent} onChange={(event) => setField("accent", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Style</Label>
            <Input value={profile.style} onChange={(event) => setField("style", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Personality</Label>
            <Input value={profile.personality} onChange={(event) => setField("personality", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Outfit/look</Label>
            <Input value={profile.outfit} onChange={(event) => setField("outfit", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tone</Label>
            <Input value={profile.tone} onChange={(event) => setField("tone", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pacing</Label>
            <Input value={profile.pacing} onChange={(event) => setField("pacing", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Presenter consistency note</Label>
            <Textarea
              rows={3}
              value={`${profile.name} | ${profile.voice} | ${profile.accent} | ${profile.style} | ${profile.personality} | ${profile.outfit}`}
              readOnly
            />
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 md:col-span-2">
            Avatar script ready. Avatar video setup needed before playable presenter video can be generated.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preset presenters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {PREBUILT_PRESENTERS.map((presenter) => (
            <div
              key={presenter.name}
              className="rounded-xl border p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <p className="font-semibold">{presenter.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{presenter.voice} / {presenter.accent} / {presenter.style}</p>
              <p className="mt-2 text-xs text-muted-foreground">{presenter.bestUse}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline">{presenter.tone}</Badge>
                <Badge variant="outline">{presenter.pacing}</Badge>
                <Badge variant="secondary">{presenter.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onChange(presenter)}>Use presenter</Button>
                <Button size="sm" variant="outline" onClick={() => onChange(presenter)}>Edit presenter</Button>
                <Button size="sm" variant="outline" disabled>Generate avatar script</Button>
                <Button size="sm" variant="outline" disabled>Generate avatar video</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
