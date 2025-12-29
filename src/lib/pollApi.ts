const POLL_API_BASE = 'https://poll.tokimeki.tech';

export async function generatePollOgImage(options: string[]): Promise<Blob> {
	const res = await fetch(`${POLL_API_BASE}/api/og-preview`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ options })
	});

	if (!res.ok) {
		throw new Error(`Failed to generate poll OG image: ${res.status}`);
	}

	return await res.blob();
}
