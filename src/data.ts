export type GarmentId = 'ao-dai' | 'tu-than';
export type StyleId = 'thanh-lich' | 'toi-gian' | 'nang-dong';
export type PatternBaseId = 'plain' | 'lotus' | 'lines';
export type PatternId = PatternBaseId | 'custom';
export type PatternIconId = 'flower' | 'star' | 'leaf' | 'heart' | 'sun' | 'diamond';
export type PatternMark =
  | { type: 'stroke'; points: [number, number][]; color: string; size: number }
  | { type: 'icon'; icon: PatternIconId; x: number; y: number; color: string; size: number }
  | { type: 'symbol'; text: string; x: number; y: number; color: string; size: number };
export type PatternDesign = { base: PatternBaseId; marks: PatternMark[] };

export interface Look {
  garmentId: GarmentId;
  styleId: StyleId;
  coatColor: string;
  pantsColor: string;
  /** Áo tứ thân only: the yếm, sash and headscarf worn with it. */
  yemColor: string;
  sashColor: string;
  scarfColor: string;
  patternId: PatternId;
  patternDesign?: PatternDesign;
}

export interface SavedLook {
  id: string;
  name: string;
  savedAt: number;
  look: Look;
}

export const DEFAULT_LOOK: Look = {
  garmentId: 'ao-dai',
  styleId: 'thanh-lich',
  coatColor: '#6f8d7d',
  pantsColor: '#f1e9d7',
  yemColor: '#e8dcc6',
  sashColor: '#c0776a',
  scarfColor: '#2b2724',
  patternId: 'plain',
};

/** Fills in colors added after a look was saved, so older lookbook entries still open. */
export function withLookDefaults(value: Record<string, unknown>): Record<string, unknown> {
  return {
    yemColor: DEFAULT_LOOK.yemColor,
    sashColor: DEFAULT_LOOK.sashColor,
    scarfColor: DEFAULT_LOOK.scarfColor,
    ...value,
  };
}

export const GARMENTS: Record<GarmentId, { name: string; subtitle: string; era: string; culture: string; source: string; sourceName: string; feature: string; lowerLabel: string }> = {
  'ao-dai': {
    name: 'Áo dài hiện đại',
    subtitle: 'Dáng áo quen thuộc',
    era: 'Một trang phục không ngừng thay đổi',
    culture: 'Áo dài đã trải qua nhiều lần cách tân về độ dài tà và phom dáng. Bản phối 3D giữ hình ảnh tà áo dài cùng quần, đồng thời cho bạn thử màu và họa tiết theo phong cách cá nhân.',
    feature: 'Tà áo dài · cổ đứng · phom gọn',
    source: 'https://baotangphunu.org.vn/thoi-trang-va-nghe-thuat-tao-hoa-van/',
    sourceName: 'Bảo tàng Phụ nữ Việt Nam',
    lowerLabel: 'Màu quần',
  },
  'tu-than': {
    name: 'Áo tứ thân',
    subtitle: 'Áo mở vạt, yếm và váy',
    era: 'Trang phục của phụ nữ Bắc Bộ xưa',
    culture: 'Áo tứ thân ghép từ bốn thân vải: hai thân sau nối ở sống lưng, hai thân trước để buông hoặc buộc lại. Áo thường mặc cùng yếm, thắt lưng, váy và khăn. Mẫu 3D này là minh họa để khám phá dáng áo; màu sắc và họa tiết là lựa chọn phối đương đại.',
    feature: 'Bốn thân áo · mở vạt trước · mặc cùng yếm và váy',
    source: 'https://baotangphunu.org.vn/thoi-trang-va-nghe-thuat-tao-hoa-van/',
    sourceName: 'Bảo tàng Phụ nữ Việt Nam',
    lowerLabel: 'Màu váy',
  },
};

/**
 * Knowledge hotspots on the 3D model; their positions live in scene.ts under the same ids.
 * Each is a short, sourced fact about the garment's form (see the garment's source link).
 */
export const HOTSPOTS: Record<GarmentId, { id: string; title: string; text: string }[]> = {
  'ao-dai': [
    { id: 'co-dung', title: 'Cổ đứng', text: 'Cổ áo may đứng, ôm quanh cổ. Độ cao của cổ thay đổi theo từng thời kỳ và từng người may.' },
    { id: 'duong-cai', title: 'Đường cài chéo', text: 'Vạt áo cài từ cổ chéo xuống dưới nách, nối với đường cài dọc hông.' },
    { id: 'xe-ta', title: 'Tà xẻ hai bên', text: 'Thân áo xẻ cao hai bên hông, chia thành tà trước và tà sau buông dài, mặc cùng quần.' },
  ],
  'tu-than': [
    { id: 'vat-truoc', title: 'Hai vạt trước', text: 'Hai thân trước để buông, hoặc buộc lại với nhau phía trước. Áo không cài khuy, để lộ yếm bên trong.' },
    { id: 'yem', title: 'Yếm', text: 'Mảnh vải che ngực mặc bên trong áo, buộc dây sau cổ và sau lưng.' },
    { id: 'that-lung', title: 'Thắt lưng', text: 'Dải vải buộc ngang eo để giữ áo; hai đầu dải buông xuống phía trước.' },
    { id: 'song-lung', title: 'Sống lưng', text: 'Hai thân sau nối với nhau dọc giữa lưng. Cùng hai thân trước, áo có bốn thân, nên gọi là tứ thân.' },
  ],
};

