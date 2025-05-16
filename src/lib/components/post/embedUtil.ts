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

export function getBluemotionUrl(uri: string) {
    try {
        const url = new URL(uri);
        const hostname = url.hostname;

        if (hostname === 'www.bluemotion.app' || hostname === 'bluemotion.app') {
            const id = url.pathname;
            return id.includes('video') ? id : undefined;
        }

        return undefined;
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

export function getGiphyId(uri: string) {
    try {
        const url = new URL(uri);
        const hostname = url.hostname;
        const domainPart = hostname.split('.');
        const domain = domainPart.slice(0).slice(-(domainPart.length === 4 ? 3 : 2)).join('.');

        if (hostname === 'giphy.com' || hostname === 'www.giphy.com') {
            const [_, gifs, id] = url.pathname.split('/');

            if (gifs === 'gifs' && id) {
                const rawId = id.split('-').slice(-1)[0];
                return id.split('-').pop();
            }
        }

        if (domain === 'giphy.com' &&  /media(?:[0-4]\.giphy\.com|\.giphy\.com)/i.test(hostname)) {
            const id = url.pathname.split('/').slice(-2, -1)[0];
            return id.split('-').pop();
        }

        return undefined;
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

export function getTenorUrl(uri: string) {
    try {
        const url = new URL(uri);
        const hostname = url.hostname;

        if (hostname === 'media.tenor.com') {
            const width = url.searchParams.get('ww');
            const height = url.searchParams.get('hh');
            const mp4Url = url.toString().replace(url.search, '').replace(/AAAAC/g, 'AAAP1').replace(/\.gif$/i, '.mp4');

            return {
                url: url,
                mp4Url: mp4Url,
                width: width,
                height: height,
            };
        }

        return undefined;
    } catch (e) {
        console.log(e);
        return undefined;
    }
}