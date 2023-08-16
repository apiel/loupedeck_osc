import { BRIGHTNESS, Button, COMMANDS, DISPLAY, HAPTIC } from './constants';
import { Serial } from './serial';
import { Color, Point, Size } from './types';

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

export async function sendButtonColor({ id }: Button, { r, g, b }: Color) {
  const serial = await Serial.get();
  const data = Buffer.from([id, r, g, b]);
  await serial.send(COMMANDS.SET_COLOR, data);
}
