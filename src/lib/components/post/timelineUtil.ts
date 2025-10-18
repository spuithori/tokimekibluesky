import {AppBskyEmbedExternal, AppBskyEmbedImages, AppBskyEmbedRecord, AppBskyFeedDefs, BskyAgent} from "@atproto/api";
import {getImageBase64FromBlob, getImageObjectFromBlob, getService} from "$lib/util";
import {getTextArray} from "$lib/richtext";

export async function getEditPost(data: AppBskyFeedDefs.FeedViewPost) {
    let _post = { did: data.post.author.did };
    const __agent = new BskyAgent({service: await getService(data.post.author.did)});

    if (AppBskyEmbedImages.isView(data?.post?.embed)) {
        const blobs = data.post.record.embed.images.map(image => {
            return {
                cid: image.image.ref.toString(),
                mimeType: image.image.mimeType,
                alt: image.alt,
                width: image.aspectRatio.width,
                height: image.aspectRatio.height,
            }
        });

        const promises = blobs.map(blob => getImageObjectFromBlob(data.post.author.did, blob, __agent));
        _post.images = await Promise.all(promises);
    }

    if (AppBskyEmbedImages.isView(data?.post?.embed?.media)) {
        const blobs = data.post.record.embed.media.images.map(image => {
            return {
                cid: image.image.ref.toString(),
                mimeType: image.image.mimeType,
                alt: image.alt,
                width: image.aspectRatio.width,
                height: image.aspectRatio.height,
            }
        });

        const promises = blobs.map(blob => getImageObjectFromBlob(data.post.author.did, blob, __agent));
        _post.images = await Promise.all(promises);
    }

    if (AppBskyEmbedRecord.isViewRecord(data?.post?.embed?.record)) {
        _post.quotePost = {
            ...data.post.embed.record,
            record: data.post.embed.record.value,
        };
    }

    if (AppBskyEmbedRecord.isViewRecord(data?.post?.embed?.record?.record)) {
        _post.quotePost = {
            ...data.post.embed.record.record,
            record: data.post.embed.record.record.value,
        };
    }

    if (data.reply && !data.reply.parent?.notFound && !data.reply.parent?.blocked) {
        _post.replyRef = {
            did: data.post.author.did,
            data: {
                parent: data.reply.parent,
                root: data.reply.root,
            }
        }
    }

    if (AppBskyEmbedExternal.isView(data?.post?.embed)) {
        _post.embedExternal = {
            $type: 'app.bsky.embed.external',
            external: data.post.embed.external,
        };

        if (data.post.embed.external?.thumb) {
            _post.externalImageBlob = await getImageBase64FromBlob(data.post.author.did, {cid: data.post.record.embed.external.thumb.ref.toString(), mimeType: data.post.record.embed.external.thumb.mimeType}, __agent);
        }
    }

    let text = '';
    getTextArray(data.post.record).forEach(item => {
        if (item.isLink()) {
            text = text + `<a href="${item.link.uri}">${item.text}</a>`
        } else if (item.isMention()) {
            text = text + `<span class="editor-mention" data-type="mention" data-id="${item.text.slice(1)}">${item.text}</span>`
        } else if (item.isTag()) {
            text = text + `<span class="editor-hashtag">${item.text}</span>`
        } else {
            text = text + item.text.replaceAll('\n', '<br>');
        }
    })
    _post.text = text;

    return _post;
}

export  function getNextUpdateDelay(date: Date) {
    const seconds = (Date.now() - date.getTime()) / 1000;

    if (seconds < 60) {
        return 5 * 1000;
    }
    if (seconds < 3600) {
        return (60 - (seconds % 60)) * 1000;
    }
    if (seconds < 86400) {
        return (3600 - (seconds % 3600)) * 1000;
    }

    return null;
}