export const STYLES: Record<StyleId, { name: string; description: string }> = {
  'thanh-lich': { name: 'Thanh lịch', description: 'Nhẹ nhàng, chỉn chu' },
  'toi-gian': { name: 'Tối giản', description: 'Ít chi tiết, nổi bật dáng áo' },
  'nang-dong': { name: 'Năng động', description: 'Tươi sáng, gần gũi' },
};

export const PATTERNS: Record<PatternId, { name: string; description: string }> = {
  plain: { name: 'Trơn', description: 'Tôn dáng áo' },
  lotus: { name: 'Hoa cách điệu', description: 'Họa tiết do nhóm thiết kế' },
  lines: { name: 'Nét giao', description: 'Họa tiết hình học hiện đại' },
  custom: { name: 'Tự thiết kế', description: 'Họa tiết do bạn vẽ' },
};

export const COAT_COLORS = [
  { name: 'Xanh ngọc', hex: '#6f8d7d' },
  { name: 'Đỏ son', hex: '#a94d43' },
  { name: 'Vàng mơ', hex: '#d4ac68' },
  { name: 'Xanh chàm', hex: '#465a75' },
  { name: 'Kem ngà', hex: '#e5d6bc' },
  { name: 'Hồng đất', hex: '#b47c79' },
];

export const PANTS_COLORS = [
  { name: 'Kem', hex: '#f1e9d7' },
  { name: 'Trắng', hex: '#f9f7f0' },
  { name: 'Nâu', hex: '#9b806e' },
  { name: 'Đen', hex: '#30343b' },
];

export const YEM_COLORS = [
  { name: 'Kem ngà', hex: '#e8dcc6' },
  { name: 'Trắng', hex: '#f6f2ea' },
  { name: 'Hồng đào', hex: '#e2a596' },
  { name: 'Đỏ son', hex: '#b5473b' },
  { name: 'Vàng mơ', hex: '#d9b06a' },
  { name: 'Nâu', hex: '#8a6a55' },
];

export const SASH_COLORS = [
  { name: 'Hồng đất', hex: '#c0776a' },
  { name: 'Xanh lá mạ', hex: '#8fae78' },
  { name: 'Vàng mơ', hex: '#d9b06a' },
  { name: 'Đỏ son', hex: '#b5473b' },
  { name: 'Kem ngà', hex: '#e8dcc6' },
];

export const SCARF_COLORS = [
  { name: 'Đen', hex: '#2b2724' },
  { name: 'Nâu', hex: '#5e4a3b' },
  { name: 'Xanh chàm', hex: '#34425a' },
  { name: 'Kem', hex: '#e5d6bc' },
];

export const PRESETS: Record<StyleId, Pick<Look, 'coatColor' | 'pantsColor' | 'patternId'>> = {
  'thanh-lich': { coatColor: '#6f8d7d', pantsColor: '#f1e9d7', patternId: 'plain' },
  'toi-gian': { coatColor: '#e5d6bc', pantsColor: '#30343b', patternId: 'plain' },
  'nang-dong': { coatColor: '#a94d43', pantsColor: '#f9f7f0', patternId: 'lines' },
};

export function describeLook(look: Look): string {
  const garment = GARMENTS[look.garmentId].name.toLowerCase();
  const style = STYLES[look.styleId].name.toLowerCase();
  const pattern = look.patternId === 'plain' ? 'bề mặt trơn' : look.patternId === 'custom' ? 'họa tiết bạn tự thiết kế' : PATTERNS[look.patternId].name.toLowerCase();
  return `Dáng ${garment} với ${pattern}, phối theo phong cách ${style}. Màu sắc và họa tiết là lựa chọn phối hiện đại của bạn.`;
}

export function isLook(value: unknown): value is Look {
  if (!value || typeof value !== 'object') return false;
  const look = value as Partial<Look>;
  return Boolean(
    look.garmentId && look.garmentId in GARMENTS &&
    look.styleId && look.styleId in STYLES &&
    look.patternId && look.patternId in PATTERNS &&
    (look.patternDesign === undefined || isPatternDesign(look.patternDesign)) &&
    (look.patternId !== 'custom' || isPatternDesign(look.patternDesign)) &&
    [look.coatColor, look.pantsColor, look.yemColor, look.sashColor, look.scarfColor].every((color) => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
  );
}

function isPatternDesign(value: unknown): value is PatternDesign {
  if (!value || typeof value !== 'object') return false;
  const design = value as Partial<PatternDesign>;
  if (!design.base || !['plain', 'lotus', 'lines'].includes(design.base) || !Array.isArray(design.marks) || design.marks.length > 80) return false;
  const color = (input: unknown) => typeof input === 'string' && /^#[0-9a-f]{6}$/i.test(input);
  const unit = (input: unknown) => typeof input === 'number' && Number.isFinite(input) && input >= 0 && input <= 1;
  return design.marks.every((mark) => {
    if (!mark || typeof mark !== 'object') return false;
    const item = mark as PatternMark;
    if (!color(item.color) || typeof item.size !== 'number' || !Number.isFinite(item.size) || item.size < 1 || item.size > 100) return false;
    if (item.type === 'stroke') return Array.isArray(item.points) && item.points.length > 0 && item.points.length <= 160 && item.points.every((point) => Array.isArray(point) && point.length === 2 && unit(point[0]) && unit(point[1]));
    if (item.type === 'icon') return ['flower', 'star', 'leaf', 'heart', 'sun', 'diamond'].includes(item.icon) && unit(item.x) && unit(item.y);
    if (item.type === 'symbol') return typeof item.text === 'string' && item.text.length > 0 && item.text.length <= 12 && unit(item.x) && unit(item.y);
    return false;
  });
}
