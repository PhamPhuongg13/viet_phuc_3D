/**
 * POST /api/ai-design: turns a text prompt into colors and a pattern for the 3D outfit, using the
 * Gemini API. Served by the Vite dev/preview server (server/vitePlugin.ts) and, once deployed, by the
 * Vercel function in api/ai-design.ts, so the API key never reaches the browser.
 * The browser validates the result again before applying it (src/aiDesign.ts).
 */

/** `fallbackModel` is tried when `model` is overloaded, errors or is too slow. */
export type Env = { apiKey?: string; model: string; fallbackModel?: string };

/** Reads the settings from environment variables (.env locally, project settings on Vercel). */
export function envFrom(vars: Record<string, string | undefined>): Env {
  return {
    apiKey: vars.GEMINI_API_KEY,
    model: vars.GEMINI_MODEL || 'gemini-3.8-flash',
    fallbackModel: vars.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite',
  };
}

type GeminiReply = {
  error?: { message?: string };
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
};

const MAX_PROMPT = 500;

const SYSTEM_INSTRUCTION = `Bạn là nhà thiết kế cho ứng dụng Việt Phục Remix: người dùng phối màu và họa tiết cho áo dài hiện đại hoặc áo tứ thân trên mô hình 3D.

Nhiệm vụ: từ mô tả của người dùng, chọn màu và vẽ họa tiết.
- Màu dùng mã hex #rrggbb. Chọn màu hài hòa. Màu của mọi nét họa tiết phải khác rõ độ sáng so với coatColor (áo sáng thì nét đậm, áo đậm thì nét sáng), để nhìn thấy rõ trên áo.
- coatColor là màu áo. pantsColor là màu quần (áo dài) hoặc màu váy (áo tứ thân).
- yemColor, sashColor, scarfColor là màu yếm, thắt lưng, khăn; chỉ có trên áo tứ thân nhưng luôn trả về.
- Họa tiết vẽ trên một bảng vuông, toạ độ x, y từ 0 đến 1 (0,0 là góc trên trái). Bảng này in lên thân trước của áo; giữ mọi điểm trong khoảng 0.12 đến 0.88.
- base là mẫu nền: "plain" (trơn), "lotus" (hoa cách điệu ở giữa bảng), "lines" (các nét gấp khúc hình học ở giữa bảng).
- marks là các nét thêm (tối đa 24):
  - icon: một trong flower, star, leaf, heart, sun, diamond; size từ 24 đến 100 (pixel trên bảng 512).
  - symbol: 1 đến 3 ký tự hoặc emoji trong text; size từ 24 đến 100.
  - stroke: nét vẽ qua points (2 đến 40 điểm [x, y]); size là độ dày nét từ 2 đến 30.
  Với icon và symbol dùng x, y; với stroke dùng points.
- garmentId: "ao-dai" hoặc "tu-than" nếu người dùng nói rõ muốn dáng áo đó, ngược lại "keep".
- note: 1 đến 2 câu tiếng Việt, giọng gần gũi, nói về cảm giác của bản phối (màu, họa tiết, dịp phù hợp).

Quy tắc nội dung: đây là gợi ý phối hiện đại. Không khẳng định điều gì về lịch sử, ý nghĩa văn hóa hay "màu truyền thống" của trang phục. Nếu yêu cầu không liên quan đến phối màu hoặc họa tiết, trả về một bản phối nhẹ nhàng và giải thích trong note rằng bạn chỉ thiết kế màu và họa tiết.`;

const hexColor = { type: 'string', description: 'Mã màu dạng #rrggbb' };

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    garmentId: { type: 'string', enum: ['keep', 'ao-dai', 'tu-than'] },
    coatColor: hexColor,
    pantsColor: hexColor,
    yemColor: hexColor,
    sashColor: hexColor,
    scarfColor: hexColor,
    base: { type: 'string', enum: ['plain', 'lotus', 'lines'] },
    marks: {
      type: 'array',
      maxItems: 24,
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['icon', 'symbol', 'stroke'] },
          icon: { type: 'string', enum: ['flower', 'star', 'leaf', 'heart', 'sun', 'diamond'] },
          text: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          points: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
          color: hexColor,
          size: { type: 'number' },
        },
        required: ['type', 'color', 'size'],
      },
    },
    note: { type: 'string' },
  },
  required: ['garmentId', 'coatColor', 'pantsColor', 'yemColor', 'sashColor', 'scarfColor', 'base', 'marks', 'note'],
};

