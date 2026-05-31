export interface VisualQaVisionProvider {
  canAnalyze: boolean;
  reason: string;
  analyzeImage?(input: {
    imageUrl: string;
    expectedSubject?: string | null;
    expectedBrand?: string | null;
  }): Promise<{ labels: string[]; confidence: number }>;
  analyzeVideoFrames?(input: {
    frameUrls: string[];
    expectedSubject?: string | null;
    expectedBrand?: string | null;
  }): Promise<{ labels: string[]; confidence: number }>;
}

export const defaultVisualQaVisionProvider: VisualQaVisionProvider = {
  canAnalyze: false,
  reason: "setup_needed — no vision provider configured",
};

export function getVisualQaVisionProvider(): VisualQaVisionProvider {
  return defaultVisualQaVisionProvider;
}
