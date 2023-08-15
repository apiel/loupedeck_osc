import { COMMANDS, HAPTIC } from './constants';
import { newCanvas, sendDrawBuffer, sendDrawRender, sendVibration } from './controller';
import { Serial } from './serial';

async function drawSomething() {
  const size = { w: 90, h: 90 };

  const {ctx, canvas, position } = newCanvas({ size });
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, size.w, size.h);
  const buffer = canvas.toBuffer('raw');

  await sendDrawBuffer(buffer, { position, size });
  await sendDrawRender();
}

async function main() {
  const serial = await Serial.get();

  await sendVibration(HAPTIC.LONG);
  await drawSomething();

  for await (const data of serial.receive()) {
    console.log('Received data:');
    for (let i = 0; i < data.length; i += 16) {
      const line = data.subarray(i, i + 16).toString('hex');
      console.log(line);
      if (line === '0500000800') {
        console.log('pressed 1');
        // await drawSomething();
        await sendVibration(HAPTIC.SHORT);
      }
    }
  }
}

main();
