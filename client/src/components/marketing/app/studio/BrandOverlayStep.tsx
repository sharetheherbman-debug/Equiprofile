import React from "react";

export function BrandOverlayStep({
  isAvailable = false,
}: {
  isAvailable?: boolean;
}) {
  if (!isAvailable) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="brand-overlay-step">
      <h3 className="font-semibold text-stone-800">Brand Overlay</h3>
      <p className="text-sm text-stone-500">
        Apply logo, watermark, CTA text, and colour treatment to the assembled video. Available in PR44.
      </p>
    </div>
  );
}
