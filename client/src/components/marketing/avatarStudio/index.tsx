import { Badge } from "@/components/ui/badge";
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
};

export const PREBUILT_PRESENTERS: PresenterProfile[] = [
  {
    name: "Ava - Premium Stable Advisor",
    voice: "Warm female",
    accent: "British",
    style: "Modern studio",
    personality: "Calm, authoritative",
    outfit: "Navy blazer",
    tone: "Professional",
    pacing: "Balanced",
  },
  {
    name: "Noah - Growth Coach",
    voice: "Confident male",
    accent: "British",
    style: "Lifestyle",
    personality: "Energetic, practical",
    outfit: "Smart-casual",
    tone: "Motivational",
    pacing: "Fast",
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
          <CardTitle className="text-base">Avatar Studio</CardTitle>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prebuilt presenters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {PREBUILT_PRESENTERS.map((presenter) => (
            <button
              key={presenter.name}
              type="button"
              onClick={() => onChange(presenter)}
              className="rounded-xl border p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <p className="font-semibold">{presenter.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{presenter.voice} · {presenter.accent} · {presenter.style}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline">{presenter.tone}</Badge>
                <Badge variant="outline">{presenter.pacing}</Badge>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
