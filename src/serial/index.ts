import { SerialPort } from 'serialport';
import { TransformParser } from './TransformParser';
import { Transaction } from './Transaction';
import { SERIAL_DEVICE_INFO, WS_UPGRADE_HEADER, WS_UPGRADE_RESPONSE } from './constants';

export class Serial {
  connection: SerialPort;
  parser = new TransformParser();
  protected transaction = new Transaction();

  protected constructor(path: string) {
    this.connection = new SerialPort({ path, baudRate: 256000 });
  }

  static serial: Serial;
  static async get() {
    if (!Serial.serial) {
      const path = await Serial.discover();
      console.log(`Connecting to device on path ${path}`);
      Serial.serial = new Serial(path);
      await Serial.serial.connect();
    }
    return Serial.serial;
  }

  static async discover() {
    for (const { manufacturer, productId, path } of await SerialPort.list()) {
      if (SERIAL_DEVICE_INFO.some((d) => d.manufacturer === manufacturer && d.productId === productId)) {
        return path;
      }
    }
    throw new Error('No device found');
  }

  onReceive: (data: Buffer) => void = () => {};
  protected handleData() {
    this.connection.pipe(this.parser);
    this.parser.on('data', (data) => {
      if (!this.transaction.resolve(data)) {
        this.onReceive(data);
      }
    });
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
    this.handleData();

    console.log('Connected to device');
  }

  // Make generator using onReceive instead of this.parser.on('data', (buff) => {})
  async *receive(): AsyncGenerator<Buffer> {
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
    const transactionID = this.transaction.getNextID();
    const header = Buffer.alloc(3);
    header[0] = Math.min(3 + data.length, 0xff);
    header[1] = command;
    header[2] = transactionID;
    const packet = Buffer.concat([header, data]);

    this.connection.write(this.getPacketPrefix(packet));
    this.connection.write(packet);
    return this.transaction.wait(packet);
  }
}
