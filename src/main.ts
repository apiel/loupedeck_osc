import { createCanvas } from 'canvas';
import { getSerial } from './serial';

const COMMANDS = {
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

const displays = {
  center: { id: Buffer.from('\x00A'), width: 360, height: 270 }, // "A"
  left: { id: Buffer.from('\x00L'), width: 60, height: 270 }, // "L"
  right: { id: Buffer.from('\x00R'), width: 60, height: 270 }, // "R"
};

let transactionID = 0;
async function send(command: number, data = Buffer.alloc(0)) {
  transactionID = (transactionID + 1) % 256;
  // Skip transaction ID's of zero since the device seems to ignore them
  if (transactionID === 0) transactionID++;
  const header = Buffer.alloc(3);
  header[0] = Math.min(3 + data.length, 0xff);
  header[1] = command;
  header[2] = transactionID;
  const packet = Buffer.concat([header, data]);
  const serial = await getSerial();

  // Large messages
  if (packet.length > 0xff) {
    const prep = Buffer.alloc(14);
    prep[0] = 0x82;
    prep[1] = 0xff;
    prep.writeUInt32BE(packet.length, 6);
    serial.connection.write(prep);
    // Small messages
  } else {
    // Prepend each message with a send indicating the length to come
    const prep = Buffer.alloc(6);
    prep[0] = 0x82;
    prep[1] = 0x80 + packet.length;
    serial.connection.write(prep);
  }
  serial.connection.write(packet);

  // This is not good cause it will break the generator loop
  const waitTransaction = (res: (value: any) => void) => {
    serial.parser.once('data', (buff) => {
      if (transactionID == buff[2]) {
        console.log('transactionID matches');
        res(void 0);
      } else {
        waitTransaction(res);
      }
    });
  };
  return new Promise(waitTransaction);
}

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

  // Write to frame buffer
  await send(COMMANDS.FRAMEBUFF, Buffer.concat([displays.center.id, header, buffer]));

  // Draw to display
  await send(COMMANDS.DRAW, displays.center.id);
}

async function main() {
  const serial = await getSerial();
  await drawSomething();
  for await (const data of serial.receive()) {
    console.log('Received data:');
    for (let i = 0; i < data.length; i += 16) {
      const line = data.slice(i, i + 16).toString('hex');
      console.log(line);
      if (line === '0500000800') {
        console.log('pressed 1');
        // await drawSomething();
      }
    }
  }
}

main();
