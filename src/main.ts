import { createCanvas } from 'canvas';
import { Serial } from './serial';
import { COMMANDS, HAPTIC } from './constants';

const displays = {
  center: { id: Buffer.from('\x00A'), width: 360, height: 270 }, // "A"
  left: { id: Buffer.from('\x00L'), width: 60, height: 270 }, // "L"
  right: { id: Buffer.from('\x00R'), width: 60, height: 270 }, // "R"
};

async function drawSomething() {
  const canvas = createCanvas(100, 200);
  const ctx = canvas.getContext('2d', { pixelFormat: 'RGB16_565' });
  ctx.fillStyle = 'red';

  const x = 0;
  const y = 0;
  const w = 100;
  const h = 200;
  ctx.fillRect(0, 0, w, h);
  const buffer = canvas.toBuffer('raw');

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

  await serial.send(COMMANDS.SET_VIBRATION, Buffer.from([HAPTIC.LONG]))
  await drawSomething();

  for await (const data of serial.receive()) {
    console.log('Received data:');
    for (let i = 0; i < data.length; i += 16) {
      const line = data.subarray(i, i + 16).toString('hex');
      console.log(line);
      if (line === '0500000800') {
        console.log('pressed 1');
        // await drawSomething();
        await serial.send(COMMANDS.SET_VIBRATION, Buffer.from([HAPTIC.SHORT]))
      }
    }
  }
}

main();
