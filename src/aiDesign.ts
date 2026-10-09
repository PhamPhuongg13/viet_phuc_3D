import { isLook, type GarmentId, type Look, type PatternBaseId, type PatternIconId, type PatternMark } from './data';

const ICONS: PatternIconId[] = ['flower', 'star', 'leaf', 'heart', 'sun', 'diamond'];
const BASES: PatternBaseId[] = ['plain', 'lotus', 'lines'];

export type AiDesignResult = { look: Look; note: string };

/** Pattern marks stay inside the part of the board that shows clearly on the coat. */
const coord = (value: unknown) => Math.min(0.9, Math.max(0.1, Number(value)));
const within = (value: unknown, min: number, max: number) => Math.min(max, Math.max(min, Number(value)));
const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

function hex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1].toLowerCase()}` : fallback;
}

function toMark(raw: unknown, ink: string): PatternMark | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const color = hex(item.color, ink);
  if (item.type === 'stroke') {
    const points = Array.isArray(item.points)
      ? item.points
        .filter((point): point is [number, number] => Array.isArray(point) && isNumber(point[0]) && isNumber(point[1]))
        .slice(0, 160)
        .map(([x, y]) => [coord(x), coord(y)] as [number, number])
      : [];
    if (!points.length) return null;
    return { type: 'stroke', points, color, size: within(isNumber(item.size) ? item.size : 6, 2, 30) };
  }
  if (!isNumber(item.x) || !isNumber(item.y)) return null;
  const size = within(isNumber(item.size) ? item.size : 48, 24, 100);
  if (item.type === 'icon' && ICONS.includes(item.icon as PatternIconId)) {
    return { type: 'icon', icon: item.icon as PatternIconId, x: coord(item.x), y: coord(item.y), color, size };
  }
  if (item.type === 'symbol' && typeof item.text === 'string' && item.text.trim()) {
    return { type: 'symbol', text: [...item.text.trim()].slice(0, 3).join(''), x: coord(item.x), y: coord(item.y), color, size };
  }
  return null;
}

/** Turns Gemini's reply into a valid look, keeping the current look's values for anything unusable. */
function toLook(raw: unknown, current: Look): AiDesignResult {
  if (!raw || typeof raw !== 'object') throw new Error('Gemini trả về kết quả không đọc được. Hãy thử lại.');
  const design = raw as Record<string, unknown>;
  const garmentId: GarmentId = design.garmentId === 'ao-dai' || design.garmentId === 'tu-than' ? design.garmentId : current.garmentId;
  const coatColor = hex(design.coatColor, current.coatColor);
  const base = BASES.includes(design.base as PatternBaseId) ? design.base as PatternBaseId : 'plain';
  const marks = (Array.isArray(design.marks) ? design.marks : [])
    .map((mark) => toMark(mark, '#e7c786'))
    .filter((mark): mark is PatternMark => mark !== null)
    .slice(0, 40);
  const look: Look = {
    ...current,
    garmentId,
    coatColor,
    pantsColor: hex(design.pantsColor, current.pantsColor),
    yemColor: hex(design.yemColor, current.yemColor),
    sashColor: hex(design.sashColor, current.sashColor),
    scarfColor: hex(design.scarfColor, current.scarfColor),
    patternId: marks.length ? 'custom' : base,
    patternDesign: marks.length ? { base, marks } : undefined,
  };
  if (!isLook(look)) throw new Error('Thiết kế từ Gemini không hợp lệ. Hãy thử lại.');
  const note = typeof design.note === 'string' ? design.note.trim().slice(0, 400) : '';
  return { look, note };
}

export async function requestAiDesign(prompt: string, current: Look, signal?: AbortSignal): Promise<AiDesignResult> {
  let response: Response;
  try {
    response = await fetch('/api/ai-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        garmentId: current.garmentId,
        look: {
          coatColor: current.coatColor,
          pantsColor: current.pantsColor,
          yemColor: current.yemColor,
          sashColor: current.sashColor,
          scarfColor: current.scarfColor,
          pattern: current.patternId,
        },
      }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Không kết nối được máy chủ thiết kế. Hãy kiểm tra npm run dev còn chạy không.');
  }
  const data = await response.json().catch(() => null) as { design?: unknown; error?: string } | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? (response.status === 404
      ? 'Chưa có máy chủ thiết kế AI. Hãy mở trang bằng npm run dev hoặc npm run preview.'
      : 'Không tạo được thiết kế. Hãy thử lại.'));
  }
  return toLook(data.design, current);
}
