const S32 = '234567abcdefghijklmnopqrstuvwxyz';
const TID_RE = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;
const MIN_MS = Date.UTC(2010, 0, 1);
const MAX_MS = Date.UTC(2100, 0, 1);

export function isTid(rkey: string): boolean {
    return TID_RE.test(rkey);
}

export function tidToDate(rkey: string): Date | null {
    if (!TID_RE.test(rkey)) return null;
    let micros = 0;
    for (let i = 0; i < 11; i++) {
        micros = micros * 32 + S32.indexOf(rkey[i]);
    }
    const ms = Math.floor(micros / 1000);
    if (ms < MIN_MS || ms > MAX_MS) return null;
    return new Date(ms);
}
