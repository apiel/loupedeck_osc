// import { UDPPort } from 'osc';
const { UDPPort } = require('osc');

const osc = new UDPPort({
    remoteAddress: '127.0.0.1',
    remotePort: 8000,
    metadata: true,
});

// Open the socket.
osc.open();

function midi(value: number) {
    return {
        type: 'm',
        value: new Uint8Array([value]),
    };
}

export function sendOscMidi(msg: number[]) {
    osc.send({ address: '/midi', args: msg.map(midi) });
}

// osc.send({ address: '/midi', args: [midi(0xb0), midi(0x48), midi(0x10)] });
// osc.send({ address: '/midi', args: [midi(0xc0), midi(0x48)] });
