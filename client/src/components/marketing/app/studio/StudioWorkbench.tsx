import React, { useState } from "react";
import { nanoid } from "nanoid";
import type {
  MarketingStudioPlan,
  MarketingStudioScene,
  MarketingContentType,
  StudioPlanStatus,
} from "@shared/_core/marketingStudioPlan";
import { CreateTypeSelector, type ContentTypeDefinition } from "./CreateTypeSelector";
import { BriefStep } from "./BriefStep";
import { ScriptStep } from "./ScriptStep";
import { ScenePlanStep } from "./ScenePlanStep";
import { MediaSelectionStep } from "./MediaSelectionStep";
import { VoiceAudioStep } from "./VoiceAudioStep";
import { CaptionsStep } from "./CaptionsStep";
import { BrandOverlayStep } from "./BrandOverlayStep";
import { RenderStep } from "./RenderStep";
import { ExportStep } from "./ExportStep";
import { useMarketingRenderJob } from "./useMarketingRenderJob";
import { useMarketingSceneMedia } from "./useMarketingSceneMedia";

const STEP_ORDER: StudioPlanStatus[] = [
  "brief",
  "script",
  "scene_plan",
  "media_selection",
  "voice_audio",
  "captions",
  "brand_overlay",
  "render",
  "export",
];
const EQUINE_KEYWORDS = ["horse", "equine", "stable", "equestrian", "equiprofile"];
const FORBIDDEN_EQUINE_TERMS = ["laptop", "office", "desk", "keyboard", "computer", "gibberish"];

function isEquinePrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return EQUINE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function cleanEquineText(text: string): string {
  let cleaned = text;
  for (const term of FORBIDDEN_EQUINE_TERMS) {
    cleaned = cleaned.replace(new RegExp(term, "ig"), "stable");
  }
  return cleaned;
}

export function buildScenePlanFromPrompt(prompt: string): MarketingStudioScene[] {
  const equine = isEquinePrompt(prompt);
  const basePrompt = equine ? cleanEquineText(prompt) : prompt;
  const sceneBlueprints = equine
    ? [
      { narration: "Open with horses moving calmly through a well-kept stable yard.", visual: "Golden-hour horse stable exterior, handlers guiding horses, cinematic wide shot", subject: "horses and stable owners" },
      { narration: "Show stable owners managing routines with EquiProfile to save time.", visual: "Stable manager reviewing horse care schedule and feeding updates on phone near paddock", subject: "stable owners using EquiProfile" },
      { narration: "Close on happy horses, confident teams, and a clear EquiProfile call to action.", visual: "Healthy horse in arena, trainer smiling, clean brand-friendly composition with CTA space", subject: "equestrian success" },
    ]
    : [
      { narration: `Hook scene for: ${basePrompt || "marketing request"}`, visual: "Brand-relevant opening scene with clear product context", subject: "campaign hook" },
      { narration: "Middle scene highlighting product value and social proof.", visual: "Practical product use with target audience", subject: "product value" },
      { narration: "Closing scene with strong CTA and next step.", visual: "Clear CTA frame with logo-safe composition", subject: "call to action" },
    ];

  return sceneBlueprints.map((scene, index) => ({
    id: nanoid(),
    order: index + 1,
    durationSeconds: index === sceneBlueprints.length - 1 ? 4 : 5,
    narration: scene.narration,
    visualPrompt: scene.visual,
    negativePrompt: equine ? "off-topic non-equestrian props, irrelevant text overlays" : "blurry, low quality",
    sourceType: "stock",
    requiredSubject: scene.subject,
    assetId: null,
    assetUrl: null,
    previewUrl: null,
    provider: null,
    providerAssetId: null,
    mediaKind: "video",
    sourceMetadata: null,
    selectedAt: null,
    selectionReason: null,
    status: "pending",
  }));
}

