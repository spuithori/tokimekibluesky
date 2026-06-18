import { Transmuxer } from 'mux.js/lib/mp4/transmuxer';

let transmuxer: any = null;
let captured: any = null;

function makeTransmuxer() {
    transmuxer = new Transmuxer({ remux: true, keepOriginalTimestamps: false });
    transmuxer.on('data', (segment: any) => { captured = segment; });
}

self.onmessage = (event: MessageEvent) => {
    const message = event.data;

    if (message.type === 'reset') {
        makeTransmuxer();
        return;
    }

    if (message.type === 'segment') {
        if (!transmuxer) makeTransmuxer();
        captured = null;
        transmuxer.push(new Uint8Array(message.bytes));
        transmuxer.flush();

        if (captured && captured.initSegment && captured.data) {
            const init = captured.initSegment as Uint8Array;
            const data = captured.data as Uint8Array;
            (self as any).postMessage(
                { type: 'segment', id: message.id, kind: captured.type, init: init.buffer, data: data.buffer },
                [init.buffer, data.buffer]
            );
        } else {
            (self as any).postMessage({ type: 'segment', id: message.id, init: null, data: null });
        }
    }
};
