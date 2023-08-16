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
  BRIGHTNESS,
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
    await handleMessage(data, {
      onButton: async (button, event) => {
        console.log('Button event:', button, event);
        if (button.id === BUTTONS.button1.id) {
          await sendVibration(HAPTIC.SHORT);
          await sendBrightness((Math.floor(Math.random() * 10) + 1) as BRIGHTNESS);
        } else if (button.id === BUTTONS.button2.id) {
          sendButtonColor(BUTTONS.button2, {
            r: Math.floor(Math.random() * 256),
            g: Math.floor(Math.random() * 256),
            b: Math.floor(Math.random() * 256),
          });
        }
      },
      onKnob: (knob, direction) => {
        console.log('Knob event:', knob, direction);
      },
      onTouch: (state, event) => {
        console.log('Touch event:', state, event);
      },
    });
  }
}

main();