function buildEmptyPlan(
  type: ContentTypeDefinition,
  workspaceId: string,
  hostAppId: string,
  prompt: string,
): MarketingStudioPlan {
  return {
    id: nanoid(),
    workspaceId,
    hostAppId,
    contentType: type.id as MarketingContentType,
    originalUserPrompt: prompt,
    goal: "",
    audience: "",
    platform: type.platform,
    durationTargetSeconds: type.recommendedDurationSeconds ?? 0,
    outputFormat: type.expectedOutput,
    brief: "",
    script: "",
    scenes: [],
    requiredAssets: [],
    voiceoverRequired: type.voiceoverRequired,
    captionsRequired: type.needsAssembly,
    brandOverlayRequired: type.needsAssembly,
    renderMode: type.deliveryMode,
    status: "brief",
  };
}

function stepsForPlan(plan: MarketingStudioPlan): StudioPlanStatus[] {
  const steps: StudioPlanStatus[] = ["brief"];
  if (plan.renderMode === "assembled_video" || plan.renderMode === "raw_clip") {
    steps.push("script", "scene_plan", "media_selection");
    if (plan.voiceoverRequired) steps.push("voice_audio");
    if (plan.captionsRequired) steps.push("captions");
    if (plan.brandOverlayRequired) steps.push("brand_overlay");
    steps.push("render");
  } else {
    steps.push("script");
  }
  steps.push("export");
  return steps;
}

