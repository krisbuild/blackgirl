import type { SkinAnalysisResult } from "./skinAnalysis";

/**
 * DEMO DATA, not a real analysis. Shaped like a parsed YouCam SD skin-analysis
 * response so the UI can be built and demoed without spending API units.
 */
export const MOCK_SKIN_ANALYSIS: Omit<SkinAnalysisResult, "source" | "analyzedAt"> = {
  concerns: [
    { concern: "age_spot", rawScore: 58.4, uiScore: 68 },
    { concern: "acne", rawScore: 71.2, uiScore: 78 },
    { concern: "texture", rawScore: 63.9, uiScore: 72 },
    { concern: "redness", rawScore: 81.5, uiScore: 84 },
    { concern: "radiance", rawScore: 69.0, uiScore: 75 },
    { concern: "pore", rawScore: 74.3, uiScore: 79 },
    { concern: "oiliness", rawScore: 60.7, uiScore: 72 },
    { concern: "moisture", rawScore: 55.1, uiScore: 69 },
  ],
  overall: 66.8,
};
