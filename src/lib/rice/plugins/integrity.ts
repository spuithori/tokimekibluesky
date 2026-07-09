export async function sha256Integrity(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    let binary = '';
    for (const byte of new Uint8Array(digest)) {
        binary += String.fromCharCode(byte);
    }
    return `sha256-${btoa(binary)}`;
}

export async function verifyIntegrity(text: string, expected: string): Promise<boolean> {
    return (await sha256Integrity(text)) === expected;
}
