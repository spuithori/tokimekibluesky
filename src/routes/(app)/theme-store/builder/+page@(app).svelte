<script lang="ts">
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { t } from 'tokimeki-i18n';
    import { toast } from 'svelte-sonner';
    import { agent } from '$lib/stores';
    import { themesDb } from '$lib/db';
    import { fetchRemoteTheme, ThemeFetchError } from '$lib/theme/atproto';
    import { ensureBuilderLocale } from '$lib/theme/builder/i18n';
    import { loadDraft } from '$lib/theme/builder/storage';
    import { draftFromDefault, draftFromInstalled, draftFromOwn, draftFromRecord } from '$lib/theme/builder/start';
    import { builderHref, editDraftId, sourceFromUrl, type BuilderSource } from '$lib/theme/builder/session';
    import { decodeThemeHash, THEME_LINK_PREFIX } from '$lib/theme/builder/link';
    import type { Draft } from '$lib/theme/builder/draft';
    import BuilderPanel from '$lib/theme/builder/BuilderPanel.svelte';

    let session: { draft: Draft; persisted: boolean } | null = $state(null);

    const replace = (href: string) => goto(href, { replaceState: true, noScroll: true, keepFocus: true });

    async function resolve(source: BuilderSource): Promise<{ draft: Draft; persisted: boolean } | null> {
        if (source.kind === 'draft') {
            const stored = await loadDraft(source.id);
            return stored ? { draft: stored, persisted: true } : null;
        }
        if (source.kind === 'own') {
            const stored = await loadDraft(editDraftId(source.uri));
            if (stored) return { draft: stored, persisted: true };
            const remote = await fetchRemoteTheme(source.uri).catch((e) => {
                if (e instanceof ThemeFetchError && (e.code === 'not-found' || e.code === 'invalid-uri')) return null;
                throw e;
            });
            if (!remote || remote.did !== $agent?.did()) return null;
            return { draft: await draftFromOwn(remote, await themesDb.themes.get(remote.uri)), persisted: false };
        }
        if (source.kind === 'installed') {
            const row = await themesDb.themes.get(source.id);
            return row ? { draft: draftFromInstalled(row), persisted: false } : null;
        }
        if (source.kind === 'link') {
            const record = await decodeThemeHash(source.hash);
            if (!record) toast.error(t('builder_link_invalid'));
            return record ? { draft: draftFromRecord(record, undefined), persisted: false } : null;
        }
        return { draft: draftFromDefault(t('builder_untitled')), persisted: false };
    }

    async function open() {
        await ensureBuilderLocale();
        const resolved = await resolve(sourceFromUrl(page.url));
        if (!resolved) {
            await replace('/theme-store/create');
            return;
        }
        session = resolved;
    }

    open().catch((e) => {
        console.error(e);
        toast.error(t(e instanceof ThemeFetchError ? e.messageKey : 'theme_error_network'));
        replace('/theme-store/create');
    });
</script>

<svelte:window onhashchange={() => {
    if (location.hash.startsWith(THEME_LINK_PREFIX)) location.reload();
}} />

<svelte:head>
  <title>{session?.draft.name ?? ''} - TOKIMEKI</title>
</svelte:head>

{#if session}
  <BuilderPanel
    bind:draft={session.draft}
    persisted={session.persisted}
    onpersist={(id) => replace(builderHref({ kind: 'draft', id }))}
    onpublish={(uri) => replace(builderHref({ kind: 'own', uri }))}
    onclose={() => goto('/theme-store/create')}
  ></BuilderPanel>
{/if}
