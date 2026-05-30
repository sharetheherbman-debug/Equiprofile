import type { MarketingQaChecklist, MarketingQaScore } from "./marketingQaTypes";

export function scoreMarketingQaChecklist(checklist: MarketingQaChecklist): MarketingQaScore {
  const passed = checklist.items.filter((item) => item.passed).length;
  const failedItems = checklist.items.filter((item) => !item.passed);
  const failed = failedItems.length;
  const blockingFailureCount = failedItems.filter((item) => item.severity === "error").length;
  const total = checklist.items.length || 1;
  const score = Math.round((passed / total) * 100);
  return {
    passed,
    failed,
    score,
    blockingFailureCount,
    pass: blockingFailureCount === 0,
  };
}
