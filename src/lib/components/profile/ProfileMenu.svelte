<script lang="ts">
    import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical';
    import Repeat2 from '@lucide/svelte/icons/repeat-2';
    import List from '@lucide/svelte/icons/list';
  import {agent, listAddModal, reportModal} from "$lib/stores";
  import {muteListsState} from "$lib/classes/muteListsState.svelte";
  import {_} from "tokimeki-i18n";
  import Menu from "$lib/components/ui/Menu.svelte";
  import { toast } from "svelte-sonner";
  import AtSign from '@lucide/svelte/icons/at-sign';
  import Flag from '@lucide/svelte/icons/flag';
  import ShieldBan from '@lucide/svelte/icons/shield-ban';
  import VolumeX from '@lucide/svelte/icons/volume-x';
  import {getPostState} from "$lib/classes/postState.svelte";

  let { profile, handle, onrefresh } = $props();
  let isMenuOpen = $state(false);
  const postState = getPostState();

  async function mute() {
      try {
          isMenuOpen = false;
          const mute = await $agent.xrpc.post('app.bsky.graph.muteActor', {actor: handle});

          onrefresh();
      } catch (e) {
          console.error(e)
      }
  }

  async function unmute() {
      try {
          isMenuOpen = false;
          const mute = await $agent.xrpc.post('app.bsky.graph.unmuteActor', {actor: handle});

          onrefresh();
      } catch (e) {
          console.error(e)
      }
  }

  async function getDidByHandle(handle) {
      const res = await $agent.xrpc.get('com.atproto.identity.resolveHandle', { handle: handle });
      return res.did;
  }

  async function block() {
      try {
          isMenuOpen = false;
          const block = await $agent.xrpc.post('com.atproto.repo.createRecord', {
              repo: $agent.did() as string,
              collection: 'app.bsky.graph.block',
              record: {
                  $type: 'app.bsky.graph.block',
                  subject: handle.startsWith('did:plc:') ? handle : await getDidByHandle(handle),
                  createdAt: new Date().toISOString(),
              }
          });
          onrefresh();
      } catch (e) {
          console.error(e)
      }
  }

  async function unblock(uri) {
      try {
          isMenuOpen = false;
          const rkey = uri.split('/').slice(-1)[0];
          const block = await $agent.xrpc.post('com.atproto.repo.deleteRecord', {
              rkey: rkey,
              repo: $agent.did() as string,
              collection: 'app.bsky.graph.block',
          });
          onrefresh();
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

  async function copyUrl() {
      const data = await profile;
      navigator.clipboard.writeText(`https://bsky.app/profile/${data.handle}`)
          .then(() => {
              toast.success($_('success_copy_url'));
          }, () => {
              toast.success($_('failed_copy'));
          });

      isMenuOpen = false;
  }

  function sendMention() {
    const mention = `@${profile.handle}`;
    postState.replaceText(`<span class="editor-mention" data-type="mention" data-id="${mention.slice(1)}">${mention}</span>`);

    isMenuOpen = false;
  }

  function repostMute() {
      muteListsState.muteRepost(profile.did);
      toast.success($_('success_repost_mute'));
  }

  function repostUnmute() {
      muteListsState.unmuteRepost(profile.did);
      toast.success($_('success_repost_unmute'));
  }
</script>

<div class="profile-menu-wrap">
  <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="profile-menu-toggle">
    {#snippet ref()}
      <EllipsisVertical size={20} color="var(--text-color-2)" />
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

          {#if muteListsState.repostMuteSet.has(profile.did)}
            <li class="timeline-menu-list__item timeline-menu-list__item--repost-mute">
              <button class="timeline-menu-list__button" onclick={repostUnmute}>
                <Repeat2 size={18} color="var(--text-color-3)" />
                <span>{$_('repost_mute_off')}</span>
              </button>
            </li>
          {:else}
            <li class="timeline-menu-list__item timeline-menu-list__item--repost-mute">
              <button class="timeline-menu-list__button" onclick={repostMute}>
                <Repeat2 size={18} color="var(--text-color-3)" />
                <span>{$_('repost_mute_on')}</span>
              </button>
            </li>
          {/if}

          <li class="timeline-menu-list__item timeline-menu-list__item--report">
            <button class="timeline-menu-list__button" onclick={() => { isMenuOpen = false; $reportModal = { open: true, data: { type: 'account', did: profile.did } } }}>
              <Flag size="18" color="var(--danger-color)"></Flag>
              <span class="text-danger">{$_('report_account')}</span>
            </button>
          </li>
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

        <li class="timeline-menu-list__item timeline-menu-list__item--copy">
          <button class="timeline-menu-list__button" onclick={copyUrl}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14.417" height="18" viewBox="0 0 14.417 18">
              <path id="clipboard" d="M6.532,2.345a2.7,2.7,0,0,1,5.352,0l1.829.36v.9h.9a1.8,1.8,0,0,1,1.8,1.8V16.221a1.8,1.8,0,0,1-1.8,1.8H3.8a1.8,1.8,0,0,1-1.8-1.8V5.409a1.807,1.807,0,0,1,1.8-1.8h.9v-.9l1.829-.36ZM4.7,5.409H3.8V16.221H14.615V5.409h-.9v.9H4.7Zm4.505-1.8a.9.9,0,1,0-.9-.9A.9.9,0,0,0,9.208,3.606Z" transform="translate(-2 -0.023)" fill="var(--text-color-3)"/>
            </svg>
            <span>{$_('copy_url')}</span>
          </button>
        </li>

          <li class="timeline-menu-list__item timeline-menu-list__item--copy-handle">
            <button class="timeline-menu-list__button" onclick={sendMention}>
              <AtSign size="18" color="var(--text-color-1)"></AtSign>
              {$_('send_mention')}
            </button>
          </li>

        <li class="timeline-menu-list__item timeline-menu-list__item--report">
          <button class="timeline-menu-list__button" onclick={() => {$listAddModal = {open: true, author: profile, did: $agent.did()}}}>
            <List size={18} color="var(--text-color-1)" />
            {$_('list_instant_manage')}
          </button>
        </li>
      </ul>
      {/snippet}
  </Menu>
</div>