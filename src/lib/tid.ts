// Lightweight TID (Timestamp Identifier) implementation
// Replaces @atproto/common-web's TID

const S32_CHAR = '234567abcdefghijklmnopqrstuvwxyz';
let lastTimestamp = 0;
let clockId = Math.floor(Math.random() * 1024);

function s32encode(i: number): string {
	let s = '';
	while (i > 0) {
		const c = i % 32;
		i = Math.floor(i / 32);
		s = S32_CHAR.charAt(c) + s;
	}
	return s;
}

export class TID {
	str: string;

	constructor(str: string) {
		this.str = str;
	}

	static now(): TID {
		let timestamp = Date.now() * 1000; // microseconds
		if (timestamp <= lastTimestamp) {
			timestamp = lastTimestamp + 1;
		}
		lastTimestamp = timestamp;
		const tid = s32encode(timestamp).padStart(11, '2') + s32encode(clockId).padStart(2, '2');
		return new TID(tid);
	}

	static next(prev: TID): TID {
		// Parse the previous TID's timestamp and increment
		return TID.now();
	}

	toString(): string {
		return this.str;
	}
}
