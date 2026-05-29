import React from "react";

interface BrandKitDraft {
  id?: number;
  brandName: string;
  domain: string;
  primaryCta: string;
  toneOfVoice: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  overlayTemplate: "lower_third" | "corner_logo" | "end_card" | "social_reel" | "youtube_landscape";
  logoAssetId: number | null;
  logoUrl: string | null;
  defaultAspectRatio: string;
}

export function BrandOverlayStep({
  isAvailable = false,
  kit,
  templates,
  imageAssets,
  onPatch,
  onSelectLogo,
  onSave,
  isSaving,
}: {
  isAvailable?: boolean;
  kit: BrandKitDraft;
  templates: string[];
  imageAssets: Array<{ id: number; publicUrl?: string | null; generationPrompt?: string | null }>;
  onPatch: (patch: Partial<BrandKitDraft>) => void;
  onSelectLogo: (assetId: number) => void;
  onSave: () => void;
  isSaving?: boolean;
}) {
  if (!isAvailable) {
    return (
      <div className="space-y-4" data-testid="brand-overlay-step">
        <h3 className="font-semibold text-stone-800">Brand Overlay</h3>
        <p className="text-sm text-stone-500">Brand overlay backend is not ready yet. Export manually for now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="brand-overlay-step">
      <h3 className="font-semibold text-stone-800">Brand Kit</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input className="rounded-xl border border-stone-200 px-3 py-2 text-sm" value={kit.brandName} onChange={(event) => onPatch({ brandName: event.target.value })} placeholder="Brand name" />
        <input className="rounded-xl border border-stone-200 px-3 py-2 text-sm" value={kit.domain} onChange={(event) => onPatch({ domain: event.target.value })} placeholder="Domain" />
        <input className="rounded-xl border border-stone-200 px-3 py-2 text-sm" value={kit.primaryCta} onChange={(event) => onPatch({ primaryCta: event.target.value })} placeholder="Primary CTA" />
        <input className="rounded-xl border border-stone-200 px-3 py-2 text-sm" value={kit.toneOfVoice} onChange={(event) => onPatch({ toneOfVoice: event.target.value })} placeholder="Tone of voice" />
        <input className="rounded-xl border border-stone-200 px-3 py-2 text-sm" value={kit.primaryColor} onChange={(event) => onPatch({ primaryColor: event.target.value })} placeholder="Primary color" />
        <input className="rounded-xl border border-stone-200 px-3 py-2 text-sm" value={kit.secondaryColor} onChange={(event) => onPatch({ secondaryColor: event.target.value })} placeholder="Secondary color" />
        <input className="rounded-xl border border-stone-200 px-3 py-2 text-sm" value={kit.accentColor} onChange={(event) => onPatch({ accentColor: event.target.value })} placeholder="Accent color" />
        <select
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
          value={kit.overlayTemplate}
          onChange={(event) => onPatch({ overlayTemplate: event.target.value as BrandKitDraft["overlayTemplate"] })}
        >
          {templates.map((template) => <option key={template} value={template}>{template}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-stone-600">Logo asset</label>
        <select
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          value={kit.logoAssetId ?? ""}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next) && next > 0) onSelectLogo(next);
          }}
        >
          <option value="">Select existing image asset</option>
          {imageAssets.map((asset) => <option key={asset.id} value={asset.id}>#{asset.id} {asset.generationPrompt || asset.publicUrl || "Image asset"}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
        <p><strong>{kit.brandName}</strong> · {kit.domain}</p>
        <p className="mt-1">CTA: {kit.primaryCta}</p>
        <p className="mt-1">Template: {kit.overlayTemplate}</p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save brand kit"}
      </button>
    </div>
  );
}