export class RequestError extends Error {
  /** `retry`: worth trying again with the fallback model (overload, server error, timeout). */
  constructor(readonly status: number, message: string, readonly retry = false) {
    super(message);
  }
}

const ATTEMPT_TIMEOUT = 25_000;

async function callGemini(apiKey: string, model: string, request: object): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT);
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) throw new RequestError(504, 'Gemini phản hồi quá lâu. Hãy thử lại.', true);
    throw new RequestError(502, 'Không kết nối được tới Gemini. Kiểm tra mạng rồi thử lại.');
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null) as GeminiReply | null;
  if (!response.ok) {
    console.warn(`[ai-design] ${model} error`, response.status, data?.error?.message);
    if (response.status === 429) throw new RequestError(429, 'Đã chạm giới hạn gọi Gemini. Hãy thử lại sau ít phút.', true);
    if (response.status === 400 || response.status === 403 || response.status === 404) {
      throw new RequestError(502, `Gemini từ chối yêu cầu: ${data?.error?.message ?? 'kiểm tra khóa API và tên model.'}`);
    }
    if (response.status === 503) throw new RequestError(503, 'Gemini đang quá tải. Hãy thử lại sau ít phút.', true);
    throw new RequestError(502, 'Gemini đang gặp lỗi. Hãy thử lại.', true);
  }
  if (data?.promptFeedback?.blockReason) throw new RequestError(422, 'Gemini không xử lý mô tả này. Hãy thử diễn đạt khác.');
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  try {
    return JSON.parse(text);
  } catch {
    console.warn(`[ai-design] ${model} unparseable reply`, data?.candidates?.[0]?.finishReason, text.slice(0, 300));
    throw new RequestError(502, 'Gemini trả về kết quả không đọc được. Hãy thử lại.', true);
  }
}

async function design(env: Env, input: unknown) {
  if (!env.apiKey) {
    throw new RequestError(503, 'Chưa có khóa Gemini. Thêm GEMINI_API_KEY vào file .env ở thư mục dự án rồi chạy lại npm run dev.');
  }
  const { prompt, garmentId, look } = (input ?? {}) as { prompt?: unknown; garmentId?: unknown; look?: unknown };
  if (typeof prompt !== 'string' || !prompt.trim()) throw new RequestError(400, 'Hãy mô tả bộ đồ bạn muốn.');
  if (prompt.length > MAX_PROMPT) throw new RequestError(400, `Mô tả tối đa ${MAX_PROMPT} ký tự.`);
  const garment = garmentId === 'tu-than' ? 'áo tứ thân' : 'áo dài hiện đại';

  const userText = `Dáng áo đang chọn: ${garment}.
Bản phối hiện tại (để tham khảo nếu người dùng muốn chỉnh tiếp): ${JSON.stringify(look ?? {}).slice(0, 2000)}
Mô tả của người dùng: ${prompt.trim()}`;

  const request = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      temperature: 0.9,
      // Picking colors doesn't need long reasoning; low thinking keeps replies to a few seconds.
      thinkingConfig: { thinkingLevel: 'low' },
    },
  };
  try {
    return await callGemini(env.apiKey, env.model, request);
  } catch (error) {
    if (!(error instanceof RequestError) || !error.retry || !env.fallbackModel || env.fallbackModel === env.model) throw error;
    console.warn(`[ai-design] retrying with ${env.fallbackModel}`);
    return callGemini(env.apiKey, env.fallbackModel, request);
  }
}

/** Runs one request from its raw JSON body; shared by the Vite middleware and the Vercel function. */
export async function handleDesignRequest(env: Env, rawBody: string): Promise<{ status: number; payload: unknown }> {
  try {
    const result = await design(env, JSON.parse(rawBody || '{}'));
    return { status: 200, payload: { design: result } };
  } catch (error) {
    if (error instanceof RequestError) return { status: error.status, payload: { error: error.message } };
    if (error instanceof SyntaxError) return { status: 400, payload: { error: 'Yêu cầu không hợp lệ.' } };
    console.error('[ai-design]', error);
    return { status: 500, payload: { error: 'Có lỗi khi tạo thiết kế. Hãy thử lại.' } };
  }
}
