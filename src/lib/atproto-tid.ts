// TID (Timestamp Identifier) generation - replaces @atproto/common-web TID

const S32_CHAR = '234567abcdefghijklmnopqrstuvwxyz';

function s32encode(i: number): string {
	let s = '';
	while (i) {
		const c = i % 32;
		i = Math.floor(i / 32);
		s = S32_CHAR.charAt(c) + s;
	}
	return s;
}

let lastTimestamp = 0;
let clockId = 0;

function initClockId(): void {
	clockId = Math.floor(Math.random() * 1024);
}

initClockId();

export class TID {
	str: string;

	constructor(str?: string) {
		if (str) {
			this.str = str;
		} else {
			let timestamp = Date.now() * 1000; // microseconds
			if (timestamp <= lastTimestamp) {
				timestamp = lastTimestamp + 1;
			}
			lastTimestamp = timestamp;

			const timestampStr = s32encode(timestamp).padStart(11, '2');
			const clockStr = s32encode(clockId).padStart(2, '2');
			this.str = timestampStr + clockStr;
		}
	}

	toString(): string {
		return this.str;
	}

	static now(): TID {
		return new TID();
	}

	static next(_prev?: TID): TID {
		return new TID();
	}

	static nextStr(_prev?: TID): string {
		return new TID().str;
	}
}
