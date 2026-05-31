import type { VisualQaIssue, VisualQaScore } from "./visualQaTypes";

export function scoreVisualQa(issues: VisualQaIssue[]): VisualQaScore {
  const blockingIssueCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const totalDeductions = blockingIssueCount * 30 + warningCount * 10;
  const relevanceScore = Math.max(0, 100 - totalDeductions);
  return {
    relevanceScore,
    pass: blockingIssueCount === 0,
    blockingIssueCount,
    warningCount,
  };
}
