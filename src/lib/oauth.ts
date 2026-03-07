// OAuth functions - now delegate to server-side endpoints

export async function signIn(handle: string): Promise<void> {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to start OAuth flow');
    }

    const { url } = await response.json();
    window.location.href = url;
}

export async function signOut(did: string): Promise<void> {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ did }),
        });
    } catch (error) {
        console.error('Failed to sign out:', error);
    }
}
