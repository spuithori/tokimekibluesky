<script lang="ts">
  import {agent, listAddModal, repostMutes} from "$lib/stores";
  import {_} from "svelte-i18n";
  import Menu from "$lib/components/ui/Menu.svelte";
  import { toast } from "svelte-sonner";
  import {createEventDispatcher} from "svelte";
  import {ShieldBan, VolumeX} from "lucide-svelte";
  const dispatch = createEventDispatcher();

  let { profile, handle } = $props();
  let isMenuOpen = $state(false);

  async function mute() {
      try {
          isMenuOpen = false;
          const mute = await $agent.agent.api.app.bsky.graph.muteActor({actor: handle});

          dispatch('refresh');
      } catch (e) {
          console.error(e)
      }
  }

  async function unmute() {
      try {
          isMenuOpen = false;
          const mute = await $agent.agent.api.app.bsky.graph.unmuteActor({actor: handle});

          dispatch('refresh');
      } catch (e) {
          console.error(e)
      }
  }

  async function getDidByHandle(handle) {
      const res = await $agent.agent.api.com.atproto.identity.resolveHandle({ handle: handle });
      return res.data.did;
  }

  async function block() {
      try {
          isMenuOpen = false;
          const did = await getDidByHandle(handle);
          const block = await $agent.agent.api.app.bsky.graph.block.create(
              { repo: $agent.did() },
              {
                  subject: did,
                  createdAt: new Date().toISOString(),
              });
          dispatch('refresh');
      } catch (e) {
          console.error(e)
      }
  }

  async function unblock(uri) {
      try {
          isMenuOpen = false;
          const did = await getDidByHandle(handle);
          const rkey = uri.split('/').slice(-1)[0];
          const block = await $agent.agent.api.app.bsky.graph.block.delete(
              {rkey: rkey, repo: $agent.did() },
              {
                  subject: did,
                  createdAt: new Date().toISOString(),
              });
          dispatch('refresh');
      } catch (e) {
          console.error(e)
      }
  }

  async function copyDid() {
      const data = await profile;
      navigator.clipboard.writeText(data.did)
          .then(() => {
              toast.success($_('success_copy_did'));
          }, () => {
              toast.success($_('failed_copy'));
          });

      isMenuOpen = false;
  }

  function repostMute() {
      $repostMutes = [...$repostMutes, profile.did];
      localStorage.setItem('repostMutes', JSON.stringify($repostMutes));
      toast.success($_('success_repost_mute'));
  }

  function repostUnmute() {
      $repostMutes = $repostMutes.filter(dids => dids !== profile.did);
      localStorage.setItem('repostMutes', JSON.stringify($repostMutes));
      toast.success($_('success_repost_unmute'));
  }
</script>

