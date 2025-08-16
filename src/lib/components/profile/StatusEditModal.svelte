<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import Modal from "$lib/components/ui/Modal.svelte";
    import {Clock, Link} from "lucide-svelte";
    import {settings} from '$lib/stores';
    import { resource } from "runed";
    import {toast} from "svelte-sonner";
    import EmbedExternal from "$lib/components/post/EmbedExternal.svelte";
    import type {Agent} from "$lib/agent";

    let { _agent, onclose }: { _agent: Agent } = $props();

    let url = $state('');
    let embed = $state();
    let duration = $state(30);
    let isDisabled = $state(false);

    const getEmbed = resource(
        () => url,
        async (url, prevUrl, { data, refetching, onCleanup, signal }) => {
            if (!url) {
                embed = undefined;
                return false;
            }

            if (!URL.canParse(url)) {
                embed = undefined;
                return false;
            }

            isDisabled = true;

            try {
                const lang = $settings.general?.userLanguage ? $settings.general?.userLanguage : 'en-US';
                const res = await fetch('https://tokimeki-api.vercel.app/api/ogp?url=' + encodeURIComponent(url) + '&lang=' + lang);
                const data = await res.json();

                embed = {
                    $type: 'app.bsky.embed.external',
                    external: {
                        $type: 'app.bsky.embed.external#external',
                        uri: url,
                        title: data.title || '',
                        description: data.description || '',
                        thumb: data.imageBase64 || undefined,
                    }
                }
            } catch (e) {
                embed = undefined;
                toast.error('Error!' + e);
            }

            isDisabled = false;
        },
        {
            debounce: 250,
        },
    );

    async function applyStatus() {
        isDisabled = true;
        if (embed?.external?.thumb) {
            try {
                embed.external.thumb = await uploadExternalImage(embed.external.thumb);
            } catch (e) {
                console.error(e);
                embed.external.thumb = undefined;
            }
        }

        const record = {
            $type: 'app.bsky.actor.status',
            createdAt: new Date().toISOString(),
            status: 'app.bsky.actor.status#live',
            durationMinutes: duration || 30,
            embed: embed || undefined,
        }

        try {
            await _agent.agent.com.atproto.repo.putRecord({
                repo: _agent.did(),
                rkey: 'self',
                collection: 'app.bsky.actor.status',
                record: record,
            });

            onclose();
        } catch (e) {
            console.error(e);
            isDisabled = false;
        }
    }

    async function deleteStatus() {
        isDisabled = true;
        try {
            await _agent.agent.app.bsky.actor.status.delete({
                repo: _agent.did(),
                rkey: 'self',
            });

            onclose();
        } catch (e) {
            console.error(e);
            isDisabled = false;
        }
    }

    async function uploadExternalImage(_blob) {
        try {
            const imageRes = await fetch(_blob);
            let blob = await imageRes.blob();

            const res = await _agent.agent.api.com.atproto.repo.uploadBlob(blob, {
                encoding: 'image/jpeg',
            });
            return res.data.blob;
        } catch (e) {
            toast.error(e);
        }
    }
</script>

<Modal title={m.edit_status_live()} size="small" {onclose}>
    <div class="edit-status">
        {#if embed}
            <EmbedExternal external={embed.external}></EmbedExternal>
        {/if}

        <dl class="settings-group">
            <dt class="settings-group__name">
                {m.edit_status_live_url()}
            </dt>

            <dd class="settings-group__content">
                <div class="input-text input-text--icon">
                    <Link size="20" color="var(--text-color-1)"></Link>
                    <input class="input-text__input" type="text" bind:value={url} placeholder="https://www.youtube.com/watch?v=_7uLfiTtQeY">
                </div>
            </dd>
        </dl>

        <dl class="settings-group">
            <dt class="settings-group__name">
                {m.edit_status_live_duration()}
            </dt>

            <dd class="settings-group__content">
                <div class="input-text input-text--icon">
                    <Clock size="20" color="var(--text-color-1)"></Clock>
                    <input class="input-text__input" type="number" bind:value={duration} placeholder="30" min="0" max="600">
                    <span class="input-text__suffix">{m.edit_status_live_suffix_minutes()}</span>
                </div>
            </dd>
        </dl>

        <div class="buttons-group">
            <button class="button button--sm" onclick={applyStatus} disabled={isDisabled}>{m.apply()}</button>
            <button class="button button--danger button--border button--sm" onclick={deleteStatus} disabled={isDisabled}>{m.edit_status_live_exit()}</button>
        </div>
    </div>
</Modal>

<style lang="postcss">
    .buttons-group {
        justify-content: center;
        margin-top: 16px;
    }
</style>