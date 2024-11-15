<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import {_} from 'svelte-i18n';
  import {agent, settings} from '$lib/stores';
  import {getTextArray, isUriLocal} from '$lib/richtext';
  import {page} from '$app/stores';
  import {format, parseISO} from 'date-fns';
  import ProfileCardWrapper from '../../ProfileCardWrapper.svelte';
  import {BskyAgent, RichText} from '@atproto/api';
  import { Eye, EyeOff } from 'lucide-svelte';
  import SocialProof from "$lib/components/profile/SocialProof.svelte";
  import ProfileAtmosphere from "$lib/components/profile/ProfileAtmosphere.svelte";
  import emblaCarouselSvelte from 'embla-carousel-svelte';

  const dispatch = createEventDispatcher();

  interface Props {
    handle: any;
    profile?: any;
    isLabeler?: boolean;
  }

  let { handle, profile = $bindable(getProfile(handle)), isLabeler = false, _agent = $agent, children }: Props = $props();

  let firstPostDate = $state('');
  let firstPostUri = $state('');
  let textArray = $derived.by(() => {
      const rich = new RichText({text: profile.description})
      rich.detectFacets(_agent.agent);
      return getTextArray(rich);
  });
  let serviceHost = $state('');
  let gridWidth = $state(0);
  const __agent = new BskyAgent({service: _agent.service()});

  getServiceHost()
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

  async function getServiceHost() {
      const res = await fetch('https://plc.directory/' + profile.did);
      const json = await res.json();
      return json?.service[0]?.serviceEndpoint;
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
          <path id="exclamation-solid" d="M2.93,17.07a10,10,0,1,1,14.142,0,10,10,0,0,1-14.142,0ZM9,5v6h2V5Zm0,8v2h2V13Z" transform="translate(0)" fill="#ffffff"/>
        </svg>{$_('reporting_this_user')}: </dt>

        {#each profile.labels as label}
          <dd class="profile-reported__content">{$_(label.val)}</dd>
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

    {#if (profile.banner)}
      <div class="profile-banner">
        <img src="{profile.banner}" alt="" width="740" height="247">
      </div>
    {/if}

    <div class="profile-grid" class:profile-grid--disable-atmos={$settings?.general?.disableAtmosphere} bind:clientWidth={gridWidth}>
      <div
        class="embla"
        use:emblaCarouselSvelte={{options: {
            loop: false,
        }}}
      >
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
                  <h1 class="profile-display-name">{profile.displayName || profile.handle}</h1>
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
                      {#each textArray as item}
                        {#if (item.isLink() && item.link)}
                          {#if (isUriLocal(item.link.uri))}
                            <a href="{new URL(item.link.uri).pathname}">{item.text}</a>
                          {:else}
                            <a href="{item.link.uri}" target="_blank" rel="noopener nofollow noreferrer">{item.text}</a>
                          {/if}
                        {:else if (item.isMention() && item.mention)}
                          <ProfileCardWrapper handle="{item.text.slice(1)}">
                            <a href="/profile/{item.text.slice(1)}">{item.text}</a>
                          </ProfileCardWrapper>
                        {:else if (item.isTag() && item.tag)}
                          <a href="/search?q={encodeURIComponent('#' + item.tag?.tag)}">{item.text}</a>
                        {:else}
                          <span>{item.text}</span>
                        {/if}
                      {/each}
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
                      <p class="profile-relationship__by"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-handshake"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>{$_('follows_you')}
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
                <ProfileAtmosphere did={profile.did} handle={profile.handle} _agent={__agent}></ProfileAtmosphere>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style lang="postcss">
    .user-profile {
        container-type: inline-size;
    }

    .profile-banner {
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 16px;

        @media (max-width: 767px) {
            border-radius: 10px;
            margin-bottom: 20px;
        }
    }

    .profile-banner img {
        width: 100%;
        height: auto;
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
        line-height: 1.5;
        letter-spacing: .025em;
        font-weight: 900;
        margin-top: 2px;

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

        &__by {
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
        background-color: var(--danger-color);
        color: #fff;
        font-weight: bold;
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 15px;
        display: flex;
        flex-wrap: wrap;
        gap: 0 5px;
        font-size: 18px;

        @media (max-width: 767px) {
            font-size: 15px;
            display: block;
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
</style>