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
  return (
    <div className="space-y-4" data-testid="voice-audio-step">
      <h3 className="font-semibold text-stone-800">Voice / Audio</h3>
      <p className="text-sm text-stone-500">
        {isAvailable
          ? "Voice and background music are available."
          : "Voice provider not connected yet. Continue with script and scene plan while voice setup is pending."}
      </p>
    </div>
  );
}
