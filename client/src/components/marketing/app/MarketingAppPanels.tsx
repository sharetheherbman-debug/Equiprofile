import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MarketingAssetRow } from "./MarketingAppAssetStore";
import {
  buildBrandPreview,
  buildCalendarWeek,
  exportCampaignPlan,
  filterMarketingAssets,
  getAssetStatus,
  getAssetTitle,
  getAssetType,
  type AssetFilterId,
  type BrandKit,
  type CalendarDraftItem,
  type MarketingCampaign,
  type WeekColumn,
} from "./marketingAppHelpers";

const ASSET_FILTERS: Array<{ id: AssetFilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "video", label: "Video" },
  { id: "image", label: "Image" },
  { id: "audio", label: "Audio" },
  { id: "draft_text", label: "Draft / text" },
  { id: "completed", label: "Completed" },
  { id: "failed_setup_needed", label: "Failed / setup needed" },
];

function sectionCardClassName(extra = "") {
  return `rounded-3xl border border-stone-200 bg-white p-5 shadow-sm ${extra}`.trim();
}

function disabledReason(reason?: string) {
  return reason ? <p className="text-xs text-stone-500">{reason}</p> : null;
}

export function MarketingAppAssetsPanel({
  assets,
  activeFilter,
  searchTerm,
  selectedAssetId,
  onFilterChange,
  onSearchChange,
  onSelectAsset,
  onDeleteAsset,
  onRegenerateAsset,
  onDownloadAsset,
  onCreateBrandedAsset,
  onCopyUrl,
  canRegenerate = false,
  canCreateBranded = false,
}: {
  assets: MarketingAssetRow[];
  activeFilter: AssetFilterId;
  searchTerm: string;
  selectedAssetId: number | null;
  onFilterChange: (value: AssetFilterId) => void;
  onSearchChange: (value: string) => void;
  onSelectAsset: (assetId: number) => void;
  onDeleteAsset: (assetId: number) => void;
  onRegenerateAsset: (asset: MarketingAssetRow) => void;
  onDownloadAsset: (url: string) => void;
  onCreateBrandedAsset: (assetId: number) => void;
  onCopyUrl: (url: string) => void;
  canRegenerate?: boolean;
  canCreateBranded?: boolean;
}) {
  const filteredAssets = filterMarketingAssets(assets, activeFilter, searchTerm);

  return (
    <section className="space-y-4" aria-label="Assets">
      <div className={sectionCardClassName("space-y-4")}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Assets</h2>
            <p className="text-sm text-stone-500">Search, review, and export finished marketing assets.</p>
          </div>
          <Input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by prompt or title"
            className="w-full md:max-w-xs"
            aria-label="Search assets"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ASSET_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activeFilter === filter.id
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredAssets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAssets.map((asset) => {
            const assetId = typeof asset.id === "number" ? asset.id : null;
            const title = getAssetTitle(asset);
            const status = getAssetStatus(asset);
            const type = getAssetType(asset);
            const isSelected = selectedAssetId === assetId;

            return (
              <article
                key={String(asset.id ?? title)}
                className={`rounded-3xl border p-4 shadow-sm transition ${isSelected ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white"}`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    if (assetId !== null) onSelectAsset(assetId);
                  }}
                >
                  <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                    {asset.publicUrl && type === "image" ? (
                      <img src={asset.publicUrl} alt={title} className="h-full w-full object-cover" />
                    ) : asset.publicUrl && type === "video" ? (
                      <video src={asset.publicUrl} className="h-full w-full object-cover" aria-label={title} />
                    ) : (
                      <div className="px-4 text-center text-xs text-stone-500">{type === "draft_text" ? "Draft/text asset" : "Preview unavailable"}</div>
                    )}
                  </div>
                </button>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
                    <p className="text-xs text-stone-500">{asset.generationPrompt ?? "Generated from the Create tab"}</p>
                  </div>
                  <Badge className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600">
                    {status}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {asset.publicUrl ? (
                    <a href={asset.publicUrl} target="_blank" rel="noreferrer" className="rounded-full border border-stone-200 px-3 py-1.5 text-stone-700 hover:bg-stone-50">
                      Open
                    </a>
                  ) : null}
                  {asset.publicUrl ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onDownloadAsset(asset.publicUrl!)}>
                      Download
                    </Button>
                  ) : null}
                  {assetId !== null ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onDeleteAsset(assetId)}>
                      Delete permanently
                    </Button>
                  ) : null}
                  {canRegenerate ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onRegenerateAsset(asset)}>
                      Regenerate
                    </Button>
                  ) : null}
                  {canCreateBranded && assetId !== null ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onCreateBrandedAsset(assetId)}>
                      Create branded version
                    </Button>
                  ) : null}
                  {asset.publicUrl ? (
                    <Button type="button" variant="outline" size="sm" className="rounded-full text-xs" onClick={() => onCopyUrl(asset.publicUrl!)}>
                      Copy URL
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={sectionCardClassName()}>
          <p className="text-sm font-medium text-stone-900">No assets found</p>
          <p className="mt-1 text-sm text-stone-500">Create your first marketing asset from the Create tab.</p>
        </div>
      )}
    </section>
  );
}