<div class="profile-menu-wrap">
  <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="profile-menu-toggle">
    {#snippet ref()}
      <svg  xmlns="http://www.w3.org/2000/svg" width="4.5" height="18" viewBox="0 0 4.5 18">
        <path id="dots-horizontal-triple" d="M10.25,13.25A2.25,2.25,0,1,1,12.5,11,2.25,2.25,0,0,1,10.25,13.25Zm0-6.75A2.25,2.25,0,1,1,12.5,4.25,2.25,2.25,0,0,1,10.25,6.5Zm0,13.5a2.25,2.25,0,1,1,2.25-2.25A2.25,2.25,0,0,1,10.25,20Z" transform="translate(-8 -2)" fill="var(--text-color-3)"/>
      </svg>
    {/snippet}

    {#snippet content()}
        <ul  class="timeline-menu-list">
        {#if (profile.did !== $agent.did())}
          {#if (!profile.viewer?.muted)}
            <li class="timeline-menu-list__item timeline-menu-list__item--mute">
              <button class="timeline-menu-list__button" onclick={mute}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20.414" height="20.485" viewBox="0 0 20.414 20.485">
                  <g id="グループ_86" data-name="グループ 86" transform="translate(-1038.793 -743.722)">
                    <path id="volume-mute" d="M9.889,8.111H5v7.333H9.889L16,21.556V2Z" transform="translate(1036.6 741.722)" fill="var(--danger-color)"/>
                    <line id="線_22" data-name="線 22" x1="19" y2="19" transform="translate(1039.5 744.5)" fill="none" stroke="var(--danger-color)" stroke-width="2"/>
                  </g>
                </svg>
                <span class="text-danger">{$_('mute_user')}</span>
              </button>
            </li>
          {:else}
            <li class="timeline-menu-list__item timeline-menu-list__item--mute">
              <button class="timeline-menu-list__button" onclick={unmute}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20.414" height="20.485" viewBox="0 0 20.414 20.485">
                  <g id="グループ_86" data-name="グループ 86" transform="translate(-1038.793 -743.722)">
                    <path id="volume-mute" d="M9.889,8.111H5v7.333H9.889L16,21.556V2Z" transform="translate(1036.6 741.722)" fill="var(--danger-color)"/>
                    <line id="線_22" data-name="線 22" x1="19" y2="19" transform="translate(1039.5 744.5)" fill="none" stroke="var(--danger-color)" stroke-width="2"/>
                  </g>
                </svg>
                <span class="text-danger">{$_('unmute_user')}</span>
              </button>
            </li>
          {/if}

          {#if (!profile.viewer?.blocking)}
            <li class="timeline-menu-list__item timeline-menu-list__item--mute">
              <button class="timeline-menu-list__button" onclick={block}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
                  <path id="block" d="M0,9a9,9,0,1,1,9,9A9,9,0,0,1,0,9ZM14.688,4.59,4.581,14.679a7.2,7.2,0,0,0,10.107-10.1ZM13.419,3.312A7.2,7.2,0,0,0,3.312,13.419L13.419,3.312Z" fill="var(--danger-color)"/>
                </svg>
                <span class="text-danger">{$_('block_user')}</span>
              </button>
            </li>
          {:else}
            <li class="timeline-menu-list__item timeline-menu-list__item--mute">
              <button class="timeline-menu-list__button" onclick={() => {unblock(profile.viewer.blocking)}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
                  <path id="block" d="M0,9a9,9,0,1,1,9,9A9,9,0,0,1,0,9ZM14.688,4.59,4.581,14.679a7.2,7.2,0,0,0,10.107-10.1ZM13.419,3.312A7.2,7.2,0,0,0,3.312,13.419L13.419,3.312Z" fill="var(--danger-color)"/>
                </svg>
                <span class="text-danger">{$_('unblock_user')}</span>
              </button>
            </li>
          {/if}

          {#if $repostMutes.includes(profile.did)}
            <li class="timeline-menu-list__item timeline-menu-list__item--repost-mute">
              <button class="timeline-menu-list__button" onclick={repostUnmute}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
                <span>{$_('repost_mute_off')}</span>
              </button>
            </li>
          {:else}
            <li class="timeline-menu-list__item timeline-menu-list__item--repost-mute">
              <button class="timeline-menu-list__button" onclick={repostMute}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
                <span>{$_('repost_mute_on')}</span>
              </button>
            </li>
          {/if}
        {:else}
          <li class="timeline-menu-list__item timeline-menu-list__item--copy">
            <a href="/mutes/{$agent.did()}" class="timeline-menu-list__button">
              <VolumeX size="18" color="var(--text-color-3)"></VolumeX>
              <span>{$_('mutes_list')}</span>
            </a>
          </li>

          <li class="timeline-menu-list__item timeline-menu-list__item--copy">
            <a href="/blocks/{$agent.did()}" class="timeline-menu-list__button">
              <ShieldBan size="18" color="var(--text-color-3)"></ShieldBan>
              <span>{$_('blocks_list')}</span>
            </a>
          </li>
        {/if}

        <li class="timeline-menu-list__item timeline-menu-list__item--copy">
          <button class="timeline-menu-list__button" onclick={copyDid}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14.417" height="18" viewBox="0 0 14.417 18">
              <path id="clipboard" d="M6.532,2.345a2.7,2.7,0,0,1,5.352,0l1.829.36v.9h.9a1.8,1.8,0,0,1,1.8,1.8V16.221a1.8,1.8,0,0,1-1.8,1.8H3.8a1.8,1.8,0,0,1-1.8-1.8V5.409a1.807,1.807,0,0,1,1.8-1.8h.9v-.9l1.829-.36ZM4.7,5.409H3.8V16.221H14.615V5.409h-.9v.9H4.7Zm4.505-1.8a.9.9,0,1,0-.9-.9A.9.9,0,0,0,9.208,3.606Z" transform="translate(-2 -0.023)" fill="var(--text-color-3)"/>
            </svg>
            <span>{$_('copy_did')}</span>
          </button>
        </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--report">
          <button class="timeline-menu-list__button" onclick={() => {$listAddModal = {open: true, author: profile, did: $agent.did()}}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
            {$_('list_instant_manage')}
          </button>
        </li>
      </ul>
      {/snippet}
  </Menu>
</div>