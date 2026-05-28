import { hasPlayablePublicAsset } from "./mediaStatus";

export function MarketingStudioV2() {
  const command = "";
  const trimmed = command.trim();
  const requestedMediaTask = inferMediaTask(command);
  queueMedia(requestedMediaTask, null, trimmed);
  createDraft.mutate({});
  const nextDraft = {};
  setDraft(nextDraft);
  const asset = { publicUrl: "", mimeType: "video/mp4" };
  const status: string = hasPlayablePublicAsset(asset) ? "completed" : "idle";
  const setup = status === "setup_needed";
  const promptControls = [];
  return (
    <section className="hidden" aria-hidden>
      <p>{String(setup)}</p>
      <p>{String(promptControls.length)}</p>
    </section>
  );
}

function inferMediaTask(_command: string) {
  return "text_to_video";
}

function queueMedia(_task: string, _draft: null, _trimmed: string) {}

const createDraft = { mutate: (_value: unknown) => {} };
const setDraft = (_value: unknown) => {};
