<script lang="ts">
  import {_} from 'svelte-i18n';
  import {agent, settings} from '$lib/stores';
  import {page} from '$app/stores';
  import {format, parseISO} from 'date-fns';
  import { fade } from 'svelte/transition';
  import {BskyAgent, RichText} from '@atproto/api';
  import {BadgeCheck, CircleCheck, Eye, EyeOff, Handshake, Radio} from 'lucide-svelte';
  import SocialProof from "$lib/components/profile/SocialProof.svelte";
  import ProfileAtmosphere from "$lib/components/profile/ProfileAtmosphere.svelte";
  import emblaCarouselSvelte from 'embla-carousel-svelte';
  import TimelineText from "$lib/components/post/TimelineText.svelte";
  import {imageState} from "$lib/classes/imageState.svelte";
  import VerifierModal from "$lib/components/profile/VerifierModal.svelte";
  import EmbedExternal from "$lib/components/post/EmbedExternal.svelte";
  import {getEndpoint} from "$lib/util";

  interface Props {
    handle: any;
    profile?: any;
    isLabeler?: boolean;
  }

  let { handle, profile = $bindable(getProfile(handle)), isLabeler = false, _agent = $agent, children }: Props = $props();

  let firstPostDate = $state('');
  let firstPostUri = $state('');
  let textRecord = $derived.by(() => {
    const rich = new RichText({text: profile.description});
    rich.detectFacets(_agent.agent);
    return rich;
  });
  let serviceHost = $state('');
  let gridWidth = $state(0);
  let slideOptions = $derived({
    loop: false,
    watchDrag: gridWidth < 680,
  });
  const __agent = new BskyAgent({service: _agent.service()});
  let isVerifierModalOpen = $state(false);

  getEndpoint(profile.did)
      .then(value => {
          serviceHost = value;
      })
      .catch(e => {
          serviceHost = '';
      });

  getFirstPostData(handle);

  async function getFirstRecord(handle) {
      try {
          return await __agent.api.com.atproto.repo.listRecords({
              collection: "app.bsky.feed.post",
              limit: 1,
              reverse: true,
              repo: handle});
      } catch (e) {
          return null;
      }
  }

  async function getFirstPostData(handle = $page.params.handle) {
      try {
          const firstPost = await getFirstRecord(handle);

          if (!firstPost) {
              return false;
          }

          const firstPostDateRaw = firstPost.data.records[0].value.createdAt;
          firstPostDate = format(parseISO(firstPostDateRaw), 'yyyy/MM/dd');
          firstPostUri = '/profile/' + handle + '/post/' + firstPost.data.records[0].uri.split('/').slice(-1)[0];
      } catch (e) {

      }
  }

  async function getProfile(handle) {
      if (!handle) {
          return false;
      }

      const res = await _agent.agent.api.app.bsky.actor.getProfile({actor: handle});
      profile = res.data;

      if (profile.labels && Array.isArray(profile.labels)) {
          profile.labels = profile.labels.filter(label => label.val !== '!no-unauthenticated');
      }
  }

  function toggleHideCounts() {
      if (!$settings.general?.hideProfileCounts) {
          $settings.general.hideProfileCounts = false;
      }

      $settings.general.hideProfileCounts = !$settings.general.hideProfileCounts;
  }
</script>

