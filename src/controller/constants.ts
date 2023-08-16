export const COMMANDS = {
  BUTTON_PRESS: 0x00,
  KNOB_ROTATE: 0x01,
  SET_COLOR: 0x02,
  SERIAL: 0x03,
  RESET: 0x06,
  VERSION: 0x07,
  SET_BRIGHTNESS: 0x09,
  FRAMEBUFF: 0x10,
  SET_VIBRATION: 0x1b,
  MCU: 0x0d,
  DRAW: 0x0f,
  TOUCH: 0x4d,
  TOUCH_CT: 0x52,
  TOUCH_END: 0x6d,
  TOUCH_END_CT: 0x72,
};

export enum HAPTIC {
  SHORT = 0x01,
  MEDIUM = 0x0a,
  LONG = 0x0f,
  LOW = 0x31,
  SHORT_LOW = 0x32,
  SHORT_LOWER = 0x33,
  LOWER = 0x40,
  LOWEST = 0x41,
  DESCEND_SLOW = 0x46,
  DESCEND_MED = 0x47,
  DESCEND_FAST = 0x48,
  ASCEND_SLOW = 0x52,
  ASCEND_MED = 0x53,
  ASCEND_FAST = 0x58,
  REV_SLOWEST = 0x5e,
  REV_SLOW = 0x5f,
  REV_MED = 0x60,
  REV_FAST = 0x61,
  REV_FASTER = 0x62,
  REV_FASTEST = 0x63,
  RISE_FALL = 0x6a,
  BUZZ = 0x70,
  RUMBLE5 = 0x77, // lower frequencies in descending order
  RUMBLE4 = 0x78,
  RUMBLE3 = 0x79,
  RUMBLE2 = 0x7a,
  RUMBLE1 = 0x7b,
  VERY_LONG = 0x76, // 10 sec high freq (!)
}

export const BRIGHTNESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type BRIGHTNESS = (typeof BRIGHTNESS)[number];

export interface Button {
  id: number;
  label: string;
  isKnob: boolean;
}

export const BUTTONS: { [key: string]: Button } = {
  knob1: { id: 0x01, label: 'knob1', isKnob: true },
  knob2: { id: 0x02, label: 'knob2', isKnob: true },
  knob3: { id: 0x03, label: 'knob3', isKnob: true },
  knob4: { id: 0x04, label: 'knob4', isKnob: true },
  knob5: { id: 0x05, label: 'knob5', isKnob: true },
  knob6: { id: 0x06, label: 'knob6', isKnob: true },
  button0: { id: 0x07, label: 'button0', isKnob: false },
  button1: { id: 0x08, label: 'button1', isKnob: false },
  button2: { id: 0x09, label: 'button2', isKnob: false },
  button3: { id: 0x0a, label: 'button3', isKnob: false },
  button4: { id: 0x0b, label: 'button4', isKnob: false },
  button5: { id: 0x0c, label: 'button5', isKnob: false },
  button6: { id: 0x0d, label: 'button6', isKnob: false },
  button7: { id: 0x0e, label: 'button7', isKnob: false },
};

export const BUTTONS_BY_ID = Object.values(BUTTONS).reduce((acc, button) => {
  acc[button.id] = button;
  return acc;
}, {} as { [key: number]: Button });

export const DISPLAY = {
  id: Buffer.from('\x00M'),
  width: 480,
  height: 270, // 280 ??
};
