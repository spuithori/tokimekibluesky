<script lang="ts">
    import Database from '@lucide/svelte/icons/database';
  import {_} from 'tokimeki-i18n';
  import {agent, settings} from '$lib/stores';
  import {goto} from '$app/navigation';
  import {formatDate} from '$lib/dateFormat';
  import { fade } from 'svelte/transition';
  import {RichText} from '$lib/atproto-richtext';
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import {appState} from '$lib/classes/appState.svelte';
  import {profileLabelling, profileLinkLabelling} from '$lib/timelineFilter';
  import {buildProfileLabelView, type ProfileLabelView} from '$lib/profile/labelView';
  import ProfileLabels from "$lib/components/profile/ProfileLabels.svelte";
  import TimelineChips from "$lib/components/post/TimelineChips.svelte";
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import Eye from '@lucide/svelte/icons/eye';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import Radio from '@lucide/svelte/icons/radio';
  import Globe from '@lucide/svelte/icons/globe';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Tag from '@lucide/svelte/icons/tag';
  import SocialProof from "$lib/components/profile/SocialProof.svelte";
  import ProfileAtmosphereCard from "$lib/components/profile/ProfileAtmosphereCard.svelte";
  import {CARD_GAP, estimatedCardHeight, packPages} from "$lib/atmosphere/profileCards";
  import type {ProfileAtmosphereState} from "$lib/atmosphere/profileAtmosphere.svelte";
  import {isMobileViewport} from "$lib/viewportQuery.svelte";
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import TimelineText from "$lib/components/post/TimelineText.svelte";
  import {imageState} from "$lib/classes/imageState.svelte";
  import VerifierModal from "$lib/components/profile/VerifierModal.svelte";
  import EmbedExternal from "$lib/components/post/EmbedExternal.svelte";
  import {getEndpoint} from "$lib/util";
  import Avatar from "../../Avatar.svelte";
  import AvatarZoomModal from "$lib/components/ui/AvatarZoomModal.svelte";
  import ProfileLinks from "$lib/components/profile/ProfileLinks.svelte";
  import {linksFromProfileView} from "$lib/profileLinks/rules";
  import type {ProfileLinkView} from "$lib/types/atproto";
  import Camera from '@lucide/svelte/icons/camera';
  import X from '@lucide/svelte/icons/x';
  import ProfileImageCropper from "$lib/components/profile/ProfileImageCropper.svelte";
  import ProfileLinksEditor from "$lib/components/profile/ProfileLinksEditor.svelte";
  import ProfileLinkForm from "$lib/components/profile/ProfileLinkForm.svelte";
  import {DESCRIPTION_MAX, DISPLAY_NAME_MAX, isCounterVisible, type ImageTarget, type ProfileEditSession} from "$lib/profile/profileEdit.svelte";

  interface Props {
    profile: any;
    isLabeler?: boolean;
    _agent?: any;
    edit?: ProfileEditSession;
    atmosphere?: ProfileAtmosphereState;
    stacked?: boolean;
    children?: import('svelte').Snippet;
  }

  let { profile, isLabeler = false, _agent = $agent, edit, atmosphere, stacked = false, children }: Props = $props();

  const SLIDER_GUTTER = 16;
  const SLIDER_GAP = 6;
  const SLIDER_DOTS = 16;

  const EMPTY_LABEL_VIEW: ProfileLabelView = {
      plans: [],
      alerts: [],
      informs: [],
      relations: [],
      avatar: { blur: false, noOverride: false },
      banner: { blur: false, noOverride: false },
  };
  const labelView = $derived.by(() => {
      try {
          return buildProfileLabelView(profile, profileLabelling(profile, _agent.did(), $settings, appState.labelDefs.current), _agent.did());
      } catch {
          return EMPTY_LABEL_VIEW;
      }
  });
  let isAvatarRevealed = $state(false);
  let isBannerRevealed = $state(false);
  const isAvatarBlurred = $derived(labelView.avatar.blur && !isAvatarRevealed);
  const isBannerBlurred = $derived(labelView.banner.blur && !isBannerRevealed);

  const isLinkHidden = (view: ProfileLinkView) => {
      if (!view.labels?.length) return false;
      try {
          const ui = profileLinkLabelling(view, _agent.did(), $settings, appState.labelDefs.current).ui('contentList');
          return ui.filter || ui.blur;
      } catch {
          return false;
      }
  };
  const profileLinks = $derived(profile?.links?.length ? linksFromProfileView(profile.links, isLinkHidden) : []);

  const joinedDate = $derived(profile.createdAt ? formatDate(new Date(profile.createdAt), 'yyyy/MM/dd') : '');
  let isFirstPostLoading = false;
  let textRecord = $derived.by(() => {
    const rich = new RichText({text: profile.description});
    rich.detectFacetsWithoutResolution();
    return rich;
  });
  const serviceHost = $derived(atmosphere?.pds ?? '');
  let panelHeight = $state(0);
  let scrolledPage = $state(0);
  const cards = $derived(atmosphere?.cards ?? []);
  const cardHeights = $state<Record<string, number>>({});
  const heights = $derived(cards.map((card) => cardHeights[card.id] || estimatedCardHeight(card.shape)));
  const isShelf = $derived(!stacked && !isMobileViewport.current);
  let isShelfStart = $state(true);
  let isShelfEnd = $state(true);
  let isShelfDragging = $state(false);
  const pages = $derived(!stacked && !isShelf && !edit && panelHeight ? packPages(heights, panelHeight - SLIDER_DOTS) : []);
  const isPaged = $derived(pages.length > 0);
  const activePage = $derived(isPaged ? Math.min(scrolledPage, pages.length) : 0);
  const sliderHeight = $derived.by(() => {
      if (!isPaged) {
          return undefined;
      }
      const page = pages[activePage - 1];
      const needed = page ? page.reduce((sum, index) => sum + heights[index], 0) + CARD_GAP * (page.length - 1) + SLIDER_DOTS : 0;
      return Math.max(panelHeight, needed);
  });
  let fileInput = $state<HTMLInputElement>();
  let pickTarget: ImageTarget = 'avatar';
  let crop = $state.raw<{ file: File; target: ImageTarget }>();
  let isVerifierModalOpen = $state(false);
  let isAvatarZoomOpen = $state(false);

  function sliderStep(el: HTMLElement) {
      return el.clientWidth - SLIDER_GUTTER * 2 + SLIDER_GAP;
  }

  function handleSliderScroll(e: Event & { currentTarget: HTMLDivElement }) {
      const el = e.currentTarget;
      const index = Math.round(el.scrollLeft / sliderStep(el));
      if (index !== scrolledPage) {
          scrolledPage = index;
      }
      if (el.scrollLeft > SLIDER_GUTTER) {
          atmosphere?.load();
      }
  }

  function loadWhenVisible(node: HTMLElement) {
      const observer = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
              observer.disconnect();
              atmosphere?.load();
          }
      });
      observer.observe(node);
      return () => observer.disconnect();
  }

  function stepSlider(e: MouseEvent & { currentTarget: HTMLButtonElement }, direction: 1 | -1) {
      const el = e.currentTarget.parentElement?.querySelector<HTMLElement>('.profile-slider');
      if (!el) {
          return;
      }
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollBy({ left: direction * sliderStep(el), behavior: reduce ? 'auto' : 'smooth' });
  }

  function trackShelf(node: HTMLElement) {
      const update = () => {
          isShelfStart = node.scrollLeft <= 1;
          isShelfEnd = node.scrollLeft >= node.scrollWidth - node.clientWidth - 1;
      };
      update();
      node.addEventListener('scroll', update, { passive: true });
      const observer = new ResizeObserver(update);
      observer.observe(node);
      if (node.firstElementChild) {
          observer.observe(node.firstElementChild);
      }
      return () => {
          node.removeEventListener('scroll', update);
          observer.disconnect();
      };
  }

  function dragShelf(node: HTMLElement) {
      let pointerId: number | null = null;
      let startX = 0;
      let startLeft = 0;
      let dragged = false;

      const nearestEdge = () => {
          const origin = node.getBoundingClientRect().left + SLIDER_GUTTER;
          const max = node.scrollWidth - node.clientWidth;
          let best = node.scrollLeft;
          let bestDistance = Infinity;
          for (const item of node.querySelectorAll<HTMLElement>('.profile-shelf__item')) {
              const left = Math.min(max, Math.max(0, node.scrollLeft + item.getBoundingClientRect().left - origin));
              const distance = Math.abs(left - node.scrollLeft);
              if (distance < bestDistance) {
                  best = left;
                  bestDistance = distance;
              }
          }
          return best;
      };

      const down = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse' || e.button !== 0) {
              return;
          }
          pointerId = e.pointerId;
          startX = e.clientX;
          startLeft = node.scrollLeft;
          dragged = false;
      };
      const move = (e: PointerEvent) => {
          if (e.pointerId !== pointerId) {
              return;
          }
          const dx = e.clientX - startX;
          if (!dragged) {
              if (Math.abs(dx) < 5) {
                  return;
              }
              dragged = true;
              isShelfDragging = true;
              node.setPointerCapture(e.pointerId);
          }
          node.scrollLeft = startLeft - dx;
      };
      const up = (e: PointerEvent) => {
          if (e.pointerId !== pointerId) {
              return;
          }
          pointerId = null;
          if (!dragged) {
              return;
          }
          const left = nearestEdge();
          isShelfDragging = false;
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          node.scrollTo({ left, behavior: reduce ? 'auto' : 'smooth' });
      };
      const click = (e: MouseEvent) => {
          if (dragged) {
              dragged = false;
              e.preventDefault();
              e.stopPropagation();
          }
      };
      const dragstart = (e: DragEvent) => {
          e.preventDefault();
      };

      node.addEventListener('pointerdown', down);
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
      node.addEventListener('pointercancel', up);
      node.addEventListener('click', click, true);
      node.addEventListener('dragstart', dragstart);
      return () => {
          node.removeEventListener('pointerdown', down);
          node.removeEventListener('pointermove', move);
          node.removeEventListener('pointerup', up);
          node.removeEventListener('pointercancel', up);
          node.removeEventListener('click', click, true);
          node.removeEventListener('dragstart', dragstart);
      };
  }

  function loadCardWhenVisible(id: string) {
      return (node: HTMLElement) => {
          const observer = new IntersectionObserver((entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                  observer.disconnect();
                  atmosphere?.loadCard(id);
              }
          });
          observer.observe(node);
          return () => observer.disconnect();
      };
  }

  function stepShelf(e: MouseEvent & { currentTarget: HTMLButtonElement }, direction: 1 | -1) {
      const el = e.currentTarget.parentElement?.querySelector<HTMLElement>('.profile-shelf');
      if (!el) {
          return;
      }
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollBy({ left: direction * (el.clientWidth - SLIDER_GUTTER * 2), behavior: reduce ? 'auto' : 'smooth' });
  }

  async function openFirstPost() {
      if (isFirstPostLoading) {
          return;
      }
      isFirstPostLoading = true;
      const did = profile.did;
      const profileHandle = profile.handle;

      try {
          const endpoint = serviceHost || await getEndpoint(did);
          const res = await fetch(`${endpoint}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(did)}&collection=app.bsky.feed.post&limit=1&reverse=true`);
          const data = await res.json();
          const rkey = data?.records?.[0]?.uri?.split('/').pop();
          if (rkey) {
              await goto(`/profile/${profileHandle}/post/${rkey}`);
          }
      } catch (e) {
          console.error(e);
      } finally {
          isFirstPostLoading = false;
      }
  }

  function pickImage(target: ImageTarget) {
      pickTarget = target;
      fileInput?.click();
  }

  function handleFileSelected(e: Event & { currentTarget: HTMLInputElement }) {
      const file = e.currentTarget.files?.[0];
      e.currentTarget.value = '';
      if (file) {
          crop = { file, target: pickTarget };
      }
  }

  function handleCropComplete(blob: Blob) {
      const target = crop?.target;
      crop = undefined;
      if (edit && target) {
          edit.setImage(target, blob);
      }
  }

  function toggleHideCounts() {
      $settings.general.hideProfileCounts = !$settings.general.hideProfileCounts;
  }

  function handleAvatarClick() {
      if (isAvatarBlurred) {
          if (!labelView.avatar.noOverride) {
              isAvatarRevealed = true;
          }
          return;
      }
      isAvatarZoomOpen = true;
  }

  function handleBannerClick() {
      if (isBannerBlurred) {
          if (!labelView.banner.noOverride) {
              isBannerRevealed = true;
          }
          return;
      }
      imageState.open([{ src: profile.banner, msrc: profile.banner, alt: '', width: 3000, height: 1000 }], 0);
  }
