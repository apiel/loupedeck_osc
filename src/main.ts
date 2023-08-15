import { createCanvas } from 'canvas';
import { Serial } from './serial';
import { COMMANDS, HAPTIC } from './constants';
import { writeFileSync } from 'fs';

const displays = {
  center: { id: Buffer.from('\x00M'), width: 360, height: 270, offset: [60, 0] },
  left: { id: Buffer.from('\x00M'), width: 60, height: 270 },
  right: { id: Buffer.from('\x00M'), width: 60, height: 270, offset: [420, 0] },
};

async function drawSomething() {
  const x = 0;
  const y = 0;
  // const w = 100;
  // const h = 200;
  const w = 90;
  const h = 90;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d', { pixelFormat: 'RGB16_565' });
  ctx.fillStyle = 'blue';
  ctx.fillRect(0, 0, w, h);
  const buffer = canvas.toBuffer('raw');

  console.log(`Buff len ${buffer.length}`)
  // // save buffer to file
  // const bufferPng = canvas.toBuffer("image/png");
  // writeFileSync("./image.png", bufferPng);

  // should we care?
  const pixelCount = w * h * 2;
  if (buffer.length !== pixelCount) {
    throw new Error(`Expected buffer length of ${pixelCount}, got ${buffer.length}!`);
  }

  const header = Buffer.alloc(8);
  header.writeUInt16BE(x, 0);
  header.writeUInt16BE(y, 2);
  header.writeUInt16BE(w, 4);
  header.writeUInt16BE(h, 6);

  const serial = await Serial.get();

  // Write to frame buffer
  await serial.send(COMMANDS.FRAMEBUFF, Buffer.concat([displays.center.id, header, buffer]));

  // Draw to display
  await serial.send(COMMANDS.DRAW, displays.center.id);
}

async function main() {
  const serial = await Serial.get();

  await serial.send(COMMANDS.SET_VIBRATION, Buffer.from([HAPTIC.LONG]));
  await drawSomething();

  for await (const data of serial.receive()) {
    console.log('Received data:');
    for (let i = 0; i < data.length; i += 16) {
      const line = data.subarray(i, i + 16).toString('hex');
      console.log(line);
      if (line === '0500000800') {
        console.log('pressed 1');
        // await drawSomething();
        await serial.send(COMMANDS.SET_VIBRATION, Buffer.from([HAPTIC.SHORT]));
      }
    }
  }
}

main();
