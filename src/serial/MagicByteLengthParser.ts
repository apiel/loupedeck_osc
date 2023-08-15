import { Transform, TransformCallback } from 'stream';

export class MagicByteLengthParser extends Transform {
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
