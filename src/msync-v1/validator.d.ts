type Issue = { line: number | null; code: string; message: string };
export function validateMsyncSource(source: string, context?: {
  track?: { filename: string; duration: number; metadata: { sha256: string } };
}): { valid: boolean; errors: Issue[]; warnings: Issue[] };
