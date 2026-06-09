import { AppBskyEmbedImages, AppBskyEmbedGallery } from '$lib/atproto-guards';

export const LEGACY_IMAGES_EMBED_MAX = 4;
export const MAX_GALLERY_IMAGES = 10;

export function hasGalleryImages(embed: any): boolean {
	return AppBskyEmbedImages.isView(embed) || AppBskyEmbedGallery.isView(embed);
}

export function getViewImages(embed: any): any[] {
	if (AppBskyEmbedImages.isView(embed)) {
		return embed.images ?? [];
	}

	if (AppBskyEmbedGallery.isView(embed)) {
		return (embed.items ?? [])
			.filter(AppBskyEmbedGallery.isViewImage)
			.map((item: any) => ({
				thumb: item.thumbnail,
				fullsize: item.fullsize,
				alt: item.alt,
				aspectRatio: item.aspectRatio,
			}));
	}

	return [];
}

export function getRecordImages(recordEmbed: any): any[] {
	return recordEmbed?.images ?? recordEmbed?.items ?? [];
}
