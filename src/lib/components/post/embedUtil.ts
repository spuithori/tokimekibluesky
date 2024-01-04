export function getYouTubeUrl(uri: string) {
    try {
        const url = new URL(uri);
        const hostname = url.hostname;

        if (hostname === 'youtu.be') {
            const id = url.pathname.slice(1);
            return id;
        }

        if (hostname === 'youtube.com' || hostname === 'www.youtube.com') {
            const id = url.searchParams.get('v');
            return id;
        }

        return undefined;
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

export function getTwitterUrl(uri: string) {
    try {
        const url = new URL(uri);
        const hostname = url.hostname;

        if (hostname === 'twitter.com' || hostname === 'www.twitter.com' || hostname === 'x.com' || hostname === 'www.x.com') {
            const id = url.pathname.slice(1);

            if (id.match(/\/status\//)) {
                return id;
            }

        }

        return undefined;
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

export function getMastodonUrl(uri: string) {

}

export function getSpotifyUri(uri: string) {
    try {
        const url = new URL(uri);
        const hostname = url.hostname;

        if (hostname === 'spotify.com' || hostname === 'open.spotify.com') {
            const id = url.pathname.slice(1);
            if (id.match(/track.*/)) {
                return /track.*/.exec(id);
            }
        }

        return undefined;
    } catch (e) {
        console.log(e);
        return undefined;
    }
}