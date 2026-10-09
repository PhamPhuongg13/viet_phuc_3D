import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  Menu,
  Paintbrush,
  RotateCcw,
  Save,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import {
  COAT_COLORS,
  DEFAULT_LOOK,
  GARMENTS,
  HOTSPOTS,
  isLook,
  PANTS_COLORS,
  SASH_COLORS,
  SCARF_COLORS,
  YEM_COLORS,
  withLookDefaults,
  PATTERNS,
  PRESETS,
  STYLES,
  describeLook,
  type GarmentId,
  type Look,
  type PatternId,
  type SavedLook,
  type StyleId,
} from './data';
import { createFashionStage, type FashionStage } from './scene';
import { requestAiDesign } from './aiDesign';
import { PatternEditor } from './PatternEditor';
import { drawPatternArt } from './patternArt';
import type { PatternBaseId, PatternDesign, PatternMark } from './data';

const STORAGE_KEY = 'viet-phuc-remix-lookbook-v1';
const AI_EXAMPLES = [
  'Xanh chàm, hoa sen vàng nhỏ rải trên vạt, hợp chụp kỷ yếu',
  'Tông đỏ son rạng rỡ đi chúc Tết, điểm vài ngôi sao vàng',
  'Tối giản màu kem, vài nét lượn mảnh như sóng nước',
];
const HOTSPOTS_KEY = 'viet-phuc-remix-hotspots';

function loadHotspotsSetting(): boolean {
  try {
    return localStorage.getItem(HOTSPOTS_KEY) !== 'off';
  } catch {
    return true;
  }
}
const BASE_PATTERNS: PatternBaseId[] = ['plain', 'lotus', 'lines'];
type ReferenceId = GarmentId;
const REFERENCES: Record<ReferenceId, { name: string; description: string }> = {
  'ao-dai': { name: 'Áo dài hiện đại', description: 'Ảnh ý tưởng 2D về dáng áo và chất liệu. Màu và họa tiết bạn chọn được hiển thị trên mô hình 3D.' },
  'tu-than': { name: 'Áo tứ thân', description: 'Ảnh ý tưởng 2D với áo mở phía trước, yếm, dải lụa buộc eo và váy dài. Màu áo, màu váy và họa tiết bạn chọn được hiển thị trên mô hình 3D.' },
};

function loadSavedLooks(): SavedLook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        // Older saves carry fields for removed features (occasion, accessories) and lack newer colors.
        if (item?.look && typeof item.look === 'object') {
          delete item.look.eventId;
          delete item.look.accessories;
          // Áo ngũ thân was removed; open those looks on the áo dài so their colors aren't lost.
          if (item.look.garmentId === 'ngu-than') item.look.garmentId = 'ao-dai';
          item.look = withLookDefaults(item.look);
        }
        return item;
      })
      .filter((item): item is SavedLook => Boolean(item && typeof item === 'object' && isLook(item.look) && typeof item.id === 'string' && typeof item.name === 'string'));
  } catch {
    return [];
  }
}

function cloneLook(look: Look): Look {
  return structuredClone(look);
}

function makeLookName(look: Look): string {
  return `${GARMENTS[look.garmentId].name}, ${STYLES[look.styleId].name.toLowerCase()}`;
}

function colorIsDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function colorName(colors: { name: string; hex: string }[], hex: string): string {
  return colors.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? 'Màu riêng';
}

function ColorOptions({ label, colors, value, onChange, custom = false }: { label: string; colors: { name: string; hex: string }[]; value: string; onChange: (color: string) => void; custom?: boolean }) {
  const isCustom = !colors.some((color) => color.hex.toLowerCase() === value.toLowerCase());
  return (
    <div className="color-field" role="group" aria-label={label}>
      <div className="field-row"><span className="field-label">{label}</span><span className="field-value">{colorName(colors, value)}</span></div>
      <div className="swatch-row">
        {colors.map((color) => {
          const selected = value.toLowerCase() === color.hex.toLowerCase();
          return (
            <button
              type="button"
              key={color.hex}
              className={`swatch ${selected ? 'is-selected' : ''}`}
              style={{ '--swatch': color.hex } as React.CSSProperties}
              onClick={() => onChange(color.hex)}
              title={color.name}
              aria-label={color.name}
              aria-pressed={selected}
            >
              {selected && <Check size={15} strokeWidth={2.6} color={colorIsDark(color.hex) ? '#fff' : '#221c18'} />}
            </button>
          );
        })}
        {custom && (
          <label className={`swatch swatch-custom ${isCustom ? 'is-selected' : ''}`} style={isCustom ? { '--swatch': value } as React.CSSProperties : undefined} title="Chọn màu khác">
            <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`${label}: chọn màu khác`} />
            {isCustom ? <Check size={15} strokeWidth={2.6} color={colorIsDark(value) ? '#fff' : '#221c18'} /> : <span aria-hidden="true">+</span>}
          </label>
        )}
      </div>
    </div>
  );
}