export function MarketingAppCampaignsPanel({
  form,
  campaigns,
  selectedCampaign,
  assets,
  onFormChange,
  onCreateCampaign,
  onSelectCampaign,
  onGenerateSevenDayPlan,
  onGenerateWeeklyPack,
  onToggleAttachedAsset,
  onExportCampaign,
}: {
  form: {
    name: string;
    goal: string;
    audience: string;
    channels: string;
    startDate: string;
    durationDays: number;
  };
  campaigns: MarketingCampaign[];
  selectedCampaign: MarketingCampaign | null;
  assets: MarketingAssetRow[];
  onFormChange: (patch: Partial<{
    name: string;
    goal: string;
    audience: string;
    channels: string;
    startDate: string;
    durationDays: number;
  }>) => void;
  onCreateCampaign: () => void;
  onSelectCampaign: (campaignId: string) => void;
  onGenerateSevenDayPlan: (campaignId: string) => void;
  onGenerateWeeklyPack: (campaignId: string) => void;
  onToggleAttachedAsset: (campaignId: string, assetId: number) => void;
  onExportCampaign: (campaignId: string) => void;
}) {
  const availableAssets = filterMarketingAssets(assets, "all", "").slice(0, 8);

  return (
    <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]" aria-label="Campaigns">
      <div className={sectionCardClassName("space-y-4")}>
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Campaigns</h2>
          <p className="text-sm text-stone-500">Create a real campaign brief, then generate a usable weekly plan.</p>
        </div>
        <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
          DB-backed campaign flow
        </Badge>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Campaign name</Label>
            <Input id="campaign-name" value={form.name} onChange={(event) => onFormChange({ name: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-goal">Goal</Label>
            <Input id="campaign-goal" value={form.goal} onChange={(event) => onFormChange({ goal: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-audience">Audience</Label>
            <Input id="campaign-audience" value={form.audience} onChange={(event) => onFormChange({ audience: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-channels">Channels / platforms</Label>
            <Input
              id="campaign-channels"
              value={form.channels}
              onChange={(event) => onFormChange({ channels: event.target.value })}
              placeholder="Facebook, Instagram, YouTube Shorts"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-start">Start date</Label>
              <Input id="campaign-start" type="date" value={form.startDate} onChange={(event) => onFormChange({ startDate: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-duration">Duration</Label>
              <Input
                id="campaign-duration"
                type="number"
                min={1}
                max={30}
                value={String(form.durationDays)}
                onChange={(event) => onFormChange({ durationDays: Number(event.target.value) || 7 })}
              />
            </div>
          </div>
        </div>

        <Button type="button" className="w-full rounded-2xl" onClick={onCreateCampaign}>
          New Campaign
        </Button>
      </div>

      <div className="space-y-4">
        <div className={sectionCardClassName()}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Campaign list</h3>
              <p className="text-sm text-stone-500">Open a campaign to manage the weekly plan, assets, and export pack.</p>
            </div>
          </div>

          {campaigns.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => onSelectCampaign(campaign.id)}
                  className={`rounded-2xl border p-4 text-left transition ${selectedCampaign?.id === campaign.id ? "border-stone-900 bg-stone-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{campaign.name}</p>
                      <p className="text-xs text-stone-500">{campaign.summary}</p>
                    </div>
                    <Badge className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-600">
                      {campaign.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">No campaigns yet. Start with the New Campaign form.</p>
          )}
        </div>

        <div className={sectionCardClassName("space-y-4")}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Campaign detail view</h3>
              <p className="text-sm text-stone-500">Generate a 7-day plan, build a weekly content pack, attach assets, and export.</p>
            </div>
            {selectedCampaign ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => onGenerateSevenDayPlan(selectedCampaign.id)}>
                  Generate 7-day plan
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => onGenerateWeeklyPack(selectedCampaign.id)}>
                  Generate weekly content pack
                </Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => onExportCampaign(selectedCampaign.id)}>
                  Export campaign plan
                </Button>
              </div>
            ) : null}
          </div>

          {selectedCampaign ? (
            <>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-3">
                  {selectedCampaign.planItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                          <p className="text-xs text-stone-500">
                            {item.channel} • {item.format} • {item.objective}
                          </p>
                        </div>
                        <Badge className="rounded-full border border-stone-200 bg-white px-2 py-0.5 text-xs text-stone-600">
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Attach existing assets</p>
                    <p className="text-xs text-stone-500">Attach completed or draft assets to keep campaign work together.</p>
                  </div>

                  {availableAssets.length ? (
                    availableAssets.map((asset) => {
                      const assetId = typeof asset.id === "number" ? asset.id : null;
                      if (assetId === null) return null;
                      const attached = selectedCampaign.attachedAssetIds.includes(assetId);
                      return (
                        <label key={assetId} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2">
                          <span className="min-w-0 text-sm text-stone-700">{getAssetTitle(asset)}</span>
                          <input
                            type="checkbox"
                            checked={attached}
                            onChange={() => onToggleAttachedAsset(selectedCampaign.id, assetId)}
                            aria-label={`Attach ${getAssetTitle(asset)}`}
                          />
                        </label>
                      );
                    })
                  ) : (
                    <p className="text-xs text-stone-500">No assets available yet. Create or approve assets first.</p>
                  )}
                </div>
              </div>
              <Textarea readOnly value={exportCampaignPlan(selectedCampaign)} className="min-h-[160px] rounded-2xl bg-stone-50 text-sm text-stone-700" />
            </>
          ) : (
            <p className="text-sm text-stone-500">Select a campaign to open the detail view.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function MarketingAppCalendarPanel({
  campaigns,
  scheduleDrafts = [],
}: {
  campaigns: MarketingCampaign[];
  scheduleDrafts?: CalendarDraftItem[];
}) {
  const week = buildCalendarWeek(campaigns, scheduleDrafts);
  const hasItems = week.some((day) => day.items.length > 0);

  return (
    <section className="space-y-4" aria-label="Calendar">
      <div className={sectionCardClassName("space-y-4")}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Calendar</h2>
            <p className="text-sm text-stone-500">Week view for approved campaign items and export-ready drafts.</p>
          </div>
          <Badge className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
            Export-only mode
          </Badge>
        </div>

        <div className="grid gap-3 lg:grid-cols-7">
          {week.map((day) => (
            <WeekDayColumn key={day.isoDate} day={day} />
          ))}
        </div>

        {!hasItems ? (
          <p className="text-sm text-stone-500">No scheduled content yet. Create or approve campaign items first.</p>
        ) : null}
      </div>
    </section>
  );
}

function WeekDayColumn({ day }: { day: WeekColumn }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
      <p className="text-sm font-semibold text-stone-900">{day.label}</p>
      <div className="mt-3 space-y-2">
        {day.items.length ? (
          day.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-3">
              <p className="text-xs font-semibold text-stone-900">{item.title}</p>
              <p className="text-xs text-stone-500">
                {item.channel} • {item.status}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white/60 p-3 text-xs text-stone-400">No items</div>
        )}
      </div>
    </div>
  );
}

export function MarketingAppBrandPanel({
  brandKit,
  canApplyBrand,
  selectedAssetName,
  onBrandKitChange,
  onSaveBrandKit,
  onApplyBrand,
}: {
  brandKit: BrandKit;
  canApplyBrand: boolean;
  selectedAssetName: string | null;
  onBrandKitChange: (patch: Partial<BrandKit>) => void;
  onSaveBrandKit: () => void;
  onApplyBrand: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]" aria-label="Brand">
      <div className={sectionCardClassName("space-y-4")}>
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Brand Kit</h2>
          <p className="text-sm text-stone-500">Define workspace brand basics without moving provider keys back into admin AI settings.</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Brand name</Label>
            <Input id="brand-name" value={brandKit.brandName} onChange={(event) => onBrandKitChange({ brandName: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-domain">Domain</Label>
            <Input id="brand-domain" value={brandKit.domain} onChange={(event) => onBrandKitChange({ domain: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-cta">CTA</Label>
            <Input id="brand-cta" value={brandKit.cta} onChange={(event) => onBrandKitChange({ cta: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-tone">Tone of voice</Label>
            <Textarea id="brand-tone" value={brandKit.toneOfVoice} onChange={(event) => onBrandKitChange({ toneOfVoice: event.target.value })} className="min-h-[90px]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand-primary">Primary color</Label>
              <Input id="brand-primary" value={brandKit.primaryColor} onChange={(event) => onBrandKitChange({ primaryColor: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-secondary">Secondary color</Label>
              <Input id="brand-secondary" value={brandKit.secondaryColor} onChange={(event) => onBrandKitChange({ secondaryColor: event.target.value })} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4">
          <p className="text-sm font-medium text-stone-900">Logo upload</p>
          <p className="mt-1 text-sm text-stone-500">Direct upload is setup-needed in this environment; use existing image assets for logo selection.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" className="rounded-2xl" onClick={onSaveBrandKit}>
            Save Brand Kit
          </Button>
          <Button type="button" variant="outline" className="rounded-2xl" onClick={onApplyBrand} disabled={!canApplyBrand}>
            Apply brand to selected asset
          </Button>
        </div>
        {disabledReason(canApplyBrand ? undefined : selectedAssetName ? "Select a completed image or video asset to apply branding." : "Brand overlay processor needs a completed asset selection first.")}
      </div>

      <div className={sectionCardClassName("space-y-4")}>
        <div>
          <h3 className="text-sm font-semibold text-stone-900">Preview</h3>
          <p className="text-sm text-stone-500">Simple preview of how the logo slot, domain, and CTA will appear.</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-50">
          <div
            className="space-y-3 p-6 text-white"
            style={{
              background: `linear-gradient(135deg, ${brandKit.primaryColor || "#1e3a5f"} 0%, ${brandKit.secondaryColor || "#c5a55a"} 100%)`,
            }}
          >
            <div className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Logo slot</div>
            <div>
              <p className="text-lg font-semibold">{brandKit.brandName || "Your brand name"}</p>
              <p className="text-sm text-white/80">{brandKit.toneOfVoice || "Helpful, calm, and confident."}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 text-sm">{buildBrandPreview(brandKit)}</div>
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900">
              {brandKit.cta || "Call to action"}
            </div>
          </div>
        </div>
        <p className="text-xs text-stone-500">Selected asset: {selectedAssetName ?? "None selected yet"}</p>
      </div>
    </section>
  );
}
