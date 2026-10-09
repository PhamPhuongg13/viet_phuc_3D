/**
 * Vercel function for POST /api/ai-design. The Gemini logic lives in server/aiDesign.ts, shared with
 * the Vite dev server; set GEMINI_API_KEY (and optionally GEMINI_MODEL / GEMINI_FALLBACK_MODEL) in
 * the Vercel project's environment variables. Its time limit (two Gemini attempts of up to 25 s
 * each) is set in vercel.json.
 */
import { envFrom, handleDesignRequest } from '../server/aiDesign.js';

// Provided by the Node.js runtime; declared here so the function doesn't need @types/node.
declare const process: { env: Record<string, string | undefined> };

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  if (body.length > 20_000) return Response.json({ error: 'Yêu cầu quá dài.' }, { status: 413 });
  const { status, payload } = await handleDesignRequest(envFrom(process.env), body);
  return Response.json(payload, { status });
}
