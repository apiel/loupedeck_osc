import { SerialPort } from 'serialport';
import { Transform, TransformCallback } from 'stream';

const WS_UPGRADE_HEADER = `GET /index.html
HTTP/1.1
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: 123abc

`;
const WS_UPGRADE_RESPONSE = 'HTTP/1.1';

const serialDeviceInfo = [
  {
    manufacturer: 'Razer Inc.',
    productId: '0d06',
  },
];

async function discover() {
  for (const { manufacturer, productId, path } of await SerialPort.list()) {
    if (serialDeviceInfo.some((d) => d.manufacturer === manufacturer && d.productId === productId)) {
      return path;
    }
  }
  throw new Error('No device found');
}

class MagicByteLengthParser extends Transform {
  buffer = Buffer.alloc(0);

  constructor(protected delimiter: number = 0x82) {
    super();
  }

  _transform(chunk: any, _: BufferEncoding, callback: TransformCallback) {
    let data = Buffer.concat([this.buffer, chunk]);
    let position;
    while ((position = data.indexOf(this.delimiter)) !== -1) {
      // We need to at least be able to read the length byte
      if (data.length < position + 2) break;
      const nextLength = data[position + 1];
      // Make sure we have enough bytes to meet this length
      const expectedEnd = position + nextLength + 2;
      if (data.length < expectedEnd) break;
      this.push(data.subarray(position + 2, expectedEnd));
      data = data.subarray(expectedEnd);
    }
    this.buffer = data;
    callback();
  }

  _flush(callback: TransformCallback) {
    this.push(this.buffer);
    this.buffer = Buffer.alloc(0);
    callback();
  }
}

class Serial {
  parser = new MagicByteLengthParser();
  connection: SerialPort;

  constructor(path: string) {
    this.connection = new SerialPort({ path, baudRate: 256000 });
  }

  async connect() {
    await new Promise((res) => this.connection.once('open', res));
    await new Promise((res, rej) => {
      this.connection.once('data', (buff) => {
        if (buff.toString().startsWith(WS_UPGRADE_RESPONSE)) {
          res(void 0);
        } else {
          rej(`Invalid handshake response: ${buff.toString()}`);
        }
      });
      // Let's send it twice because sometimes it doesn't work the first time
      this.connection.write(Buffer.from(WS_UPGRADE_HEADER));
      this.connection.write(Buffer.from(WS_UPGRADE_HEADER));
    });
    this.connection.pipe(this.parser);
    console.log('Connected to device');
  }

  // Generator function to receive data instead of this.parser.on('data', (buff) => {})
  async *receive() {
    for await (const data of this.parser) {
      yield data;
    }
  }
}

let serial: Serial;

export async function getSerial() {
  if (!serial) {
    const path = await discover();
    console.log(`Connecting to device on path ${path}`);
    serial = new Serial(path);
    await serial.connect();
  }
  return serial;
}
