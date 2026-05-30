import React from "react";

type BrandKitDraft = {
  id?: number | null;
  brandName: string;
  domain: string;
  primaryCta: string;
  toneOfVoice: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string | null;
  overlayTemplate: "lower_third" | "corner_logo" | "end_card" | "social_reel" | "youtube_landscape";
  logoAssetId?: number | null;
  logoUrl?: string | null;
};

export function BrandOverlayStep({
  brandKit,
  templates,
  imageAssets,
  isSaving,
  onChange,
  onSave,
  onSelectLogoAsset,
}: {
  brandKit: BrandKitDraft;
  templates: Array<BrandKitDraft["overlayTemplate"]>;
  imageAssets: Array<{ id: number; publicUrl: string | null; generationPrompt: string | null }>;
  isSaving?: boolean;
  onChange: (patch: Partial<BrandKitDraft>) => void;
  onSave: () => void;
  onSelectLogoAsset: (mediaAssetId: number) => void;
}) {
  return (
    <div className="space-y-4" data-testid="brand-overlay-step">
      <h3 className="font-semibold text-stone-800">Brand Overlay</h3>
      <p className="text-sm text-stone-500">
        Edit reusable Brand Kit values and persist them for render overlays.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-stone-600">Brand name
          <input className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm" value={brandKit.brandName} onChange={(e) => onChange({ brandName: e.target.value })} />
        </label>
        <label className="text-xs text-stone-600">Domain
          <input className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm" value={brandKit.domain} onChange={(e) => onChange({ domain: e.target.value })} />
        </label>
        <label className="text-xs text-stone-600">Primary CTA
          <input className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm" value={brandKit.primaryCta} onChange={(e) => onChange({ primaryCta: e.target.value })} />
        </label>
        <label className="text-xs text-stone-600">Tone of voice
          <input className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm" value={brandKit.toneOfVoice} onChange={(e) => onChange({ toneOfVoice: e.target.value })} />
        </label>
        <label className="text-xs text-stone-600">Primary color
          <input className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm" value={brandKit.primaryColor} onChange={(e) => onChange({ primaryColor: e.target.value })} />
        </label>
        <label className="text-xs text-stone-600">Secondary color
          <input className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm" value={brandKit.secondaryColor} onChange={(e) => onChange({ secondaryColor: e.target.value })} />
        </label>
        <label className="text-xs text-stone-600">Accent color
          <input className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm" value={brandKit.accentColor ?? ""} onChange={(e) => onChange({ accentColor: e.target.value || null })} />
        </label>
        <label className="text-xs text-stone-600">Overlay template
          <select className="mt-1 w-full rounded border border-stone-200 px-3 py-2 text-sm" value={brandKit.overlayTemplate} onChange={(e) => onChange({ overlayTemplate: e.target.value as BrandKitDraft["overlayTemplate"] })}>
            {templates.map((template) => <option key={template} value={template}>{template}</option>)}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-stone-200 p-3 text-xs text-stone-600">
        <p className="font-semibold text-stone-700">Preview</p>
        <p className="mt-1">{brandKit.brandName} · {brandKit.domain}</p>
        <p>{brandKit.primaryCta}</p>
        <p>Template: {brandKit.overlayTemplate}</p>
        {brandKit.logoUrl ? <img src={brandKit.logoUrl} alt="Brand logo" className="mt-2 h-10 w-auto rounded" /> : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-700">Select existing image asset as logo</p>
        <div className="flex flex-wrap gap-2">
          {imageAssets.slice(0, 8).map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onSelectLogoAsset(asset.id)}
              className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              Logo asset #{asset.id}
            </button>
          ))}
        </div>
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
