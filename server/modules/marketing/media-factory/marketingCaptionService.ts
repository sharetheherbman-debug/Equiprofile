import type { MarketingTimeline } from "./renderJobTypes";

function toTimestamp(seconds: number, separator: "," | "."): string {
  const totalMs = Math.max(0, Math.floor(seconds * 1000));
  const hrs = Math.floor(totalMs / 3_600_000);
  const mins = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1_000);
  const ms = totalMs % 1_000;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}${separator}${String(ms).padStart(3, "0")}`;
}

export function splitCaptionText(text: string, maxCharsPerLine = 42): string {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return " ";
  if (/^\s*cta\s*:/i.test(normalized)) return normalized;
  if (normalized.length <= maxCharsPerLine) return normalized;

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3).join("\n");
}

export function generateSrtCaptions(timeline: MarketingTimeline): string {
  return timeline.captionLines
    .map((line, index) => {
      const start = toTimestamp(line.startSeconds, ",");
      const end = toTimestamp(line.endSeconds, ",");
      return `${index + 1}\n${start} --> ${end}\n${splitCaptionText(line.text)}`;
    })
    .join("\n\n");
}

export function generateVttCaptions(timeline: MarketingTimeline): string {
  const body = timeline.captionLines
    .map((line) => `${toTimestamp(line.startSeconds, ".")} --> ${toTimestamp(line.endSeconds, ".")}\n${splitCaptionText(line.text)}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}`;
}
