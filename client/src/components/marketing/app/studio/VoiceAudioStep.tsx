import React from "react";

/**
 * VoiceAudioStep — placeholder until a real TTS provider is wired.
 * Hidden from normal users when voice generation is not available.
 */
export function VoiceAudioStep({
  script,
  status,
  isAvailable = false,
  canGenerate = false,
  isGenerating = false,
  onGenerate,
}: {
  script: string;
  status?: string | null;
  isAvailable?: boolean;
  canGenerate?: boolean;
  isGenerating?: boolean;
  onGenerate?: () => void;
}) {
  return (
    <div className="space-y-4" data-testid="voice-audio-step">
      <h3 className="font-semibold text-stone-800">Voice / Audio</h3>
      <p className="text-xs text-stone-500 whitespace-pre-wrap">{script || "Voiceover script will be generated from script/scenes."}</p>
      <p className="text-sm text-stone-500">
        {status
          ?? (isAvailable
            ? "Voiceover ready."
            : "Voice provider not connected. Silent captioned video will be rendered.")}
      </p>
      {canGenerate ? (
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {isGenerating ? "Generating voiceover..." : "Generate voiceover"}
        </button>
      ) : (
        <span className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-500">
          Needs setup
        </span>
      )}
    </div>
  );
}
