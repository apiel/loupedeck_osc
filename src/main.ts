import { getSerial } from './serial';

async function main() {
  const serial = await getSerial();
  for await (const data of serial.receive()) {
    console.log('Received data:');
    for (let i = 0; i < data.length; i += 16) {
      console.log(data.slice(i, i + 16).toString('hex'));
    }
  }
}

main();
