<script lang="ts">
    import { _ } from "svelte-i18n";
    import { agentDidsSet, settings } from "$lib/stores";
    import { formatDate } from "$lib/dateFormat";
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { contentLabelling, detectHide } from "$lib/timelineFilter";
    import {
        AppBskyEmbedExternal,
        AppBskyEmbedRecord,
        AppBskyEmbedRecordWithMedia,
        AppBskyEmbedVideo,
        AppBskyFeedDefs,
        AppBskyFeedPost,
        AppBskyGraphDefs,
    } from "$lib/atproto-guards";
    import {
        getViewImages,
        getRecordImages,
        hasGalleryImages,
    } from "$lib/components/post/embedImages";
    import Images from "../../../routes/(app)/Images.svelte";
    import EmbedRecord from "$lib/components/post/EmbedRecord.svelte";
    import TimelineVideo from "$lib/components/post/TimelineVideo.svelte";
    import { formatTranslateRecord } from "$lib/translate";
    import {
        isLocalTranslateSupported,
        formatLocalTranslateRecord,
        normalizeTranslateLang,
        pickSourceLang,
        translatorReady,
    } from "$lib/localTranslate";
    import { settingsState } from "$lib/classes/settingsState.svelte";
    import TimelineWarn from "$lib/components/post/TimelineWarn.svelte";
    import EmbedExternal from "$lib/components/post/EmbedExternal.svelte";
    import TimelineText from "$lib/components/post/TimelineText.svelte";
    import { toast } from "svelte-sonner";
    import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
    import StarterPackEmbed from "$lib/components/starterpack/StarterPackEmbed.svelte";
    import OfficialListItem from "$lib/components/list/OfficialListItem.svelte";
    import EmbedRecordDetached from "$lib/components/post/EmbedRecordDetached.svelte";
    import { getDidFromUri, getService } from "$lib/util";
    import ReactionButtons from "$lib/components/post/ReactionButtons.svelte";
    import { untrack } from "svelte";
    import type { Attachment } from "svelte/attachments";
    import BadgeCheck from '@lucide/svelte/icons/badge-check';
    import Languages from '@lucide/svelte/icons/languages';
    import CircleCheck from '@lucide/svelte/icons/circle-check';
    import CircleDashed from '@lucide/svelte/icons/circle-dashed';
    import Eye from '@lucide/svelte/icons/eye';
    import Handshake from '@lucide/svelte/icons/handshake';
    import { intlRelativeTimeFormatState } from "$lib/classes/intlRelativeTimeFormatState.svelte";
    import { appState } from "$lib/classes/appState.svelte";
    import { getNextUpdateDelay } from "$lib/components/post/timelineUtil";
    import { relativeTimeClock } from "$lib/components/post/relativeTimeClock";

    interface Props {
        post: any;
        reason?: any;
        _agent: any;
        isMedia?: boolean;
        isTranslated?: boolean;
        isSingle?: boolean;
        pulseTranslate?: boolean;
        isHide?: any;
        threadContext?: {
            feed?: any[];
            postUri?: string;
            authorDid?: string;
        };
        children?: import("svelte").Snippet;
    }

    let {
        post,
        reason,
        _agent,
        isMedia = false,
        isTranslated = $bindable(false),
        isSingle = false,
        pulseTranslate = $bindable(false),
        isHide = $bindable(),
        threadContext,
        children,
    }: Props = $props();

    const localSupported = isLocalTranslateSupported();

    const targetLang = $derived(
        normalizeTranslateLang($settings.general?.userLanguage),
    );
    const sourceLang = $derived(pickSourceLang(post.record?.langs, targetLang));

    $effect(() => {
        translation(pulseTranslate);
    });

    let translatedRecord: undefined | AppBskyFeedPost.Record = $state();

    const autoTranslateAttachment: Attachment = () => {
        void $translatorReady;

        if (
            !localSupported ||
            !settingsState.settings.autoTranslate ||
            pulseTranslate
        ) {
            return;
        }

        if (isTranslated || translatedRecord || !sourceLang || !targetLang) {
            return;
        }

        const controller = new AbortController();
        untrack(
            () => void autoTranslate(sourceLang, targetLang, controller.signal),
        );

        return () => controller.abort();
    };
    let warnLabels = $state([]);
    let warnBehavior: "cover" | "inform" = $state("cover");
    let timeDistanceToNow = $derived.by(() => {
        const date = new Date(post.indexedAt);
        if (getNextUpdateDelay(date) !== null) {
            relativeTimeClock.now;
        }
        return intlRelativeTimeFormatState.format({ laterDate: date });
    });
    let skyblurText = $state("");
    let isSkyblurAdditional = $state(false);

    const whisperExpiredAt = (() => {
        const raw = post?.record?.["tech.tokimeki.whisper.expiredAt"];
        if (typeof raw !== "string") return null;
        const date = new Date(raw);
        if (isNaN(date.getTime())) return null;
        const postCreated = new Date(post?.record?.createdAt || 0).getTime();
        const maxExpiry = postCreated + 25 * 60 * 60 * 1000;
        if (date.getTime() > maxExpiry) return null;
        return raw;
    })();

    const audioMeta = (() => {
        const raw: any = post?.record?.["tech.tokimeki.audio"];
        if (!raw || typeof raw !== "object" || raw.isAudio !== true) return null;
        return {
            title: typeof raw.title === "string" ? raw.title : "",
            artist: typeof raw.artist === "string" ? raw.artist : "",
            durationMs: typeof raw.durationMs === "number" ? raw.durationMs : 0,
        };
    })();

    const whisperRemainingTime = (() => {
        if (!whisperExpiredAt) return "";
        const remaining = new Date(whisperExpiredAt).getTime() - Date.now();
        if (remaining <= 0) return "";
        const totalMinutes = Math.floor(remaining / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const formatter = new Intl.DurationFormat(
            $settings?.general?.userLanguage || navigator.language,
            { style: "short" },
        );
        return formatter.format(hours > 0 ? { hours, minutes } : { minutes });
    })();

    const moderateData = contentLabelling(
        post,
        _agent.did(),
        $settings,
        appState.labelDefs.current,
    );
    const contentContext = isSingle ? "contentView" : "contentList";

    let isWarn: "content" | "media" | null = detectWarn(moderateData) || null;
    isHide = detectHide(moderateData, contentContext, isHide, post);

    function detectWarn(moderateData) {
        if (!moderateData) {
            return null;
        }

        try {
            const contentUi = moderateData.ui(contentContext);
            const mediaUi = moderateData.ui("contentMedia");

            if (contentUi.blur) {
                warnLabels = [...contentUi.blurs, ...mediaUi.blurs];
                return "content";
            }

            if (mediaUi.blur) {
                warnLabels = mediaUi.blurs;
                return "media";
            }

            if (contentUi.inform) {
                warnLabels = contentUi.informs;
                warnBehavior = "inform";

                if (!moderateData.muted && warnLabels.length) {
                    return "content";
                }
            }
        } catch (e) {
            return null;
        }

        return null;
    }

    async function translation(pulse = true) {
        if (!pulse) {
            return false;
        }

        await untrack(async () => {
            try {
                translatedRecord = await formatTranslateRecord(
                    post.record.text,
                    $settings.general?.userLanguage,
                    _agent,
                    post.record,
                );
            } catch (e) {
                toast.error("Translate error.");
            }

            isTranslated = true;
            pulseTranslate = false;
        });
    }

    async function autoTranslate(
        source: string,
        target: string,
        signal: AbortSignal,
    ) {
        try {
            const fromGesture = navigator.userActivation?.isActive ?? false;
            const record = await formatLocalTranslateRecord(
                post.record.text,
                source,
                target,
                _agent,
                post.record,
                { fromGesture, signal },
            );

            if (signal.aborted || !record) {
                return;
            }

            translatedRecord = record;
            isTranslated = true;
        } catch (e) {}
    }

    async function handleSkyblurShow() {
        try {
            const uri = post?.record?.["uk.skyblur.post.uri"];
            const host = "skyblur.uk";
            type SkyblurResponse = {
                text?: string;
                additional?: string;
                message?: string;
                errorCode?: string;
                errorDescription?: string;
                createdAt?: string;
                visibility?: string;
                encryptCid?: string;
            };

            const res = await _agent.callWithProxy<SkyblurResponse>(
                "uk.skyblur.post.getPost",
                undefined,
                {
                    method: "POST",
                    proxyDid: `did:web:${host}`,
                    proxyServiceId: "skyblur_api",
                    data: {
                        uri: uri,
                    },
                },
            );

            if (res?.text) {
                skyblurText = res.text.replace(/[\[\]]/g, "");

                if (res?.additional) {
                    isSkyblurAdditional = true;
                }
            } else {
                throw new Error("Skyblur text not found.");
            }
        } catch (e) {
            console.error(e);
        }
    }

</script>

<div class="timeline__image">
    {#if $settings?.design.postsLayout !== "minimum"}
        <Avatar
            href="/profile/{post.author.did}"
            avatar={post.author.avatar}
            profile={post.author}
            handle={post.author.handle}
            {_agent}
        ></Avatar>

        {#if post.author?.viewer?.followedBy && $settings?.design?.mutualDisplay}
            <div class="avatar-mutual-badge">
                <Handshake size="16" color="var(--primary-color)"></Handshake>
            </div>
        {/if}
    {/if}
</div>

<div class="timeline__content" data-aturi={post.uri}>
    <div class="timeline__meta">
        <p class="timeline__user">
            {post.author.displayName || post.author.handle}
        </p>

        {#if post?.author?.verification?.trustedVerifierStatus === "valid"}
            <span class="timeline__verified" aria-label="(Trusted verifier)">
                <BadgeCheck
                    size="16"
                    color="var(--primary-color)"
                    strokeWidth="2.25"
                ></BadgeCheck>
            </span>
        {/if}

        {#if post?.author?.verification?.verifiedStatus === "valid"}
            <span class="timeline__verified" aria-label="(Verified)">
                <CircleCheck
                    size="16"
                    color="var(--primary-color)"
                    strokeWidth="2.25"
                ></CircleCheck>
            </span>
        {/if}

        <p class="timeline__date">
            {#if $settings?.design.absoluteTime}
                <Tooltip>
                    {#snippet ref()}
                        <span
                            >{formatDate(
                                new Date(post.indexedAt),
                                $settings.design?.datetimeFormat ||
                                    "yyyy-MM-dd HH:mm",
                            )}</span
                        >
                    {/snippet}
                    {#snippet content()}
                        <span aria-hidden="true" class="timeline-tooltip"
                            >{formatDate(
                                new Date(post.indexedAt),
                                "yyyy-MM-dd HH:mm:ss",
                            )}</span
                        >
                    {/snippet}
                </Tooltip>
            {:else}
                <Tooltip>
                    {#snippet ref()}
                        <span>{timeDistanceToNow}</span>
                    {/snippet}
                    {#snippet content()}
                        <span aria-hidden="true" class="timeline-tooltip"
                            >{formatDate(
                                new Date(post.indexedAt),
                                "yyyy-MM-dd HH:mm:ss",
                            )}</span
                        >
                    {/snippet}
                </Tooltip>
            {/if}
        </p>

        {#if sourceLang}
            <button
                class="timeline-translate-button"
                disabled={isTranslated}
                onclick={translation}
                >{$_(
                    isTranslated ? "already_translated" : "translation",
                )}</button
            >
        {/if}
    </div>

    {#if $settings.design?.displayHandle}
        <p class="timeline__handle">@{post.author.handle}</p>
    {/if}

    <div
        class="timeline-warn-wrap"
        class:timeline-warn-wrap--warned={isWarn === "content" &&
            warnBehavior !== "inform"}
        {@attach autoTranslateAttachment}
    >
        {#if isWarn === "content"}
            <TimelineWarn labels={warnLabels} behavior={warnBehavior}
            ></TimelineWarn>
        {/if}

        {#if !skyblurText}
            <p class="timeline__text" dir="auto">
                <TimelineText
                    record={post.record}
                    {_agent}
                    handle={post?.author?.handle}
                ></TimelineText>
            </p>

            {#if post?.record?.["uk.skyblur.post.uri"]}
                <button class="skyblur-show" onclick={handleSkyblurShow}>
                    <Eye size="18" color="var(--primary-color)"></Eye>
                    {$_("show_skyblur_text")}
                </button>
            {/if}
        {:else}
            <p class="timeline__text" dir="auto">
                <TimelineText
                    record={{
                        ...post.record,
                        text: skyblurText,
                    }}
                    {_agent}
                    handle={post?.author?.handle}
                ></TimelineText>
            </p>
        {/if}

        {#if isSkyblurAdditional}
            <a
                class="skyblur-show"
                href="https://skyblur.uk/post/{post.author.did}/{post.uri
                    .split('/')
                    .slice(-1)[0]}"
                target="_blank"
                rel="noopener nofollow noreferrer"
            >
                <Eye size="18" color="var(--primary-color)"></Eye>
                {$_("open_skyblur_additional")}
            </a>
        {/if}

        {#if translatedRecord}
            <div class="timeline-translated-text" dir="auto">
                <Languages size={16} aria-label="Translated text: " />
                <p class="timeline__text">
                    <TimelineText record={translatedRecord} {_agent}
                    ></TimelineText>
                </p>
            </div>
        {/if}

        {#if hasGalleryImages(post.embed) && !isMedia && post.embed}
            <div class="timeline-images-wrap">
                {#if isWarn === "media"}
                    <TimelineWarn labels={warnLabels}></TimelineWarn>
                {/if}

                <Images
                    images={getViewImages(post.embed)}
                    blobs={getRecordImages(post.record.embed)}
                    did={post.author.did}
                    {threadContext}
                ></Images>
            </div>
        {/if}

        {#if AppBskyEmbedExternal.isView(post.embed)}
            <div class="timeline-external-wrap">
                {#if isWarn === "media"}
                    <TimelineWarn labels={warnLabels}></TimelineWarn>
                {/if}

                <EmbedExternal external={post.embed.external} {_agent}
                ></EmbedExternal>
            </div>
        {/if}

        {#if AppBskyEmbedRecord.isView(post.embed) && AppBskyEmbedRecord.isViewRecord(post.embed.record) && !whisperExpiredAt}
            <EmbedRecord record={post.embed.record} {_agent}></EmbedRecord>
        {/if}

        {#if AppBskyEmbedRecord.isView(post.embed) && AppBskyFeedDefs.isGeneratorView(post.embed.record)}
            <FeedsItem {_agent} feed={post.embed.record} layout="embed"
            ></FeedsItem>
        {/if}

        {#if AppBskyEmbedRecord.isView(post.embed) && AppBskyGraphDefs.isStarterPackViewBasic(post.embed.record)}
            <StarterPackEmbed {_agent} starterPackBasic={post.embed.record}
            ></StarterPackEmbed>
        {/if}

        {#if AppBskyEmbedRecord.isView(post.embed) && AppBskyGraphDefs.isListView(post.embed.record)}
            <OfficialListItem {_agent} list={post.embed.record}
            ></OfficialListItem>
        {/if}

        {#if AppBskyEmbedRecordWithMedia.isView(post.embed)}
            {#if hasGalleryImages(post.embed.media)}
                <div class="timeline-images-wrap">
                    {#if isWarn === "media"}
                        <TimelineWarn labels={warnLabels}></TimelineWarn>
                    {/if}

                    <Images
                        images={getViewImages(post.embed.media)}
                        blobs={getRecordImages(post.record.embed.media)}
                        did={post.author.did}
                        {threadContext}
                    ></Images>
                </div>
            {/if}

            {#if AppBskyEmbedVideo.isView(post.embed?.media)}
                {#if audioMeta}
                    {#await import("$lib/components/post/EmbedAudio.svelte") then { default: EmbedAudio }}
                        <EmbedAudio video={post.embed.media} audio={audioMeta}></EmbedAudio>
                    {/await}
                {:else}
                    <TimelineVideo video={post.embed.media}></TimelineVideo>
                {/if}
            {/if}

            {#if AppBskyEmbedExternal.isView(post.embed.media)}
                <EmbedExternal external={post.embed.media.external} {_agent}
                ></EmbedExternal>
            {/if}

            {#if AppBskyEmbedRecord.isViewRecord(post.embed.record.record) && !whisperExpiredAt}
                <EmbedRecord record={post.embed.record.record} {_agent}
                ></EmbedRecord>
            {/if}

            {#if AppBskyFeedDefs.isGeneratorView(post.embed.record.record)}
                <FeedsItem
                    {_agent}
                    feed={post.embed.record.record}
                    layout="embed"
                ></FeedsItem>
            {/if}

            {#if AppBskyGraphDefs.isStarterPackViewBasic(post.embed.record.record)}
                <StarterPackEmbed
                    {_agent}
                    starterPackBasic={post.embed.record.record}
                ></StarterPackEmbed>
            {/if}

            {#if AppBskyGraphDefs.isListView(post.embed.record.record)}
                <OfficialListItem {_agent} list={post.embed.record.record}
                ></OfficialListItem>
            {/if}
        {/if}

        {#if (AppBskyEmbedRecord.isViewDetached(post?.embed?.record) || AppBskyEmbedRecord.isViewDetached(post?.embed?.record?.record)) && $agentDidsSet.has(getDidFromUri(post?.embed?.record?.uri || post?.embed?.record?.record?.uri))}
            <EmbedRecordDetached></EmbedRecordDetached>
        {/if}

        {#if AppBskyEmbedVideo.isView(post?.embed)}
            <div class="timeline-images-wrap">
                {#if isWarn === "media"}
                    <TimelineWarn labels={warnLabels}></TimelineWarn>
                {/if}

                {#if audioMeta}
                    {#await import("$lib/components/post/EmbedAudio.svelte") then { default: EmbedAudio }}
                        <EmbedAudio video={post.embed} audio={audioMeta}></EmbedAudio>
                    {/await}
                {:else}
                    <TimelineVideo video={post.embed}></TimelineVideo>
                {/if}
            </div>
        {/if}
    </div>

    {#if whisperExpiredAt}
        <div class="whisper-indicator">
            <CircleDashed size="14"></CircleDashed>
            <span
                >{$_("whisper_remaining")}: {whisperRemainingTime ||
                    "soon..."}</span
            >
        </div>
    {/if}

    <ReactionButtons {_agent} {post} {reason}></ReactionButtons>

    {@render children?.()}
</div>
