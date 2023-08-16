import { createCanvas } from 'canvas';
import { DISPLAY, Point, Size } from './controller';

export interface CanvasOptions {
  position?: Point;
  size?: Size;
}

export function newCanvas(options?: CanvasOptions) {
  const { x = 0, y = 0 } = options?.position || {};
  const { w = DISPLAY.width, h = DISPLAY.height } = options?.size || {};

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d', { pixelFormat: 'RGB16_565' });

  return {
    canvas,
    ctx,
    position: { x, y },
    size: { w, h },
  };
}