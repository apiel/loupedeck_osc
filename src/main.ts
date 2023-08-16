import {
  newCanvas,
  sendBrightness,
  sendButtonColor,
  sendFramebuffer,
  sendDrawRender,
  sendVibration,
  BUTTONS,
  HAPTIC,
  handleMessage,
} from './controller';

// TODO maybe we can get rid of this
import { Serial } from './controller/serial';

async function drawSomething() {
  const size = { w: 90, h: 90 };

  const { ctx, canvas, position } = newCanvas({ size });
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, size.w, size.h);
  const buffer = canvas.toBuffer('raw');

  await sendFramebuffer(buffer, { position, size });
  await sendDrawRender();
}

async function main() {
  const serial = await Serial.get();

  await sendBrightness(10);
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
        await sendBrightness(1);
      } else if (line === '0500000900') {
        sendButtonColor(BUTTONS.button2, {
          r: Math.floor(Math.random() * 256),
          g: Math.floor(Math.random() * 256),
          b: Math.floor(Math.random() * 256),
        });
      }
    }
    console.log('Use handler:');
    handleMessage(data);
  }
}

main();
