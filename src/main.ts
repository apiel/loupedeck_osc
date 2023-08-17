import {
  sendBrightness,
  sendButtonColor,
  sendFramebuffer,
  sendDrawRender,
  sendVibration,
  BUTTONS,
  HAPTIC,
  BRIGHTNESS,
  setMessageHandler,
  KNOBS,
} from './controller';
import { newCanvas } from './draw';
import { sendOscMidi } from './osc';

async function drawSomething() {
  const size = { w: 90, h: 90 };

  const { ctx, canvas, position } = newCanvas({ size });
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, size.w, size.h);
  const buffer = canvas.toBuffer('raw');

  await sendFramebuffer(buffer, { position, size });
  await sendDrawRender();
}

let SAMPLE_RATE_REDUCER = 0;
async function main() {
  await sendBrightness(10);
  await sendVibration(HAPTIC.LONG);
  await drawSomething();

  setMessageHandler({
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
      if (knob.id === KNOBS.knob1.id) {
        SAMPLE_RATE_REDUCER += direction;
        if (SAMPLE_RATE_REDUCER < 0) {
          SAMPLE_RATE_REDUCER = 0;
        } else if (SAMPLE_RATE_REDUCER > 128) {
          SAMPLE_RATE_REDUCER = 128;
        }
        console.log('SAMPLE_RATE_REDUCER', SAMPLE_RATE_REDUCER);
        sendOscMidi([0xb0, 0x4a, SAMPLE_RATE_REDUCER]);
      }
    },
    onTouch: (state, event) => {
      console.log('Touch event:', state, event);
    },
  });
}

main();