</script>

{#snippet counter(text: string, max: number, left: number)}
  {#if isCounterVisible(text, max)}
    <span class={['profile-edit-count', left < 0 && 'profile-edit-count--over']}>{left}</span>
  {/if}
{/snippet}

{#if (profile.did)}
  <div class="user-profile">
    <div class={['profile-banner', !edit && isBannerBlurred && 'profile-banner--blur']}>
      {#if edit}
        {@const bannerSrc = edit.preview('banner', profile.banner)}
        {#if bannerSrc}
          <img src={bannerSrc} alt="" width="740" height="247">
        {/if}

        <div class="profile-image-actions">
          <button class="profile-image-action" onclick={() => pickImage('banner')}>
            <Camera size="16"></Camera>
            {$_('profile_edit_image_change')}
          </button>

          {#if bannerSrc}
            <button class="profile-image-action" onclick={() => edit.removeImage('banner')}>{$_('delete')}</button>
          {/if}
        </div>
      {:else if (profile.banner)}
        <button onclick={handleBannerClick} aria-label={isBannerBlurred && !labelView.banner.noOverride ? $_('show_button') : undefined}>
          <img in:fade={{ duration: 200 }} src="{profile.banner}" alt="" width="740" height="247">
        </button>
      {/if}
    </div>

    <div class="profile-slider-wrap" style:--slider-gutter="{SLIDER_GUTTER}px" style:--slider-gap="{SLIDER_GAP}px" style:--slider-dots="{SLIDER_DOTS}px" style:--card-gap="{CARD_GAP}px">
      <div class={['profile-slider', isPaged && 'profile-slider--paged']} style:height={sliderHeight ? `${sliderHeight}px` : undefined} onscroll={handleSliderScroll}>
          <div class="profile-slider__panel" bind:clientHeight={panelHeight}>
            <div class="profile-grid__left">
              <div class="profile-column">
                {#if edit}
                  {@const avatarSrc = edit.preview('avatar', profile.avatar)}
                  <div class="profile-avatar profile-avatar--edit">
                    <Avatar avatar={avatarSrc} full={true} onavatarclick={() => pickImage('avatar')}></Avatar>
                    <span class="profile-avatar-badge"><Camera size="14"></Camera></span>

                    {#if avatarSrc}
                      <button class="profile-avatar-remove" onclick={() => edit.removeImage('avatar')} aria-label={$_('delete')} title={$_('delete')}>
                        <X size="14"></X>
                      </button>
                    {/if}
                  </div>
                {:else}
                  <div class={['profile-avatar', isAvatarBlurred && 'profile-avatar--blur']}>
                    <Avatar avatar={profile.avatar} onavatarclick={handleAvatarClick}></Avatar>
                  </div>
                {/if}

                <div class="profile-content">
                  {#if edit}
                    <div class="profile-edit-field profile-edit-field--name">
                      <input
                          class="profile-display-name profile-edit-input"
                          type="text"
                          bind:value={edit.displayName}
                          aria-label={$_('edit_display_name')}
                          placeholder={$_('edit_display_name')}
                          aria-invalid={edit.displayNameLeft < 0}
                      >
                      {@render counter(edit.displayName, DISPLAY_NAME_MAX, edit.displayNameLeft)}
                    </div>
                  {:else}
                  <div class="profile-name">
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

                    {#if labelView.plans.length}
                      <TimelineChips labels={labelView.plans}></TimelineChips>
                    {/if}
                  </div>
                  {/if}

                  {#if (edit || profile.displayName)}
                    <p class="profile-handle">@{profile.handle}</p>
                  {/if}

                  {#if ($settings?.general.devMode)}
                    {#if (serviceHost)}
                      <p class="profile-handle profile-handle--service"><Database size={16} color="var(--text-color-3)" />{serviceHost}</p>
                    {/if}
                  {/if}
                </div>
              </div>

              <div class="profile-detail">
                <ProfileLabels view={labelView}></ProfileLabels>

                {#if edit}
                  {#if edit.error}
                    <p class="profile-edit-error" role="alert">{edit.error}</p>
                  {/if}

                  <div class="profile-edit-field">
                    <div class="profile-edit-area profile-description__text" data-value={edit.description}>
                      <textarea
                          class="profile-edit-input"
                          rows="1"
                          bind:value={edit.description}
                          aria-label={$_('edit_description')}
                          placeholder={$_('edit_description')}
                          aria-invalid={edit.descriptionLeft < 0}
                      ></textarea>
                    </div>
                    {@render counter(edit.description, DESCRIPTION_MAX, edit.descriptionLeft)}
                  </div>

                  <div class="profile-edit-field profile-edit-field--pronouns">
                    <input
                        class="profile-edit-input"
                        type="text"
                        bind:value={edit.pronouns}
                        aria-label={$_('edit_pronouns')}
                        placeholder={$_('edit_pronouns')}
                    >
                  </div>

                  <div class="profile-edit-links">
                    {#if edit.linkFormIndex !== undefined}
                      <ProfileLinkForm
                          link={edit.linkFormIndex === null ? null : edit.links[edit.linkFormIndex]}
                          otherUrls={edit.links.filter((_link, i) => i !== edit.linkFormIndex).map((link) => link.url)}
                          {_agent}
                          onsave={(link) => edit.saveLink(link)}
                          onremove={edit.linkFormIndex === null ? undefined : () => edit.removeLink()}
                      ></ProfileLinkForm>
                      <button class="profile-edit-links__back text-button" onclick={() => { edit.linkFormIndex = undefined; }}>{$_('edit_cancel_button')}</button>
                    {:else}
                      <ProfileLinksEditor bind:links={edit.links} did={profile.did} status={edit.linksStatus} onedit={(index) => { edit.linkFormIndex = index; }}></ProfileLinksEditor>
                    {/if}
                  </div>
                {:else}
                  {#if (profile.description)}
                    <div class="profile-description">
                      <p class="profile-description__text">
                        <TimelineText record={textRecord} {_agent} handle={profile.handle}></TimelineText>
                      </p>
                    </div>
                  {/if}

                  {#if (profileLinks.length)}
                    <ProfileLinks links={profileLinks} did={profile.did}></ProfileLinks>
                  {/if}
                {/if}

                {#if (!isLabeler)}
                  <div class="profile-relationship">
                    <a href="/profile/{profile.handle}/follow" data-sveltekit-noscroll class="profile-relationship__item"><span>{$settings.general?.hideProfileCounts ? '•••' : profile.followsCount}</span> {$_('follows')}</a>
                    <a href="/profile/{profile.handle}/follower" data-sveltekit-noscroll class="profile-relationship__item"><span>{$settings.general?.hideProfileCounts ? '•••' : profile.followersCount}</span> {$_('followers')}</a>
                    <p class="profile-relationship__item"><span>{$settings.general?.hideProfileCounts ? '•••' : profile.postsCount}</span> {$_('posts')}</p>

                    <button
                        class="profile-counts-toggle"
                        onclick={toggleHideCounts}
                        aria-label={$_($settings.general?.hideProfileCounts ? 'profile_counts_show' : 'profile_counts_hide')}
                        title={$_($settings.general?.hideProfileCounts ? 'profile_counts_show' : 'profile_counts_hide')}
                    >
                      {#if ($settings.general?.hideProfileCounts)}
                        <EyeOff size="16"></EyeOff>
                      {:else}
                        <Eye size="16"></Eye>
                      {/if}
                    </button>
                  </div>

                  <div class="profile-bottom-list">
                    {#if !edit && profile?.website && !profileLinks.length}
                      <p class="profile-website">
                        <Globe size="16"></Globe>
                        <a href={profile.website} target="_blank" rel="noopener noreferrer">{new URL(profile.website).hostname}</a>
                      </p>
                    {/if}

                    {#if !edit && profile?.pronouns}
                      <p class="profile-pronouns">
                        <Tag size="16"></Tag>
                        {profile.pronouns}
                      </p>
                    {/if}

                    {#if (joinedDate)}
                      <button class="profile-first" onclick={openFirstPost}>
                        <Calendar size="16"></Calendar>
                        {joinedDate}
                      </button>
                    {/if}
                  </div>

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

          {#each pages as page (cards[page[0]].id)}
            <div class="profile-slider__page">
              <div class="profile-slider__page-inner">
                {#each page as index (cards[index].id)}
                  <ProfileAtmosphereCard def={cards[index]} data={atmosphere?.data[cards[index].id] ?? undefined} did={profile.did} handle={profile.handle} {_agent} bind:height={cardHeights[cards[index].id]}></ProfileAtmosphereCard>
                {/each}
              </div>
            </div>
          {/each}
      </div>

      {#if isPaged}
        <div class="profile-slider__dots" aria-hidden="true">
          {#each { length: pages.length + 1 } as _, i (i)}
            <i class={[i === activePage && 'profile-slider__dot--on']}></i>
          {/each}
        </div>

        {#if activePage > 0}
          <button class="profile-slider__arrow profile-slider__arrow--prev" onclick={(e) => stepSlider(e, -1)} aria-label={$_('profile_slider_prev')}>
            <ChevronLeft size="18"></ChevronLeft>
          </button>
        {/if}

        {#if activePage < pages.length}
          <button class="profile-slider__arrow profile-slider__arrow--next" onclick={(e) => stepSlider(e, 1)} aria-label={$_('profile_slider_next')}>
            <ChevronRight size="18"></ChevronRight>
          </button>
        {/if}
      {/if}
    </div>

    {#if isShelf && !edit && cards.length}
      <div class="profile-shelf-wrap" style:--slider-gutter="{SLIDER_GUTTER}px" style:--card-gap="{CARD_GAP}px">
        <div class={['profile-shelf', isShelfDragging && 'profile-shelf--dragging']} role="region" aria-label={$_('atmosphere')} {@attach trackShelf} {@attach dragShelf}>
          <div class="profile-shelf__track">
            {#each cards as card (card.id)}
              <div class="profile-shelf__item" {@attach loadCardWhenVisible(card.id)}>
                <ProfileAtmosphereCard def={card} data={atmosphere?.data[card.id] ?? undefined} did={profile.did} handle={profile.handle} {_agent}></ProfileAtmosphereCard>
              </div>
            {/each}
          </div>
        </div>

        {#if !isShelfStart}
          <button class="profile-slider__arrow profile-slider__arrow--prev" onclick={(e) => stepShelf(e, -1)} aria-label={$_('profile_slider_prev')}>
            <ChevronLeft size="18"></ChevronLeft>
          </button>
        {/if}

        {#if !isShelfEnd}
          <button class="profile-slider__arrow profile-slider__arrow--next" onclick={(e) => stepShelf(e, 1)} aria-label={$_('profile_slider_next')}>
            <ChevronRight size="18"></ChevronRight>
          </button>
        {/if}
      </div>
    {/if}

    {#if stacked && cards.length}
      <div class="profile-stack" style:--card-gap="{CARD_GAP}px" {@attach loadWhenVisible}>
        {#each cards as card (card.id)}
          <ProfileAtmosphereCard def={card} data={atmosphere?.data[card.id] ?? undefined} did={profile.did} handle={profile.handle} {_agent}></ProfileAtmosphereCard>
        {/each}
      </div>
    {/if}
  </div>

  {#if edit}
    <input class="profile-edit-file" type="file" accept="image/jpeg, image/png" bind:this={fileInput} onchange={handleFileSelected}>
  {/if}

  {#if (edit && crop)}
    <ProfileImageCropper file={crop.file} target={crop.target} oncomplete={handleCropComplete} oncancel={() => { crop = undefined; }}></ProfileImageCropper>
  {/if}

  {#if (isVerifierModalOpen)}
    <VerifierModal did={profile?.verification?.verifications[0]?.issuer} {_agent} onclose={() => {isVerifierModalOpen = false}}></VerifierModal>
  {/if}

  {#if (isAvatarZoomOpen && profile.avatar)}
    <AvatarZoomModal avatar={profile.avatar} onclose={() => { isAvatarZoomOpen = false; }}></AvatarZoomModal>
  {/if}
{/if}

<style lang="postcss">
    .user-profile {
        container-type: inline-size;
    }

    .profile-banner {
        position: relative;
        border-radius: var(--radius-card, 10px);
        overflow: hidden;
        margin-bottom: 16px;
        aspect-ratio: 740 / 247;
        background-color: var(--bg-color-2);

        @media (max-width: 767px) {
            border-radius: var(--radius-card, 10px);
            margin-bottom: 20px;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        &--blur img {
            filter: blur(24px);
            transform: scale(1.15);
        }
    }

    .profile-avatar--blur :global(img) {
        filter: blur(10px);
    }

    .profile-image-actions {
        position: absolute;
        right: 8px;
        bottom: 8px;
        display: flex;
        gap: 8px;
    }

    .profile-image-action {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 32px;
        padding: 0 12px;
        border-radius: var(--radius-round, 16px);
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 0 8px var(--box-shadow-color-1);

        &:hover {
            background-color: var(--state-hover, var(--border-color-1));
        }
    }

    .profile-avatar--edit {
        position: relative;
    }

    .profile-avatar-badge,
    .profile-avatar-remove {
        position: absolute;
        z-index: 2;
        display: grid;
        place-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        box-shadow: 0 0 8px var(--box-shadow-color-1);
    }

    .profile-avatar-badge {
        right: -2px;
        bottom: -2px;
        pointer-events: none;
    }

    .profile-avatar-remove {
        right: -2px;
        top: -2px;

        &:hover {
            background-color: var(--state-hover, var(--border-color-1));
        }
    }

    .profile-edit-file {
        display: none;
    }

    .profile-edit-field {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        min-width: 0;

        &--name {
            margin-top: 4px;
        }

        &--pronouns {
            margin-top: 20px;
            font-size: 14px;
        }
    }

    .profile-edit-input {
        flex: 1;
        min-width: 0;
        margin: -5px 0 -5px -9px;
        padding: 4px 8px;
        border: 1px solid var(--border-color-1);
        border-radius: var(--border-radius-3);
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        font: inherit;
        letter-spacing: inherit;

        &:focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: -1px;
        }

        &[aria-invalid="true"] {
            border-color: var(--danger-color);
        }
    }

    .profile-edit-area {
        flex: 1;
        min-width: 0;
        display: grid;
        margin: -5px 0 -5px -9px;

        &::after {
            content: attr(data-value) ' ';
            grid-area: 1 / 1;
            visibility: hidden;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            padding: 4px 8px;
            border: 1px solid transparent;
        }

        textarea {
            grid-area: 1 / 1;
            width: 100%;
            margin: 0;
            resize: none;
            overflow: hidden;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
    }

    .profile-edit-count {
        flex-shrink: 0;
        min-width: 28px;
        font-size: 12px;
        font-weight: normal;
        line-height: 1.75;
        text-align: right;
        color: var(--text-color-3);
        font-variant-numeric: tabular-nums;

        &--over {
            color: var(--danger-color);
            font-weight: bold;
        }
    }

    .profile-edit-error {
        margin-bottom: 12px;
        padding: 6px 10px;
        border-radius: var(--border-radius-3);
        background-color: color-mix(in srgb, var(--danger-color) 12%, transparent);
        color: var(--danger-color);
        font-size: 14px;
    }

    .profile-edit-links {
        margin-top: 16px;

        &__back {
            margin-top: 8px;
            font-size: 14px;
            color: var(--text-color-3);
        }
    }

    .profile-name {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        margin-top: 4px;

        :global(.timeline-chips) {
            margin-bottom: 0;
        }
    }

    .profile-counts-toggle {
        display: grid;
        place-content: center;
        position: absolute;
        top: -4px;
        right: 0;
        width: 32px;
        height: 32px;
        border-radius: var(--radius-round, 50%);
        color: var(--text-color-3);
        transition: background-color var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out);

        &:hover {
            background-color: var(--state-hover, var(--border-color-1));
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
        min-width: 0;
        word-break: break-all;
    }

    .profile-avatar {
        aspect-ratio: 1 / 1;
        width: 100%;
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
        position: relative;
        padding-right: 36px;
        font-size: 16px;
        font-weight: bold;
        line-height: 1.5;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 15px;
        margin-top: 6px;

        a {
            color: inherit;
        }

        @media (max-width: 767px) {
            font-size: 15px;
        }
    }

    .profile-first {
        color: var(--text-color-3);
        display: flex;
        gap: 4px;
        align-items: center;
        font-size: inherit;

        &:hover {
            text-decoration: underline;
        }
    }

    .profile-grid__left {
        padding: 16px;
        background-color: var(--bg-color-2);
        border-radius: var(--radius-card, 10px);
    }

    .profile-slider-wrap {
        position: relative;
    }

    .profile-stack {
        display: flex;
        flex-direction: column;
        gap: var(--card-gap);
        margin-top: 16px;
    }

    .profile-slider {
        display: flex;
        gap: var(--slider-gap);
        margin-inline: calc(var(--slider-gutter) * -1);
        padding-inline: var(--slider-gutter);
        overflow: hidden;

        &--paged {
            align-items: flex-start;
            overflow-x: auto;
            overflow-y: hidden;
            transition: height var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out);

            @media (prefers-reduced-motion: reduce) {
                transition: none;
            }
            scroll-snap-type: x mandatory;
            scroll-padding-inline: var(--slider-gutter);
            overscroll-behavior-x: contain;
            scrollbar-width: none;

            &::-webkit-scrollbar {
                display: none;
            }

            &::after {
                content: '';
                flex: 0 0 calc(var(--slider-gutter) - var(--slider-gap));
            }
        }

        &__panel,
        &__page {
            flex: 0 0 100%;
            min-width: 0;
            scroll-snap-align: start;
            scroll-snap-stop: always;
        }

        &__page {
            position: relative;
            align-self: stretch;
        }

        &__page-inner {
            position: absolute;
            inset: 0 0 var(--slider-dots) 0;
            display: flex;
            flex-direction: column;
            gap: var(--card-gap);
            overflow: hidden;
        }

        &__dots {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 5px;
            display: flex;
            justify-content: center;
            gap: 5px;
            pointer-events: none;

            i {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background-color: var(--border-color-1);
            }
        }

        &__dots &__dot--on {
            background-color: var(--text-color-2);
        }

        &__arrow {
            display: none;
            position: absolute;
            top: 50%;
            translate: 0 -50%;
            z-index: 2;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: var(--bg-color-1);
            color: var(--text-color-1);
            box-shadow: 0 0 8px var(--box-shadow-color-1);

            &--prev {
                left: -12px;
            }

            &--next {
                right: -12px;
            }

            &:hover {
                background-color: var(--state-hover, var(--border-color-1));
            }

            @media (hover: hover) and (pointer: fine) {
                display: grid;
                place-content: center;
                opacity: 0;
                transition: opacity var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out);
            }
        }
    }

    .profile-shelf-wrap {
        position: relative;
        margin-top: 16px;
    }

    .profile-shelf {
        container-type: inline-size;
        margin-inline: calc(var(--slider-gutter) * -1);
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x mandatory;
        scroll-padding-inline: var(--slider-gutter);
        overscroll-behavior-x: contain;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }

        &--dragging {
            scroll-snap-type: none;
            cursor: grabbing;
            user-select: none;
        }

        &__track {
            display: flex;
            align-items: flex-start;
            gap: var(--card-gap);
            width: max-content;
            padding-inline: var(--slider-gutter);
        }

        &__item {
            display: flex;
            flex-direction: column;
            flex: 0 0 min(300px, 80cqi);
            min-width: 0;
            scroll-snap-align: start;
        }
    }

    .profile-slider-wrap:hover .profile-slider__arrow,
    .profile-shelf-wrap:hover .profile-slider__arrow,
    .profile-slider__arrow:focus-visible {
        opacity: 1;
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
      color: var(--on-danger, #fff);
      font-weight: bold;
      padding: 3px 8px;
      line-height: 1.2;
      border-radius: var(--border-radius-2);
      z-index: 10;
      pointer-events: none;
    }

    .profile-bottom-list {
        font-size: 14px;
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 4px 8px;
    }

    .profile-website {
        display: flex;
        gap: 4px;
        align-items: center;
        color: var(--text-color-3);

        a {
            color: inherit;
        }
    }

    .profile-pronouns {
        display: flex;
        gap: 4px;
        align-items: center;
        color: var(--text-color-3);
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