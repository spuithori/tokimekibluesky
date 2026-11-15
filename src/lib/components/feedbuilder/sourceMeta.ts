import type { Component } from 'svelte';
import { t } from 'tokimeki-i18n';
import Compass from '@lucide/svelte/icons/compass';
import Users from '@lucide/svelte/icons/users';
import Search from '@lucide/svelte/icons/search';
import Library from '@lucide/svelte/icons/library';
import Database from '@lucide/svelte/icons/database';
import Link2 from '@lucide/svelte/icons/link-2';
import Combine from '@lucide/svelte/icons/combine';
import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Rss from '@lucide/svelte/icons/rss';
import { CUSTOM_FEED_DEFS } from '$lib/feedbuilder/types';
import type { CustomFeedSource } from '$lib/feedbuilder/types';

export type SourceAccent = 'pink' | 'peri' | 'mint' | 'sky' | 'cream';

export interface SourceMeta {
  icon: Component;
  accent: SourceAccent;
  label: string;
}

export function sourceMeta(source: CustomFeedSource | undefined): SourceMeta {
  if (!source) {
    return { icon: Library, accent: 'cream', label: t('tfeeds_easy_no_src_collection') };
  }
  switch (source.$type) {
    case CUSTOM_FEED_DEFS.sourceTimeline:
      return {
        icon: Compass,
        accent: 'sky',
        label:
          source.scope === 'global'
            ? t('tfeeds_src_meta_timeline_global')
            : t('tfeeds_src_meta_timeline_following')
      };
    case CUSTOM_FEED_DEFS.sourceAuthors:
      return { icon: Users, accent: 'peri', label: t('tfeeds_easy_no_src_authors') };
    case CUSTOM_FEED_DEFS.sourceSearch:
      return { icon: Search, accent: 'peri', label: t('tfeeds_easy_src_search') };
    case CUSTOM_FEED_DEFS.sourceCollection:
      return { icon: Library, accent: 'cream', label: t('tfeeds_easy_no_src_collection') };
    case CUSTOM_FEED_DEFS.sourceFrom:
      return { icon: Database, accent: 'sky', label: t('tfeeds_src_meta_from') };
    case CUSTOM_FEED_DEFS.sourceCorrelated:
      return { icon: Link2, accent: 'pink', label: t('tfeeds_src_meta_correlated') };
    case CUSTOM_FEED_DEFS.sourceUnion:
      return { icon: Combine, accent: 'mint', label: t('tfeeds_src_meta_union') };
    case CUSTOM_FEED_DEFS.sourceFollowingEngagement:
      return { icon: HeartHandshake, accent: 'pink', label: t('tfeeds_src_meta_engagement') };
    case CUSTOM_FEED_DEFS.sourceForYou:
      return { icon: Sparkles, accent: 'peri', label: t('tfeeds_easy_src_forYou') };
    case CUSTOM_FEED_DEFS.sourceFeed:
      return { icon: Rss, accent: 'mint', label: t('tfeeds_src_meta_feed') };
  }
}
