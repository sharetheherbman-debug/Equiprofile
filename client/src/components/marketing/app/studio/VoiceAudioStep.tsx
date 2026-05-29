import React from "react";

/**
 * VoiceAudioStep — placeholder until a real TTS provider is wired.
 * Hidden from normal users when voice generation is not available.
 */
export function VoiceAudioStep({
  isAvailable = false,
}: {
  isAvailable?: boolean;
}) {
  if (!isAvailable) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="voice-audio-step">
      <h3 className="font-semibold text-stone-800">Voice / Audio</h3>
      <p className="text-sm text-stone-500">
        Voice and background music will be available once a TTS provider is configured.
      </p>
    </div>
  );
}
