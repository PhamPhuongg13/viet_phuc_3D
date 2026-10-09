import type { PatternBaseId, PatternIconId, PatternMark } from './data';

export const PATTERN_CANVAS_SIZE = 512;
export const INK_COLORS = ['#e7c786', '#fff2d7', '#633e36', '#243d36', '#be6e67', '#758ab0'];

function drawPreset(context: CanvasRenderingContext2D, base: PatternBaseId) {
  if (base === 'plain') return;
  context.save();
  context.translate(256, 265);
  context.strokeStyle = '#d7b77e';
  context.fillStyle = '#d7b77e';
  context.lineWidth = 5;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (base === 'lotus') {
    for (const direction of [-1, 0, 1]) {
      context.beginPath();
      context.moveTo(0, 12);
      context.bezierCurveTo(direction * 14 - 16, -9, direction * 25 - 9, -28, direction * 24, -47);
      context.bezierCurveTo(direction * 32 + 8, -20, direction * 28 + 18, -2, 0, 12);
      context.stroke();
    }
    context.beginPath();
    context.moveTo(-53, 2);
    context.quadraticCurveTo(0, 39, 53, 2);
    context.moveTo(0, 18);
    context.lineTo(0, 73);
    context.moveTo(0, 51);
    context.quadraticCurveTo(-21, 28, -37, 42);
    context.quadraticCurveTo(-26, 57, 0, 51);
    context.stroke();
  } else {
    for (let row = 0; row < 3; row++) {
      const y = row * 28 - 34;
      context.beginPath();
      context.moveTo(-59, y);
      context.lineTo(-21, y + 13);
      context.lineTo(0, y + 2);
      context.lineTo(23, y + 13);
      context.lineTo(59, y);
      context.stroke();
      context.beginPath();
      context.arc(0, y + 2, 3.8, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

function drawIcon(context: CanvasRenderingContext2D, icon: PatternIconId, x: number, y: number, size: number, color: string) {
  context.save();
  context.translate(x, y);
  context.scale(size / 60, size / 60);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (icon === 'flower') {
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      context.beginPath();
      context.ellipse(Math.cos(angle) * 16, Math.sin(angle) * 16, 10, 15, angle - Math.PI / 2, 0, Math.PI * 2);
      context.stroke();
    }
    context.beginPath();
    context.arc(0, 0, 6, 0, Math.PI * 2);
    context.fill();
  } else if (icon === 'star') {
    context.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? 28 : 11;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.stroke();
  } else if (icon === 'leaf') {
    context.beginPath();
    context.moveTo(-24, 24);
    context.bezierCurveTo(-26, -12, 0, -28, 25, -25);
    context.bezierCurveTo(28, 0, 15, 24, -24, 24);
    context.moveTo(-24, 24);
    context.quadraticCurveTo(0, 0, 24, -24);
    context.stroke();
  } else if (icon === 'heart') {
    context.beginPath();
    context.moveTo(0, 24);
    context.bezierCurveTo(-42, -3, -23, -34, 0, -13);
    context.bezierCurveTo(23, -34, 42, -3, 0, 24);
    context.closePath();
    context.stroke();
  } else if (icon === 'sun') {
    context.beginPath();
    context.arc(0, 0, 12, 0, Math.PI * 2);
    context.stroke();
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      context.beginPath();
      context.moveTo(Math.cos(angle) * 19, Math.sin(angle) * 19);
      context.lineTo(Math.cos(angle) * 29, Math.sin(angle) * 29);
      context.stroke();
    }
  } else {
    context.beginPath();
    context.moveTo(0, -29);
    context.lineTo(26, 0);
    context.lineTo(0, 29);
    context.lineTo(-26, 0);
    context.closePath();
    context.moveTo(0, -29);
    context.lineTo(0, 29);
    context.stroke();
  }
  context.restore();
}

export function drawPatternArt(context: CanvasRenderingContext2D, base: PatternBaseId, marks: PatternMark[]) {
  drawPreset(context, base);
  for (const mark of marks) {
    if (mark.type === 'stroke') {
      context.save();
      context.strokeStyle = mark.color;
      context.fillStyle = mark.color;
      context.lineWidth = mark.size;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      if (mark.points.length === 1) {
        context.beginPath();
        context.arc(mark.points[0][0] * 512, mark.points[0][1] * 512, mark.size / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        mark.points.forEach(([x, y], index) => {
          if (index === 0) context.moveTo(x * 512, y * 512);
          else context.lineTo(x * 512, y * 512);
        });
        context.stroke();
      }
      context.restore();
    } else if (mark.type === 'icon') {
      drawIcon(context, mark.icon, mark.x * 512, mark.y * 512, mark.size, mark.color);
    } else {
      context.save();
      context.fillStyle = mark.color;
      context.font = `${mark.size}px "Apple Color Emoji", "Segoe UI Emoji", Georgia, serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(mark.text, mark.x * 512, mark.y * 512);
      context.restore();
    }
  }
}
