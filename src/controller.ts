import { createCanvas } from 'canvas';
import { COMMANDS, DISPLAY } from './constants';
import { Serial } from './serial';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

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

export interface DrawBufferProps {
  position: Point;
  size: Size;
}

export async function sendDrawBuffer(buffer: Buffer, options: DrawBufferProps) {
  const { x = 0, y = 0 } = options.position;
  const { w = DISPLAY.width, h = DISPLAY.height } = options.size;
  const header = Buffer.alloc(8);
  header.writeUInt16BE(x, 0);
  header.writeUInt16BE(y, 2);
  header.writeUInt16BE(w, 4);
  header.writeUInt16BE(h, 6);

  const serial = await Serial.get();

  // Write to frame buffer
  await serial.send(COMMANDS.FRAMEBUFF, Buffer.concat([DISPLAY.id, header, buffer]));
}

export async function sendDrawRender() {
  const serial = await Serial.get();
  await serial.send(COMMANDS.DRAW, DISPLAY.id);
}
