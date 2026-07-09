function toSri(digest: ArrayBuffer): string {
    let binary = '';
    for (const byte of new Uint8Array(digest)) {
        binary += String.fromCharCode(byte);
    }
    return `sha256-${btoa(binary)}`;
}

export async function sha256IntegrityBytes(bytes: BufferSource): Promise<string> {
    return toSri(await crypto.subtle.digest('SHA-256', bytes));
}

export async function sha256Integrity(text: string): Promise<string> {
    return sha256IntegrityBytes(new TextEncoder().encode(text));
}

export async function verifyIntegrity(text: string, expected: string): Promise<boolean> {
    return (await sha256Integrity(text)) === expected;
}