{#if (profile.did)}
  <div class="user-profile">
    {#if (profile?.labels?.length)}
      <dl class="profile-reported">
        <dt class="profile-reported__name"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="19.999" viewBox="0 0 20 19.999">
          <path id="exclamation-solid" d="M2.93,17.07a10,10,0,1,1,14.142,0,10,10,0,0,1-14.142,0ZM9,5v6h2V5Zm0,8v2h2V13Z" transform="translate(0)" fill="var(--danger-color)"/>
        </svg>{$_('reporting_this_user')}: </dt>

        {#each profile.labels as label}
          {#if (label?.val !== '!no-unauthenticated')}
            <dd class="profile-reported__content">{$_(label.val)}</dd>
          {/if}
        {/each}
      </dl>
    {/if}

    {#if (profile.viewer?.blocking)}
      {#if (profile.viewer.blocking.split('/').slice(-3)[0] === _agent.did())}
        <p class="profile-muted">{$_('blocking_this_user')}</p>
      {/if}
    {/if}

    {#if (profile.viewer?.blockedBy)}
      <p class="profile-muted">{$_('blocked_by_this_user')}</p>
    {/if}

    {#if (profile.viewer?.muted)}
      <p class="profile-muted">{$_('muting_this_user')}</p>
    {/if}

    <div class="profile-banner">
      {#if (profile.banner)}
        <button onclick={() => imageState.open([{ src: profile.banner, msrc: profile.banner, alt: '', width: 3000, height: 1000 }], 0)}>
          <img in:fade={{ duration: 200 }} src="{profile.banner}" alt="" width="740" height="247">
        </button>
      {/if}
    </div>

    <div class="profile-grid" class:profile-grid--disable-atmos={$settings?.general?.disableAtmosphere} bind:clientWidth={gridWidth}>
      <div class="embla" use:emblaCarouselSvelte={{ options: slideOptions, plugins: [] }}>
        <div class="embla__container">
          <div class="embla__slide embla__slide--left">
            <div class="profile-grid__left">
              <div class="profile-column">
                <div class="profile-avatar">
                  {#if (profile.avatar)}
                    <img src="{profile.avatar}" alt="">
                  {/if}
                </div>

                <div class="profile-content">
                  <h1 class="profile-display-name">
                    {profile.displayName || profile.handle}

                    {#if profile?.verification?.trustedVerifierStatus === 'valid'}
                        <span class="profile-verify-icon">
                          <BadgeCheck size="20" color="var(--primary-color)" strokeWidth="2.5"></BadgeCheck>
                        </span>
                    {/if}

                    {#if profile?.verification?.verifiedStatus === 'valid'}
                      <button class="profile-verify-icon" onclick={() => isVerifierModalOpen = true}>
                        <CircleCheck size="20" color="var(--primary-color)" strokeWidth="2.5"></CircleCheck>
                      </button>
                    {/if}
                  </h1>

                  {#if (profile.displayName)}
                    <p class="profile-handle">@{profile.handle}</p>
                  {/if}

                  {#if ($settings?.general.devMode)}
                    {#if (serviceHost)}
                      <p class="profile-handle profile-handle--service"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>{serviceHost}</p>
                    {/if}
                  {/if}
                </div>
              </div>

              <div class="profile-detail">
                {#if (profile.description)}
                  <div class="profile-description">
                    <p class="profile-description__text">
                      <TimelineText record={textRecord} {_agent} handle={profile.handle}></TimelineText>
                    </p>
                  </div>
                {/if}

                {#if (!isLabeler)}
                  <div class="profile-relationship">
                    <p class="profile-relationship__item"><span>{$settings.general?.hideProfileCounts ? '---' : profile.followsCount}</span> {$_('follows')}</p>
                    <p class="profile-relationship__item"><span>{$settings.general?.hideProfileCounts ? '---' : profile.followersCount}</span> {$_('followers')}</p>
                    <p class="profile-relationship__item"><span>{$settings.general?.hideProfileCounts ? '---' : profile.postsCount}</span> {$_('posts')}</p>

                    <button class="profile-counts-toggle" onclick={toggleHideCounts} aria-label="Hide profile counts." title="Hide profile counts.">
                      {#if ($settings.general?.hideProfileCounts)}
                        <EyeOff color="var(--text-color-1)" size="22"></EyeOff>
                      {:else}
                        <Eye color="var(--text-color-1)" size="22"></Eye>
                      {/if}
                    </button>

                    {#if (profile.viewer?.followedBy)}
                      <p class="profile-relationship-by">
                        <Handshake size="18" color="var(--text-color-3)"></Handshake>
                        {$_('follows_you')}
                      </p>
                    {/if}
                  </div>

                  {#if (firstPostDate)}
                    <p class="profile-first"><a href="{firstPostUri}">{$_('first_post_date', {values: {date: firstPostDate }})}</a></p>
                  {:else}
                    <p class="profile-first">{$_('first_post_date', {values: {date: '----/--/--' }})}</p>
                  {/if}

                  {#if profile?.viewer?.knownFollowers && !$settings.general?.hideProfileCounts && profile.did !== _agent.did()}
                    <SocialProof knownFollowers={profile?.viewer?.knownFollowers} actor={profile.did} {_agent}></SocialProof>
                  {/if}

                  {#if profile?.status?.isActive}
                    <div class="profile-status-embed">
                       <span class="profile-live-label">
                        <Radio color="#fff" size="16"></Radio>
                        LIVE
                      </span>

                      {#if profile?.status?.embed?.external}
                        <EmbedExternal external={profile.status.embed.external}></EmbedExternal>
                      {:else}
                        <div class="profile-status-embed-filler">
                          {$_('status_live_elsewhere')}
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/if}

                <div class="profile-slot">
                  {@render children?.()}
                </div>
              </div>
            </div>
          </div>

          {#if (!$settings?.general?.disableAtmosphere)}
            <div class="embla__slide">
              <div class="profile-grid__right">
                {#if (serviceHost)}
                  <ProfileAtmosphere did={profile.did} handle={profile.handle} endpoint={serviceHost}></ProfileAtmosphere>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  {#if (isVerifierModalOpen)}
    <VerifierModal did={profile?.verification?.verifications[0]?.issuer} {_agent} onclose={() => {isVerifierModalOpen = false}}></VerifierModal>
  {/if}
{/if}

<style lang="postcss">
    .user-profile {
        container-type: inline-size;
    }

    .profile-banner {
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 16px;
        aspect-ratio: 740 / 247;
        background-color: var(--bg-color-2);

        @media (max-width: 767px) {
            border-radius: 10px;
            margin-bottom: 20px;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .profile-column {
        display: grid;
        grid-template-columns: 80px 1fr;
        align-items: flex-start;
        gap: 16px;
        position: relative;

        @media (max-width: 767px) {
            grid-template-columns: 75px 1fr;
            gap: 15px;
        }
    }

    .profile-content {
        word-break: break-all;
    }

    .profile-avatar {
        aspect-ratio: 1 / 1;
        width: 100%;
        border-radius: 50%;
        overflow: hidden;
        background-color: var(--primary-color);
    }

    .profile-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .profile-display-name {
        font-size: 20px;
        line-height: 1.25;
        letter-spacing: .025em;
        font-weight: 900;
        margin-top: 4px;

        @media (max-width: 767px) {
            font-size: 18px;
        }
    }

    .profile-handle {
        font-size: 14px;
        color: var(--text-color-3);
        font-weight: bold;

        &--service {
            font-size: 14px;
            font-weight: normal;
            margin-top: 6px;
            display: grid;
            grid-template-columns: 16px 1fr;
            gap: 4px;
            align-items: flex-start;
            line-height: 1.2;
        }
    }

    .profile-detail {
        margin-top: 16px;
    }

    .profile-description {
        &__text {
            font-size: 14px;
            line-height: 1.75;
            white-space: pre-line;
        }
    }

    .profile-relationship {
        font-size: 18px;
        font-weight: bold;
        line-height: 1.5;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0 15px;
        margin-top: 6px;

        @media (max-width: 767px) {
            font-size: 16px;
        }
    }

    .profile-first {
        color: var(--text-color-3);
        font-size: 14px;
        margin-top: 5px;

        a {
            color: inherit;
        }
    }

    .profile-muted {
        background-color: var(--bg-color-2);
        padding: 10px;
        color: var(--text-color-3);
        margin-bottom: 15px;
        border-radius: 6px;
        border: 1px solid var(--border-color-1);
    }

    .profile-reported {
        color: var(--text-color-1);
        font-weight: bold;
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 15px;
        display: none;
        flex-wrap: wrap;
        gap: 0 5px;
        font-size: 16px;
        border: 2px solid var(--danger-color);

        @media (max-width: 767px) {
            font-size: 14px;
        }

        &:has(.profile-reported__content) {
            display: flex;

            @media (max-width: 767px) {
                display: block;
            }
        }

        &__name {
            display: flex;
            align-items: center;
            gap: 0 4px;
            white-space: nowrap;

            @media (max-width: 767px) {
                white-space: normal;
            }

            svg {
                margin-top: 2px;
                flex-shrink: 0;
            }
        }

        &__content {
            @media (max-width: 767px) {
                margin-left: 25px;
            }
        }
    }

    .profile-grid {
        @container (max-width: 680px) {
            grid-template-columns: 1fr;
        }

        &__left {
            padding: 16px;
            background-color: var(--bg-color-2);
            border-radius: 10px;
        }

        &__right {
            border-radius: 10px;
            position: relative;
            min-width: 0;
            height: 100%;

            &::before{
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 10px;
                border: 3px solid transparent;
                background: linear-gradient(65deg, rgba(88, 220, 174, .7) 0%, rgba(167, 136, 223, .7) 20%, rgba(236, 103, 219, .7) 40%, rgba(218, 119, 142, .7) 60%, rgba(228, 142, 138, .7) 80%, rgba(236, 189, 94, .7) 100%) border-box border-box;
                mask: linear-gradient(#fff 0%, #fff 100%) padding-box, linear-gradient(#fff 0%, #fff 100%) border-box;
                mask-composite: exclude;
                -webkit-mask-composite: destination-out;
            }
        }

        @media (max-width: 767px) {
            grid-template-columns: 1fr;
        }
    }

    .embla {
        overflow: hidden;
    }

    .embla__container {
        display: flex;
        gap: 16px;
    }

    .embla__slide {
        flex: 0 0 calc(100% - 50px);
        min-width: 0;
    }

    .profile-slot {
        margin-top: 16px;
    }

    .profile-verify-icon {
      flex-shrink: 0;
      display: inline-flex;
      vertical-align: middle;
      position: relative;
      bottom: 2px;
    }

    .profile-status-embed {
      position: relative;
    }

    .profile-status-embed-filler {
      background-color: var(--bg-color-1);
      border-radius: var(--border-radius-3);
      box-shadow: 0 0 8px var(--box-shadow-color-1);
      padding: 40px 8px 16px;
      margin-top: 16px;
    }

    .profile-live-label {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      position: absolute;
      left: 8px;
      top: 8px;
      gap: 4px;
      font-size: 12px;
      width: fit-content;
      background-color: var(--danger-color);
      color: #fff;
      font-weight: bold;
      padding: 3px 8px;
      line-height: 1.2;
      border-radius: var(--border-radius-2);
      z-index: 10;
      pointer-events: none;
    }

    :global {
        .profile-relationship-by {
            display: flex;
            align-items: center;
            white-space: nowrap;
            gap: 4px;
            font-weight: 400;
            font-size: 13px;
            width: fit-content;
            padding: 2px 8px;
            border-radius: var(--border-radius-2);
            background-color: var(--bg-color-1);
            color: var(--text-color-3);
            margin-top: 2px;
        }
    }
</style>