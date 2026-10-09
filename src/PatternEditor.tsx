import { useEffect, useRef, useState } from 'react';
import { Check, Eraser, Paintbrush, RotateCcw, X } from 'lucide-react';
import type { PatternBaseId, PatternDesign, PatternIconId, PatternMark } from './data';
import { drawPatternArt, INK_COLORS, PATTERN_CANVAS_SIZE } from './patternArt';

type Stroke = Extract<PatternMark, { type: 'stroke' }>;
type EditorTool = 'brush' | 'icon' | 'symbol';

const ICONS: { id: PatternIconId; glyph: string; label: string }[] = [
  { id: 'flower', glyph: '✿', label: 'Hoa' },
  { id: 'star', glyph: '☆', label: 'Sao' },
  { id: 'leaf', glyph: '❧', label: 'Lá' },
  { id: 'heart', glyph: '♡', label: 'Tim' },
  { id: 'sun', glyph: '☼', label: 'Mặt trời' },
  { id: 'diamond', glyph: '◇', label: 'Kim cương' },
];

export function PatternEditor({ initial, coatColor, onApply, onClose }: {
  initial: PatternDesign;
  coatColor: string;
  onApply: (design: PatternDesign) => void;
  onClose: () => void;
}) {
  const [base, setBase] = useState<PatternBaseId>(initial.base);
  const [marks, setMarks] = useState<PatternMark[]>(initial.marks);
  const [tool, setTool] = useState<EditorTool>('brush');
  const [icon, setIcon] = useState<PatternIconId>('flower');
  const [symbol, setSymbol] = useState('🌸');
  const [ink, setInk] = useState(INK_COLORS[0]);
  const [brushSize, setBrushSize] = useState(7);
  const [stampSize, setStampSize] = useState(60);
  const [revision, setRevision] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokeRef = useRef<Stroke | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = coatColor;
    context.fillRect(0, 0, PATTERN_CANVAS_SIZE, PATTERN_CANVAS_SIZE);
    context.strokeStyle = 'rgba(255,255,255,.32)';
    context.lineWidth = 2;
    context.setLineDash([9, 9]);
    context.strokeRect(15, 15, PATTERN_CANVAS_SIZE - 30, PATTERN_CANVAS_SIZE - 30);
    context.setLineDash([]);
    drawPatternArt(context, base, strokeRef.current ? [...marks, strokeRef.current] : marks);
  }, [base, marks, coatColor, revision]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  function position(event: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const box = event.currentTarget.getBoundingClientRect();
    return [
      Number(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)).toFixed(4)),
      Number(Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)).toFixed(4)),
    ];
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const [x, y] = position(event);
    if (tool === 'brush') {
      strokeRef.current = { type: 'stroke', points: [[x, y]], color: ink, size: brushSize };
      event.currentTarget.setPointerCapture(event.pointerId);
      setRevision((value) => value + 1);
    } else if (marks.length < 80) {
      const mark: PatternMark = tool === 'icon'
        ? { type: 'icon', icon, x, y, color: ink, size: stampSize }
        : { type: 'symbol', text: symbol.trim().slice(0, 12) || '✦', x, y, color: ink, size: stampSize };
      setMarks((items) => [...items, mark]);
    }
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = strokeRef.current;
    if (!stroke || stroke.points.length >= 160) return;
    const point = position(event);
    const previous = stroke.points[stroke.points.length - 1];
    if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 0.002) return;
    stroke.points.push(point);
    setRevision((value) => value + 1);
  }

  function pointerUp() {
    const stroke = strokeRef.current;
    if (!stroke) return;
    strokeRef.current = null;
    setMarks((items) => [...items, stroke].slice(-80));
  }

  function undo() {
    strokeRef.current = null;
    setMarks((items) => items.slice(0, -1));
    setRevision((value) => value + 1);
  }

  function clear() {
    strokeRef.current = null;
    setBase('plain');
    setMarks([]);
    setRevision((value) => value + 1);
  }

  return (
    <div className="modal-backdrop modal-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="pattern-editor" role="dialog" aria-modal="true" aria-labelledby="pattern-editor-title">
        <div className="pattern-editor-header">
          <div><h2 id="pattern-editor-title">Vẽ họa tiết lên áo</h2><p>Chọn mẫu nền, vẽ tự do hoặc đặt icon. Thiết kế được in lên mặt trước áo 3D.</p></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng editor họa tiết" autoFocus><X size={20} /></button>
        </div>
        <div className="pattern-editor-body">
          <div className="pattern-board-wrap">
            <div className="pattern-board-label"><span>Mặt trước áo</span><span>Chạm hoặc kéo để vẽ</span></div>
            <canvas ref={canvasRef} className="pattern-board" width={PATTERN_CANVAS_SIZE} height={PATTERN_CANVAS_SIZE} aria-label="Vùng vẽ họa tiết" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
            <p>Vùng trong nét đứt hiện rõ nhất trên áo. Màu nền là màu áo hiện tại.</p>
          </div>
          <div className="pattern-tools">
            <div className="pattern-tool-group"><strong>Mẫu nền</strong><div className="pattern-base-options">{([['plain', 'Trơn'], ['lotus', 'Hoa'], ['lines', 'Nét giao']] as [PatternBaseId, string][]).map(([id, label]) => <button type="button" key={id} className={base === id ? 'active' : ''} onClick={() => setBase(id)} aria-pressed={base === id}>{label}</button>)}</div></div>
            <div className="pattern-tool-group"><strong>Công cụ</strong><div className="pattern-tool-options"><button type="button" className={tool === 'brush' ? 'active' : ''} onClick={() => setTool('brush')} aria-pressed={tool === 'brush'}><Paintbrush size={16} /> Vẽ</button><button type="button" className={tool === 'icon' ? 'active' : ''} onClick={() => setTool('icon')} aria-pressed={tool === 'icon'}>✿ Icon</button><button type="button" className={tool === 'symbol' ? 'active' : ''} onClick={() => setTool('symbol')} aria-pressed={tool === 'symbol'}>✦ Ký tự</button></div></div>
            {tool === 'icon' && <div className="pattern-tool-group"><strong>Chọn icon rồi chạm vào vải</strong><div className="pattern-icon-grid">{ICONS.map((item) => <button type="button" key={item.id} className={icon === item.id ? 'active' : ''} onClick={() => setIcon(item.id)} title={item.label} aria-label={`Icon ${item.label}`} aria-pressed={icon === item.id}>{item.glyph}</button>)}</div></div>}
            {tool === 'symbol' && <div className="pattern-tool-group"><label htmlFor="pattern-symbol">Dán emoji hoặc ký tự bất kỳ</label><input id="pattern-symbol" className="pattern-symbol-input" type="text" maxLength={12} value={symbol} onChange={(event) => setSymbol(event.target.value)} placeholder="🌸" /><small>Nhập ký tự rồi chạm vào vùng vải để đặt.</small></div>}
            <div className="pattern-tool-group"><strong>Màu mực</strong><div className="pattern-ink-row">{INK_COLORS.map((color) => <button type="button" key={color} className={ink === color ? 'active' : ''} style={{ '--ink': color } as React.CSSProperties} onClick={() => setInk(color)} aria-label={`Màu mực ${color}`} aria-pressed={ink === color} />)}<label title="Chọn màu mực khác"><input type="color" value={ink} onChange={(event) => setInk(event.target.value)} aria-label="Màu mực tùy chọn" /><span>+</span></label></div></div>
            <div className="pattern-tool-group"><label htmlFor="pattern-size">{tool === 'brush' ? 'Độ dày nét' : 'Cỡ icon'}: {tool === 'brush' ? brushSize : stampSize}px</label><input id="pattern-size" type="range" min={tool === 'brush' ? 2 : 24} max={tool === 'brush' ? 30 : 100} value={tool === 'brush' ? brushSize : stampSize} onChange={(event) => tool === 'brush' ? setBrushSize(Number(event.target.value)) : setStampSize(Number(event.target.value))} /></div>
            <div className="pattern-edit-actions"><button type="button" onClick={undo} disabled={!marks.length}><RotateCcw size={15} /> Hoàn tác nét</button><button type="button" onClick={clear}><Eraser size={15} /> Xóa tất cả</button></div>
          </div>
        </div>
        <div className="pattern-editor-footer"><span>{marks.length} nét / icon đã thêm</span><div><button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button><button type="button" className="btn btn-primary" onClick={() => onApply({ base, marks })}><Check size={16} /> Áp lên áo</button></div></div>
      </div>
    </div>
  );
}
