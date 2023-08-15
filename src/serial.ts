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

  protected pendingTransactions: { [key: number]: undefined | ((value: unknown) => void) } = {};
  protected transactionID = 0;
  protected getNextTransactionID() {
    this.transactionID = (this.transactionID + 1) % 256;
    // Skip transaction ID's of zero since the device seems to ignore them
    if (this.transactionID === 0) {
      this.transactionID++;
    }

    return this.transactionID;
  }

  constructor(path: string) {
    this.connection = new SerialPort({ path, baudRate: 256000 });
  }

  onReceive: (data: Buffer) => void = () => {};

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
    this.parser.on('data', (data) => {
      const transactionID = data[2];
      const resolver = this.pendingTransactions[transactionID];
      if (resolver) {
        console.log('Transaction resolved');
        resolver(data);
        this.pendingTransactions[transactionID] = undefined;
      } else {
        this.onReceive(data);
      }
    });

    console.log('Connected to device');
  }

  // Make generator using onReceive instead of this.parser.on('data', (buff) => {})
  async *receive() {
    while (true) {
      yield await new Promise((res) => {
        this.onReceive = res;
      });
    }
  } 

  protected getPacketPrefix(packet: Buffer) {
    // Large messages
    if (packet.length > 0xff) {
      const prefix = Buffer.alloc(14);
      prefix[0] = 0x82;
      prefix[1] = 0xff;
      prefix.writeUInt32BE(packet.length, 6);
      return prefix;
    }
    // Small messages
    // prefixend each message with a send indicating the length to come
    const prefix = Buffer.alloc(6);
    prefix[0] = 0x82;
    prefix[1] = 0x80 + packet.length;
    return prefix;
  }

  async send(command: number, data = Buffer.alloc(0)) {
    const transactionID = this.getNextTransactionID();
    const header = Buffer.alloc(3);
    header[0] = Math.min(3 + data.length, 0xff);
    header[1] = command;
    header[2] = transactionID;
    const packet = Buffer.concat([header, data]);

    this.connection.write(this.getPacketPrefix(packet));
    this.connection.write(packet);

    // // This is not good cause it will break the generator loop
    // const waitTransaction = (res: (value: any) => void) => {
    //   this.parser.once('data', (buff) => {
    //     if (transactionID == buff[2]) {
    //       console.log('transactionID matches');
    //       res(void 0);
    //     } else {
    //       waitTransaction(res);
    //     }
    //   });
    // };
    // return new Promise(waitTransaction);
    return new Promise((res) => {
      this.pendingTransactions[this.transactionID] = res;
    });
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