/** Renders the real pattern art (same code as the 3D texture) on the current coat color. */
function PatternSwatch({ base, marks, color }: { base: PatternBaseId; marks?: PatternMark[]; color: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = color;
    context.fillRect(0, 0, 200, 200);
    if (marks?.length) {
      // Custom designs use the whole board, so show all of it.
      context.scale(200 / 512, 200 / 512);
    } else {
      // Preset motifs sit in the middle of the board; crop to them so they read at thumbnail size.
      context.translate(100 - 256, 100 - 262);
    }
    drawPatternArt(context, base, marks ?? []);
  }, [base, marks, color]);
  return <canvas ref={ref} width={200} height={200} className="pattern-swatch" aria-hidden="true" />;
}

function App() {
  const [look, setLook] = useState<Look>(() => cloneLook(DEFAULT_LOOK));
  const [history, setHistory] = useState<Look[]>([]);
  const [savedLooks, setSavedLooks] = useState<SavedLook[]>(loadSavedLooks);
  const [showLookbook, setShowLookbook] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [referenceId, setReferenceId] = useState<ReferenceId | null>(null);
  const [patternDraft, setPatternDraft] = useState<PatternDesign | null>(null);
  const [compareA, setCompareA] = useState<Look | null>(null);
  const [compareView, setCompareView] = useState<'A' | 'B'>('B');
  const [toast, setToast] = useState('');
  const [sceneError, setSceneError] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [hasRotated, setHasRotated] = useState(false);
  const [activeView, setActiveView] = useState<'front' | 'back' | 'detail' | null>('front');
  const [spinning, setSpinning] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [openedHotspot, setOpenedHotspot] = useState(false);
  const [showHotspots, setShowHotspots] = useState(loadHotspotsSetting);
  const hotspotRefs = useRef(new Map<string, HTMLButtonElement>());
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiNote, setAiNote] = useState('');
  const aiRequest = useRef<AbortController | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<FashionStage | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayedLook = compareA && compareView === 'A' ? compareA : look;
  const garment = GARMENTS[displayedLook.garmentId];
  const hotspots = HOTSPOTS[displayedLook.garmentId];
  const hotspotInfo = hotspots.find((item) => item.id === activeHotspot);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const stage = createFashionStage(canvas, setModelLoading);
      stageRef.current = stage;
      stage.applyLook(look);
      // Positions change every frame, so markers are moved directly rather than through React state.
      stage.onHotspots((spots) => {
        for (const spot of spots) {
          const marker = hotspotRefs.current.get(spot.id);
          if (!marker) continue;
          marker.style.left = `${spot.x * 100}%`;
          marker.style.top = `${spot.y * 100}%`;
          marker.classList.toggle('is-hidden', !spot.visible);
          marker.tabIndex = spot.visible ? 0 : -1;
        }
      });
      const observer = new ResizeObserver(() => stage.engine.resize());
      observer.observe(canvas);
      return () => {
        observer.disconnect();
        stage.dispose();
        stageRef.current = null;
      };
    } catch (error) {
      console.error('Không thể khởi tạo Babylon.js', error);
      setSceneError(true);
      setModelLoading(false);
    }
    // Stage is created once; subsequent looks are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stageRef.current?.applyLook(displayedLook);
  }, [displayedLook]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLooks));
    } catch {
      setToast('Bộ nhớ trình duyệt đã đầy, chưa lưu được lookbook');
    }
  }, [savedLooks]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    if (!showLookbook && !showAbout && !referenceId && !mobileMenu && !activeHotspot) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Close the topmost layer only: a dialog first, then the hotspot card.
      if (showLookbook || showAbout || referenceId || mobileMenu) {
        setShowLookbook(false);
        setShowAbout(false);
        setReferenceId(null);
        setMobileMenu(false);
      } else {
        closeHotspot();
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
    // closeHotspot only touches state setters and the stage ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLookbook, showAbout, referenceId, mobileMenu, activeHotspot]);

  // A different garment has different hotspots; the stage resets the camera itself.
  useEffect(() => setActiveHotspot(null), [displayedLook.garmentId]);

  function commit(next: Look) {
    if (JSON.stringify(next) === JSON.stringify(look)) return;
    setHistory((items) => [...items, cloneLook(look)].slice(-20));
    setLook(cloneLook(next));
    setCompareView('B');
  }

  function update(patch: Partial<Look>) {
    commit({ ...look, ...patch });
  }

  function undo() {
    if (!history.length) return;
    setLook(cloneLook(history[history.length - 1]));
    setHistory((items) => items.slice(0, -1));
    setCompareView('B');
    notify('Đã hoàn tác');
  }

  function reset() {
    commit({ ...DEFAULT_LOOK, garmentId: look.garmentId });
    notify('Đã đặt lại màu và họa tiết');
  }

  function chooseStyle(styleId: StyleId) {
    const preset = PRESETS[styleId];
    commit({ ...look, styleId, ...preset, patternDesign: undefined });
  }

  function choosePattern(id: PatternBaseId) {
    update({ patternId: id, patternDesign: undefined });
  }

  function openPatternEditor(id: PatternId) {
    const initial: PatternDesign = id === 'custom' && look.patternDesign
      ? structuredClone(look.patternDesign)
      : { base: id === 'custom' ? 'plain' : id as PatternBaseId, marks: [] };
    setPatternDraft(initial);
  }

  async function generateAiDesign(prompt = aiPrompt) {
    const text = prompt.trim();
    if (!text || aiBusy) return;
    aiRequest.current?.abort();
    const controller = new AbortController();
    aiRequest.current = controller;
    setAiBusy(true);
    setAiError('');
    setAiNote('');
    try {
      const result = await requestAiDesign(text, look, controller.signal);
      // Goes through the normal history, so Hoàn tác restores the previous look.
      commit(result.look);
      setAiNote(result.note);
      notify('Đã áp thiết kế từ AI. Bấm Hoàn tác nếu muốn quay lại');
    } catch (error) {
      if (!controller.signal.aborted) setAiError(error instanceof Error ? error.message : 'Không tạo được thiết kế. Hãy thử lại.');
    } finally {
      if (aiRequest.current === controller) {
        aiRequest.current = null;
        setAiBusy(false);
      }
    }
  }

  useEffect(() => () => aiRequest.current?.abort(), []);

  function applyPatternDesign(design: PatternDesign) {
    commit({
      ...look,
      patternId: design.marks.length ? 'custom' : design.base,
      patternDesign: design.marks.length ? design : undefined,
    });
    setPatternDraft(null);
    notify('Đã áp họa tiết lên áo');
  }

  function saveLook() {
    const saved: SavedLook = {
      id: crypto.randomUUID(),
      name: makeLookName(look),
      savedAt: Date.now(),
      look: cloneLook(look),
    };
    setSavedLooks((items) => [saved, ...items].slice(0, 20));
    notify('Đã lưu vào lookbook');
  }

  function loadLook(saved: SavedLook) {
    commit(cloneLook(saved.look));
    setCompareA(null);
    setShowLookbook(false);
    notify('Đã mở look từ lookbook');
  }

  function deleteLook(saved: SavedLook) {
    setSavedLooks((items) => items.filter((item) => item.id !== saved.id));
    notify('Đã xóa look khỏi lookbook');
  }

  function downloadImage() {
    const canvas = canvasRef.current;
    if (!canvas || sceneError) return;
    try {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `viet-phuc-remix-${look.garmentId}.png`;
      link.click();
      notify('Đã tải ảnh góc nhìn hiện tại');
    } catch {
      notify('Trình duyệt này chưa xuất được ảnh 3D');
    }
  }

  function setView(view: 'front' | 'back' | 'detail') {
    // A fixed camera angle only makes sense on a still figure.
    stageRef.current?.setSpinning(false);
    setSpinning(false);
    setActiveHotspot(null);
    stageRef.current?.setView(view);
    setActiveView(view);
  }

  function toggleSpin() {
    const next = !spinning;
    stageRef.current?.setSpinning(next);
    setSpinning(next);
    if (next) {
      setActiveView(null);
      setActiveHotspot(null);
    }
  }

  function openHotspot(id: string) {
    if (id === activeHotspot) {
      closeHotspot();
      return;
    }
    // Keep the spot clear of the info card: right of it on wide stages, above it on phones.
    const narrow = window.matchMedia('(max-width: 899px)').matches;
    stageRef.current?.focusHotspot(id, narrow ? { x: 0, y: 0.5 } : { x: 0.3, y: 0.05 });
    setSpinning(false);
    setActiveView(null);
    setActiveHotspot(id);
    setOpenedHotspot(true);
  }

  function toggleHotspots() {
    const next = !showHotspots;
    setShowHotspots(next);
    if (!next && activeHotspot) closeHotspot();
    try {
      localStorage.setItem(HOTSPOTS_KEY, next ? 'on' : 'off');
    } catch {
      // Only a convenience; the toggle still works for this visit.
    }
  }

  function closeHotspot() {
    stageRef.current?.focusHotspot(null);
    setActiveHotspot(null);
    setActiveView('front');
  }

  function pinCompareA() {
    setCompareA(cloneLook(look));
    setCompareView('B');
    notify('Đã ghim phương án A. Phối tiếp để tạo phương án B');
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a href="#studio" className="brand" aria-label="Việt Phục Remix, về studio">
          <span className="brand-mark" aria-hidden="true"><span className="mark-petal mark-one" /><span className="mark-petal mark-two" /><span className="mark-petal mark-three" /><span className="mark-petal mark-four" /></span>
          <span className="brand-name">Việt Phục <span>Remix</span></span>
        </a>
        <nav id="main-nav" className={`topnav ${mobileMenu ? 'is-open' : ''}`} aria-label="Điều hướng chính">
          <a href="#studio" onClick={() => setMobileMenu(false)}>Studio</a>
          <a href="#hieu-trang-phuc" onClick={() => setMobileMenu(false)}>Hiểu trang phục</a>
          <button type="button" onClick={() => { setShowAbout(true); setMobileMenu(false); }}>Về dự án</button>
        </nav>
        <div className="top-actions">
          <button type="button" className="lookbook-button" onClick={() => setShowLookbook(true)} aria-label={`Mở lookbook, ${savedLooks.length} look đã lưu`}>
            <Bookmark size={17} /><span className="lookbook-label">Lookbook</span><span className="count">{savedLooks.length}</span>
          </button>
          <button type="button" className="icon-button menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label={mobileMenu ? 'Đóng menu' : 'Mở menu'} aria-expanded={mobileMenu} aria-controls="main-nav">{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </header>

      <main>
        <section className="intro" id="studio">
          <h1>Phối Việt phục theo cách của bạn</h1>
          <p>Chọn dáng áo, rồi đổi phong cách, màu và họa tiết. Nhân vật 3D cập nhật ngay; kéo để xoay quanh bộ đồ.</p>
        </section>

        <section className="studio" aria-label="Studio phối đồ">
          <div className="stage-col">
            <div className="stage">
              <canvas
                ref={canvasRef}
                className="stage-canvas"
                onPointerDown={() => setHasRotated(true)}
                onWheel={() => setHasRotated(true)}
                aria-label={`Nhân vật 3D mặc ${garment.name}, màu áo ${colorName(COAT_COLORS, displayedLook.coatColor).toLowerCase()}. Kéo để xoay, cuộn để phóng to.`}
              />

              <div className="stage-caption">
                <h2>{garment.name}</h2>
                <p>Phong cách {STYLES[displayedLook.styleId].name.toLowerCase()}</p>
                {modelLoading && !sceneError
                  ? <p className="stage-status" role="status"><LoaderCircle size={13} className="spin" /> Đang tải mô hình chi tiết</p>
                  : showHotspots
                    ? <p className={`rotate-hint ${openedHotspot ? 'is-hidden' : ''}`} aria-hidden="true">{hasRotated ? 'Chạm điểm vàng trên áo để tìm hiểu chi tiết' : 'Kéo để xoay, chạm điểm vàng để tìm hiểu'}</p>
                    : <p className={`rotate-hint ${hasRotated ? 'is-hidden' : ''}`} aria-hidden="true">Kéo để xoay, cuộn để phóng to</p>}
              </div>

              {showHotspots && <div className="hotspots">
                {hotspots.map((item) => (
                  <button
                    type="button"
                    key={`${displayedLook.garmentId}-${item.id}`}
                    ref={(element) => {
                      if (element) hotspotRefs.current.set(item.id, element);
                      else hotspotRefs.current.delete(item.id);
                    }}
                    className={`hotspot is-hidden ${activeHotspot === item.id ? 'is-active' : ''}`}
                    onClick={() => openHotspot(item.id)}
                    aria-label={`Tìm hiểu: ${item.title}`}
                    aria-expanded={activeHotspot === item.id}
                  >
                    <span className="hotspot-dot" aria-hidden="true" />
                    <span className="hotspot-label" aria-hidden="true">{item.title}</span>
                  </button>
                ))}
              </div>}

              {hotspotInfo && (
                <section className="hotspot-card" aria-live="polite" aria-labelledby="hotspot-title">
                  <div className="hotspot-card-top">
                    <p className="tag tag-fact"><BookOpen size={13} /> Thông tin tư liệu</p>
                    <button type="button" className="icon-button" onClick={closeHotspot} aria-label="Đóng và quay về mặt trước"><X size={18} /></button>
                  </div>
                  <h3 id="hotspot-title">{hotspotInfo.title}</h3>
                  <p>{hotspotInfo.text}</p>
                  <a className="source-link" href={garment.source} target="_blank" rel="noopener noreferrer">Nguồn: {garment.sourceName} <ExternalLink size={14} /></a>
                  <div className="hotspot-others" role="group" aria-label="Chi tiết khác">
                    {hotspots.filter((item) => item.id !== hotspotInfo.id).map((item) => (
                      <button type="button" key={item.id} onClick={() => openHotspot(item.id)}>{item.title}</button>
                    ))}
                  </div>
                </section>
              )}

              <div className="stage-top-right">
                {compareA && (
                  <div className="ab-toggle" role="group" aria-label="Chuyển phương án đang xem">
                    {(['A', 'B'] as const).map((id) => (
                      <button type="button" key={id} className={compareView === id ? 'is-active' : ''} onClick={() => setCompareView(id)} aria-pressed={compareView === id}>
                        <span className="ab-dot" style={{ background: id === 'A' ? compareA.coatColor : look.coatColor }} />{id}
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" className="stage-chip stage-chip-toggle" onClick={toggleHotspots} aria-pressed={showHotspots} title={showHotspots ? 'Ẩn điểm kiến thức trên áo' : 'Hiện điểm kiến thức trên áo'}><BookOpen size={15} /> Điểm kiến thức</button>
                <button type="button" className="stage-chip" onClick={() => setReferenceId(displayedLook.garmentId)}><ImageIcon size={15} /> Ảnh tham khảo</button>
              </div>

              {sceneError && <div className="scene-error"><Layers3 size={26} /><strong>Không mở được mô hình 3D</strong><span>Hãy bật WebGL trong cài đặt trình duyệt hoặc thử trình duyệt khác.</span></div>}

              <div className="stage-bottom">
                <div className="stage-switch spin-switch">
                  <button type="button" className={spinning ? 'is-active' : ''} onClick={toggleSpin} aria-pressed={spinning} title={spinning ? 'Bấm lần nữa để dừng' : undefined}>Xoay 360°</button>
                </div>
                <div className="stage-switch view-switch" role="group" aria-label="Góc nhìn">
                  {([['front', 'Mặt trước'], ['back', 'Mặt sau'], ['detail', 'Cận cảnh']] as const).map(([id, label]) => (
                    <button type="button" key={id} className={activeView === id ? 'is-active' : ''} onClick={() => setView(id)} aria-pressed={activeView === id}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="stage-actions">
              <div className="action-group">
                <button type="button" className="btn btn-ghost" onClick={undo} disabled={!history.length}><Undo2 size={17} /><span>Hoàn tác</span></button>
                <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw size={16} /><span>Đặt lại</span></button>
              </div>
              <div className="action-group">
                <button type="button" className="btn btn-quiet" onClick={downloadImage} disabled={sceneError}><Download size={17} /><span>Tải ảnh</span></button>
                <button type="button" className="btn btn-primary" onClick={saveLook}><Save size={17} /><span>Lưu look</span></button>
              </div>
            </div>
          </div>

          <aside className="panel panel-start" aria-label="Dáng áo">
            <fieldset className="field">
              <legend>Dáng áo</legend>
              <div className="garment-grid">
                {(Object.entries(GARMENTS) as [GarmentId, typeof GARMENTS[GarmentId]][]).map(([id, item]) => (
                  <button type="button" key={id} className={`garment-card ${look.garmentId === id ? 'is-selected' : ''}`} onClick={() => update({ garmentId: id })} aria-pressed={look.garmentId === id}>
                    <img src={`/references/thumbs/${id}.jpg`} alt="" width={240} height={360} loading="lazy" />
                    <span className="garment-text"><strong>{item.name}</strong><small>{item.subtitle}</small></span>
                  </button>
                ))}
              </div>
            </fieldset>
          </aside>

          <aside className="panel panel-style" aria-label="Tùy chỉnh bộ đồ">
            <form className="field ai-field" onSubmit={(event) => { event.preventDefault(); generateAiDesign(); }} aria-busy={aiBusy}>
              <label className="ai-label" htmlFor="ai-prompt"><Sparkles size={16} /> Thiết kế bằng AI</label>
              <textarea
                id="ai-prompt"
                className="ai-input"
                rows={3}
                maxLength={500}
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); generateAiDesign(); } }}
                placeholder="Mô tả màu, họa tiết, cảm giác bạn muốn…"
                disabled={aiBusy}
              />
              {!aiPrompt && (
                <div className="ai-examples" aria-label="Gợi ý mô tả">
                  {AI_EXAMPLES.map((example) => (
                    <button type="button" key={example} onClick={() => setAiPrompt(example)} disabled={aiBusy}>{example}</button>
                  ))}
                </div>
              )}
              <button type="submit" className="btn btn-ink btn-block" disabled={aiBusy || !aiPrompt.trim()}>
                {aiBusy ? <><LoaderCircle size={16} className="spin" /> Gemini đang thiết kế…</> : <><Sparkles size={16} /> Tạo thiết kế</>}
              </button>
              {aiError && <p className="ai-error" role="alert">{aiError}</p>}
              {aiNote && !aiError && (
                <div className="ai-note" role="status">
                  <p className="tag tag-remix"><Sparkles size={13} /> Gợi ý của AI</p>
                  <p>{aiNote}</p>
                </div>
              )}
              <p className="help">AI chỉ chọn màu và họa tiết; bạn vẫn sửa được từng chi tiết bên dưới.</p>
            </form>

            <fieldset className="field">
              <legend>Phong cách</legend>
              <div className="segmented">
                {(Object.entries(STYLES) as [StyleId, typeof STYLES[StyleId]][]).map(([id, style]) => (
                  <button type="button" key={id} className={look.styleId === id ? 'is-selected' : ''} onClick={() => chooseStyle(id)} aria-pressed={look.styleId === id}>{style.name}</button>
                ))}
              </div>
              <p className="help">{STYLES[look.styleId].description}. Chọn một phong cách để có màu gợi ý, rồi chỉnh tiếp bên dưới.</p>
            </fieldset>

            <fieldset className="field">
              <legend>Màu sắc</legend>
              <ColorOptions label="Màu áo" colors={COAT_COLORS} value={look.coatColor} onChange={(coatColor) => update({ coatColor })} custom />
              <ColorOptions label={GARMENTS[look.garmentId].lowerLabel} colors={PANTS_COLORS} value={look.pantsColor} onChange={(pantsColor) => update({ pantsColor })} custom />
              {look.garmentId === 'tu-than' && (
                <>
                  <ColorOptions label="Màu yếm" colors={YEM_COLORS} value={look.yemColor} onChange={(yemColor) => update({ yemColor })} custom />
                  <ColorOptions label="Màu thắt lưng" colors={SASH_COLORS} value={look.sashColor} onChange={(sashColor) => update({ sashColor })} custom />
                  <ColorOptions label="Màu khăn" colors={SCARF_COLORS} value={look.scarfColor} onChange={(scarfColor) => update({ scarfColor })} custom />
                </>
              )}
            </fieldset>

            <fieldset className="field">
              <legend>Họa tiết</legend>
              <div className="pattern-grid">
                {BASE_PATTERNS.map((id) => (
                  <button type="button" key={id} className={`pattern-option ${look.patternId === id ? 'is-selected' : ''}`} onClick={() => choosePattern(id)} aria-pressed={look.patternId === id}>
                    <PatternSwatch base={id} color={look.coatColor} />
                    <span>{PATTERNS[id].name}</span>
                  </button>
                ))}
                {look.patternId === 'custom' && look.patternDesign && (
                  <button type="button" className="pattern-option is-selected" onClick={() => openPatternEditor('custom')} aria-pressed="true">
                    <PatternSwatch base={look.patternDesign.base} marks={look.patternDesign.marks} color={look.coatColor} />
                    <span>Của bạn</span>
                  </button>
                )}
              </div>
              <button type="button" className="btn btn-outline btn-block" onClick={() => openPatternEditor(look.patternId)}>
                <Paintbrush size={16} /> {look.patternId === 'custom' ? 'Sửa họa tiết của bạn' : 'Tự vẽ họa tiết'}
              </button>
            </fieldset>

          </aside>
        </section>

        <section className="learn" id="hieu-trang-phuc" aria-label="Hiểu trang phục">
          <article className="learn-card learn-fact">
            <p className="tag tag-fact"><BookOpen size={14} /> Thông tin tư liệu</p>
            <h2>{garment.name}</h2>
            <p className="learn-era">{garment.era}</p>
            <p className="learn-body">{garment.culture}</p>
            <dl className="facts">
              <div><dt>Đặc điểm nhận diện</dt><dd>{garment.feature.split(' · ').join(', ')}</dd></div>
            </dl>
            <a className="source-link" href={garment.source} target="_blank" rel="noopener noreferrer">Đọc thêm tại {garment.sourceName} <ExternalLink size={15} /></a>
          </article>

          <article className="learn-card learn-remix">
            <p className="tag tag-remix"><Paintbrush size={14} /> Gợi ý phối hiện đại</p>
            <h2>Bản phối {compareA ? `đang xem: phương án ${compareView}` : 'của bạn'}</h2>
            <p className="learn-body">{describeLook(displayedLook)}</p>
            <dl className="facts facts-grid">
              <div><dt>Phong cách</dt><dd>{STYLES[displayedLook.styleId].name}</dd></div>
              <div><dt>Họa tiết</dt><dd>{PATTERNS[displayedLook.patternId].name}</dd></div>
              <div><dt>Màu áo</dt><dd>{colorName(COAT_COLORS, displayedLook.coatColor)}</dd></div>
              <div><dt>{garment.lowerLabel}</dt><dd>{colorName(PANTS_COLORS, displayedLook.pantsColor)}</dd></div>
              {displayedLook.garmentId === 'tu-than' && (
                <div><dt>Yếm, thắt lưng, khăn</dt><dd>{colorName(YEM_COLORS, displayedLook.yemColor)}, {colorName(SASH_COLORS, displayedLook.sashColor).toLowerCase()}, {colorName(SCARF_COLORS, displayedLook.scarfColor).toLowerCase()}</dd></div>
              )}
            </dl>
            <div className="compare">
              <h3>So sánh hai phương án</h3>
              {compareA ? (
                <>
                  <p>Phương án A đã được ghim. Mọi thay đổi bây giờ thuộc phương án B; chuyển A/B ngay trên khung 3D.</p>
                  <div className="compare-actions">
                    <div className="segmented segmented-sm" role="group" aria-label="Chuyển phương án">
                      {(['A', 'B'] as const).map((id) => (
                        <button type="button" key={id} className={compareView === id ? 'is-selected' : ''} onClick={() => setCompareView(id)} aria-pressed={compareView === id}>
                          <span className="ab-dot" style={{ background: id === 'A' ? compareA.coatColor : look.coatColor }} /> Phương án {id}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn btn-ghost" onClick={() => { setCompareA(null); setCompareView('B'); }}>Bỏ ghim A</button>
                  </div>
                </>
              ) : (
                <>
                  <p>Ghim look hiện tại làm phương án A, phối thêm một bản khác rồi chuyển qua lại để chọn.</p>
                  <button type="button" className="btn btn-outline" onClick={pinCompareA}><Bookmark size={16} /> Ghim làm phương án A</button>
                </>
              )}
            </div>
          </article>
        </section>
      </main>

      <footer className="footer">
        <p><strong>Việt Phục Remix</strong> là bản demo phối đồ 3D. Mô hình chỉ để minh họa dáng áo, không phải bản phục dựng hiện vật.</p>
      </footer>

      {showLookbook && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLookbook(false); }}>
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="lookbook-title">
            <div className="drawer-header">
              <h2 id="lookbook-title">Lookbook <span className="count">{savedLooks.length}</span></h2>
              <button type="button" className="icon-button" onClick={() => setShowLookbook(false)} aria-label="Đóng lookbook" autoFocus><X size={20} /></button>
            </div>
            <p className="drawer-intro">Các look được lưu trong trình duyệt này. Mở một look để phối tiếp trên mô hình 3D.</p>
            {savedLooks.length === 0 ? (
              <div className="empty-state">
                <Bookmark size={30} strokeWidth={1.4} />
                <h3>Chưa có look nào</h3>
                <p>Phối một bộ trong studio rồi bấm “Lưu look”. Look sẽ xuất hiện ở đây.</p>
                <button type="button" className="btn btn-outline" onClick={() => setShowLookbook(false)}>Quay lại studio</button>
              </div>
            ) : (
              <ul className="saved-list">
                {savedLooks.map((saved) => (
                  <li className="saved-card" key={saved.id}>
                    <div className="saved-art" style={{ '--saved-color': saved.look.coatColor, '--saved-pants': saved.look.pantsColor } as React.CSSProperties} aria-hidden="true"><span className="saved-coat" /><span className="saved-pants" /></div>
                    <div className="saved-info">
                      <strong>{GARMENTS[saved.look.garmentId].name}</strong>
                      <span>{STYLES[saved.look.styleId].name}, {colorName(COAT_COLORS, saved.look.coatColor).toLowerCase()}</span>
                      <small>Lưu ngày {new Date(saved.savedAt).toLocaleDateString('vi-VN')}</small>
                    </div>
                    <div className="saved-actions">
                      <button type="button" className="btn btn-quiet" onClick={() => loadLook(saved)}>Mở look</button>
                      <button type="button" className="icon-button" onClick={() => deleteLook(saved)} aria-label={`Xóa ${saved.name}`} title="Xóa look"><X size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}

      {showAbout && (
        <div className="modal-backdrop modal-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAbout(false); }}>
          <div className="dialog about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <button type="button" className="icon-button dialog-close" onClick={() => setShowAbout(false)} aria-label="Đóng" autoFocus><X size={20} /></button>
            <h2 id="about-title">Về dự án</h2>
            <p>Việt Phục Remix là bản demo phối đồ 3D dành cho người trẻ. Hai dáng áo trong ứng dụng được minh họa để tìm hiểu và thử phong cách; màu sắc và họa tiết là gợi ý sáng tạo đương đại.</p>
            <p>Thông tin văn hóa được viết ngắn gọn và dẫn tới nguồn bảo tàng. Mô hình 3D không thay thế hiện vật, nghiên cứu hay tư vấn từ người am hiểu trang phục truyền thống.</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowAbout(false)}><ArrowLeft size={16} /> Quay lại studio</button>
          </div>
        </div>
      )}

      {referenceId && (
        <div className="modal-backdrop modal-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setReferenceId(null); }}>
          <div className="dialog reference-dialog" role="dialog" aria-modal="true" aria-labelledby="reference-title">
            <button type="button" className="icon-button dialog-close" onClick={() => setReferenceId(null)} aria-label="Đóng ảnh tham khảo" autoFocus><X size={20} /></button>
            <div className="reference-image"><img src={`/references/${referenceId}-concept.png`} alt={`Ảnh dựng ý tưởng cho ${REFERENCES[referenceId].name}`} /></div>
            <div className="reference-text">
              <h2 id="reference-title">{REFERENCES[referenceId].name}</h2>
              <p>{REFERENCES[referenceId].description} Ảnh được tạo bằng AI, không phải tư liệu lịch sử.</p>
              <div className="reference-options" role="group" aria-label="Chọn ảnh ý tưởng">
                {(Object.entries(REFERENCES) as [ReferenceId, typeof REFERENCES[ReferenceId]][]).map(([id, item]) => (
                  <button type="button" key={id} className={referenceId === id ? 'is-active' : ''} onClick={() => setReferenceId(id)} aria-pressed={referenceId === id}>{item.name}</button>
                ))}
              </div>
              <button type="button" className="btn btn-outline" onClick={() => setReferenceId(null)}>Quay lại mô hình 3D</button>
            </div>
          </div>
        </div>
      )}

      {patternDraft && <PatternEditor initial={patternDraft} coatColor={look.coatColor} onApply={applyPatternDesign} onClose={() => setPatternDraft(null)} />}

      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    </div>
  );
}

export default App;
