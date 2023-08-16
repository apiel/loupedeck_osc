import { createCanvas } from 'canvas';
import { COMMANDS, DISPLAY, HAPTIC, BRIGHTNESS, BUTTONS, Button, BUTTONS_BY_ID } from './constants';
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

export async function sendFramebuffer(buffer: Buffer, options: DrawBufferProps) {
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

export async function sendVibration(vibration: HAPTIC) {
  const serial = await Serial.get();
  await serial.send(COMMANDS.SET_VIBRATION, Buffer.from([vibration]));
}

export async function sendBrightness(brightness: BRIGHTNESS) {
  const serial = await Serial.get();
  await serial.send(COMMANDS.SET_BRIGHTNESS, Buffer.from([brightness]));
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

export async function sendButtonColor({ id }: Button, { r, g, b }: Color) {
  const serial = await Serial.get();
  const data = Buffer.from([id, r, g, b]);
  await serial.send(COMMANDS.SET_COLOR, data);
}

// TODO message parser
const handlers = {
  [COMMANDS.BUTTON_PRESS]: (data: Buffer) => {
    const id = Number(data[3]);
    const button = BUTTONS_BY_ID[id];
    const event = data[4] === 0x00 ? 'down' : 'up';
    console.log(`Button`, { button, event });
  },
  [COMMANDS.KNOB_ROTATE]: (data: Buffer) => {
    const id = Number(data[3]);
    const knob = BUTTONS_BY_ID[id];
    const direction = data.readInt8(4);
    console.log(`Knob ${id} rotated ${direction}`, knob);
  },
  [COMMANDS.TOUCH]: (data: Buffer) => {
    const multitouch = data.readUInt16BE(2);
    const x = data.readUInt16BE(4);
    const y = data.readUInt16BE(6);
    console.log(`Touch ${multitouch} start ${x}, ${y}:`, data.toString('hex'));
  },
  [COMMANDS.TOUCH_END]: (data: Buffer) => {
    const multitouch = data.readUInt16BE(2);
    const x = data.readUInt16BE(4);
    const y = data.readUInt16BE(6);
    console.log(`Touch ${multitouch} end ${x}, ${y}:`, data.toString('hex'));
  },
};

export function handleMessage(data: Buffer) {
  const command = data[1];
  const handler = handlers[command];
  if (handler) {
    handler(data);
  } else {
    console.log(`Unhandled command: ${command}`);
  }
}
