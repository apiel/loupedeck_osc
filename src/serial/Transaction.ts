export class Transaction {
  protected id = 0;
  protected queue = new Map<string, undefined | ((value: unknown) => void)>();

  protected getKey(buffer: Buffer) {
    return `${buffer[1]}-${buffer[2]}`;
  }

  getNextID() {
    this.id = (this.id + 1) % 256;
    // Skip transaction ID's of zero since the device seems to ignore them
    if (this.id === 0) {
      this.id++;
    }

    return this.id;
  }

  wait(buffer: Buffer) {
    return new Promise((res) => {
      const key = this.getKey(buffer);
      this.queue.set(key, res);
    });
  }

  resolve(buffer: Buffer) {
    const key = this.getKey(buffer);
    const resolver = this.queue.get(key);
    if (resolver) {
      console.log('Transaction resolved', buffer.toString('hex'));
      resolver(buffer);
      this.queue.delete(key);
      return true;
    }
    return false;
  }
}