export function StudioWorkbench({
  tenantId,
  workspaceId,
  hostAppId,
  initialPrompt = "",
  onDone,
}: {
  tenantId: string;
  workspaceId: string;
  hostAppId: string;
  initialPrompt?: string;
  onDone?: (plan: MarketingStudioPlan) => void;
}) {
  const [selectedType, setSelectedType] = useState<ContentTypeDefinition | null>(null);
  const [plan, setPlan] = useState<MarketingStudioPlan | null>(null);
  const [currentStep, setCurrentStep] = useState<StudioPlanStatus>("brief");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const renderJob = useMarketingRenderJob({ tenantId, workspaceId, hostAppId });
  const sceneMedia = useMarketingSceneMedia({ tenantId, workspaceId, hostAppId });

  function handleSelectType(type: ContentTypeDefinition) {
    const newPlan = buildEmptyPlan(type, workspaceId, hostAppId, initialPrompt);
    setSelectedType(type);
    setPlan(newPlan);
    setCurrentStep("brief");
  }

  function handlePlanChange(patch: Partial<MarketingStudioPlan>) {
    setPlan((current) => (current ? { ...current, ...patch } : current));
  }

  function handleUpdateScene(sceneId: string, patch: Partial<MarketingStudioScene>) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        scenes: current.scenes.map((scene) =>
          scene.id === sceneId ? { ...scene, ...patch } : scene,
        ),
      };
    });
  }

  function handleGenerateScript() {
    setIsGeneratingScript(true);
    // Placeholder: real generation will be wired in PR42
    setTimeout(() => {
      setPlan((current) => {
        if (!current) return current;
        const scriptText =
          current.brief ||
          `Script for ${selectedType?.label ?? "your content"}: ${current.originalUserPrompt || "No prompt provided"}`;
        const promptSource = current.originalUserPrompt || current.brief || scriptText;
        return {
          ...current,
          script: scriptText,
          scenes: buildScenePlanFromPrompt(promptSource),
          requiredAssets: isEquinePrompt(promptSource)
            ? ["Horse stable footage", "Rider/trainer b-roll", "EquiProfile UI references", "Brand CTA frame"]
            : current.requiredAssets,
        };
      });
      setIsGeneratingScript(false);
    }, 500);
  }

  function handleNext() {
    if (!plan) return;
    const steps = stepsForPlan(plan);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      const next = steps[currentIndex + 1];
      setCurrentStep(next);
      setPlan((current) => (current ? { ...current, status: next } : current));
    } else {
      if (onDone && plan) onDone(plan);
    }
  }

  function handleBack() {
    if (!plan) return;
    const steps = stepsForPlan(plan);
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      const previous = steps[currentIndex - 1];
      setCurrentStep(previous);
    } else {
      setSelectedType(null);
      setPlan(null);
    }
  }

  if (!selectedType || !plan) {
    return (
      <div className="space-y-6" data-testid="studio-workbench">
        <CreateTypeSelector onSelect={handleSelectType} />
      </div>
    );
  }

  const steps = stepsForPlan(plan);
  const stepIndex = steps.indexOf(currentStep);
  const isLastStep = stepIndex === steps.length - 1;

  return (
    <div className="space-y-6" data-testid="studio-workbench">
      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                index === stepIndex
                  ? "bg-stone-800 text-white"
                  : index < stepIndex
                    ? "bg-stone-200 text-stone-600"
                    : "bg-stone-100 text-stone-400"
              }`}
            >
              {step.replace(/_/g, " ")}
            </span>
            {index < steps.length - 1 ? (
              <span className="text-stone-300 text-xs shrink-0">→</span>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      {/* Active step */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        {currentStep === "brief" ? (
          <BriefStep
            plan={plan}
            onChange={(patch) => handlePlanChange(patch)}
          />
        ) : null}

        {currentStep === "script" ? (
          <ScriptStep
            plan={plan}
            isGenerating={isGeneratingScript}
            onChange={(patch) => handlePlanChange(patch)}
            onGenerate={handleGenerateScript}
          />
        ) : null}

        {currentStep === "scene_plan" ? (
          <ScenePlanStep plan={plan} onUpdateScene={handleUpdateScene} />
        ) : null}

        {currentStep === "media_selection" ? (
          <MediaSelectionStep
            plan={plan}
            isSourcing={sceneMedia.isSourcing}
            sourcingStatus={sceneMedia.lastStatus}
            onFindSceneMedia={() => {
              void sceneMedia.sourceSceneMedia(plan).then((updatedPlan) => {
                setPlan((current) => (current ? { ...current, scenes: updatedPlan.scenes } : current));
              });
            }}
            onAcceptSourcedMedia={() => {
              setPlan((current) => {
                if (!current) return current;
                return {
                  ...current,
                  scenes: current.scenes.map((scene) => (
                    scene.assetUrl && scene.mediaKind !== "text_card"
                      ? { ...scene, status: "ready" }
                      : scene
                  )),
                };
              });
            }}
          />
        ) : null}

        {currentStep === "voice_audio" ? (
          <VoiceAudioStep isAvailable={false} />
        ) : null}

        {currentStep === "captions" ? (
          <CaptionsStep captionsRequired={plan.captionsRequired} isAvailable={false} />
        ) : null}

        {currentStep === "brand_overlay" ? (
          <BrandOverlayStep isAvailable={false} />
        ) : null}

        {currentStep === "render" ? (
          <RenderStep
            plan={plan}
            isAvailable={true}
            statusLabel={renderJob.statusLabel}
            canCreateRenderJob={plan.renderMode === "assembled_video"}
            isStarting={renderJob.isCreating}
            onStartRender={() => {
              if (plan.renderMode === "assembled_video") {
                void renderJob.createRenderJob(plan);
              }
            }}
            onCancelRender={
              renderJob.status === "queued" || renderJob.status === "processing"
                ? () => {
                  void renderJob.cancelRenderJob();
                }
                : undefined
            }
          />
        ) : null}

        {currentStep === "export" ? (
          <ExportStep
            plan={plan}
            renderJob={renderJob.job}
            onExport={() => onDone?.(plan)}
          />
        ) : null}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
        >
          {stepIndex === 0 ? "Change type" : "Back"}
        </button>
        {!isLastStep ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-full bg-stone-800 px-4 py-2 text-sm text-white hover:bg-stone-700"
          >
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
}
