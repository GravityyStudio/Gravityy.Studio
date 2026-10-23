// Optional AI enhancement for discovery: a plain-language summary of the website findings for the reviewer.
// OFF until the owner approves a model provider (a paid service). It never changes the score: scoring stays
// deterministic (lib/discovery/scoring.ts) and is computed before, and independently of, any AI output.
export const aiSummaryEnabled = () => false;

export async function summarizeFindings(): Promise<string | null> {
  return null;
}
