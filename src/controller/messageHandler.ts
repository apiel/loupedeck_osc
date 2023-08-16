import { BUTTONS_BY_ID, Button, COMMANDS } from './constants';
import { Serial } from './serial';
import { Point } from './types';

interface TouchState {
  multitouch: number;
  position: Point;
  origin: Point;
  moved: boolean;
  startTime: number;
}

const touchStates = new Map<number, TouchState>();

export interface MessageHandlerCallback {
  onButton: (button: Button, event: 'down' | 'up') => void | Promise<void>;
  onKnob: (knob: Button, direction: number) => void | Promise<void>;
  onTouch: (state: TouchState, event: 'touch' | 'release') => void | Promise<void>;
}

export function handleMessage(data: Buffer, { onButton, onKnob, onTouch }: MessageHandlerCallback) {
  const touchHandler = (event: 'touch' | 'release') => (data: Buffer) => {
    const multitouch = data.readUInt16BE(2);
    const x = data.readUInt16BE(4);
    const y = data.readUInt16BE(6);
    let state = touchStates.get(multitouch);
    if (!state) {
      state = {
        multitouch,
        position: { x, y },
        origin: { x, y },
        moved: false,
        startTime: Date.now(),
      };
      touchStates.set(multitouch, state);
    } else if (event === 'release') {
        touchStates.delete(multitouch);
    } else {
      state.moved = true;
    }
    state.position = { x, y };

    // console.log(`Touch ${event}`, state);
    return onTouch(state, event);
  };
  const handlers = {
    [COMMANDS.BUTTON_PRESS]: (data: Buffer) => {
      const id = Number(data[3]);
      const button = BUTTONS_BY_ID[id];
      const event = data[4] === 0x00 ? 'down' : 'up';
      // console.log(`Button`, { button, event });
      return onButton(button, event);
    },
    [COMMANDS.KNOB_ROTATE]: (data: Buffer) => {
      const id = Number(data[3]);
      const knob = BUTTONS_BY_ID[id];
      const direction = data.readInt8(4);
      // console.log(`Knob ${id} rotated ${direction}`, knob);
      return onKnob(knob, direction);
    },
    [COMMANDS.TOUCH]: touchHandler('touch'),
    [COMMANDS.TOUCH_END]: touchHandler('release'),
  };

  const command = data[1];
  const handler = handlers[command];
  if (handler) {
    return handler(data);
  } else {
    console.log(`Unhandled command: ${command}`);
  }
}

export async function setMessageHandler(handler: MessageHandlerCallback) {
  const serial = await Serial.get();
  serial.onReceive = (data) => handleMessage(data, handler);
}
