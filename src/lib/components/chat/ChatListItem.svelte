<script lang="ts">
    import {format, parseISO} from "date-fns";
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {toast} from "svelte-sonner";
    import {_} from "svelte-i18n";
    import Menu from "$lib/components/ui/Menu.svelte";
    import {ListPlus, LogOut, MessageCircleOff, PictureInPicture2} from "lucide-svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {goto} from "$app/navigation";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {intlRelativeTimeFormatState} from "$lib/classes/intlRelativeTimeFormatState.svelte";
    const columnState = getColumnState();
    const junkColumnState = getColumnState(true);

    let { convo, _agent, onrefresh } = $props();
    let isMenuOpen = $state(false);

    function addColumn(id, name, isPopup = false) {
        columnState.add({
            id: self.crypto.randomUUID(),
            algorithm: {
                type: 'chat',
                id: id,
                name: name,
            },
            style: 'default',
            settings: {
                ...defaultDeckSettings,
                isPopup: isPopup,
            },
            did: _agent.did(),
            handle: _agent.handle(),
            data: {
                feed: [],
                cursor: '',
            }
        })
        toast.success($_('column_added'));
    }

    async function leaveChat() {
        try {
            const res = await _agent.agent.api.chat.bsky.convo.leaveConvo({convoId: convo.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            const id = res.data.convoId;
            toast.success($_('success_leave_chat'));
            onrefresh(id);
        } catch (e) {
            console.error(e);
        }
    }

    async function muteChat() {
        try {
            const res = await _agent.agent.api.chat.bsky.convo.muteConvo({convoId: convo.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            const id = res.data.convo.id;
            toast.success($_('success_mute_chat'));
            onrefresh(id);
        } catch (e) {
            console.error(e);
        }
    }

    async function unMuteChat() {
        try {
            const res = await _agent.agent.api.chat.bsky.convo.unmuteConvo({convoId: convo.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            const id = res.data.convo.id;
            toast.success($_('success_unmute_chat'));
            onrefresh(id);
        } catch (e) {
            console.error(e);
        }
    }

    function handleOpen() {
        if (!junkColumnState.hasColumn('chat_' + convo.id)) {
            junkColumnState.add({
                id: 'chat_' + convo.id,
                algorithm: {
                    id: convo.id,
                    type: 'chat',
                    name: convo.members.filter(member => member.did !== _agent.did())[0].displayName || convo.members.filter(member => member.did !== _agent.did())[0].handle,
                },
                style: 'default',
                settings: {
                    ...defaultDeckSettings,
                },
                did: _agent.did(),
                handle: _agent.handle(),
                data: {
                    feed: [],
                    cursor: '',
                }
            });
        }

        goto('/chat/' + convo.id);
    }
</script>

<article class="convo-item">
  <div class="convo-item__avatar">
    <Avatar href="/profile/{convo.members.filter(member => member.did !== _agent.did())[0].handle}" avatar={convo.members.filter(member => member.did !== _agent.did())[0].avatar} handle={convo.members.filter(member => member.did !== _agent.did())[0].handle}></Avatar>

    {#if convo.unreadCount && !convo.muted}
      <div class="convo-badge">{convo.unreadCount}</div>
    {/if}
  </div>

  <div class="convo-item__content">
    <div class="convo-item__heading">
      {#if convo.muted}
        <div class="convo-item__mute">
           <MessageCircleOff color="var(--danger-color)" size="16"></MessageCircleOff>
        </div>
      {/if}

      <h3 class="convo-item__name">{convo.members.filter(member => member.did !== _agent.did())[0].displayName || convo.members.filter(member => member.did !== _agent.did())[0].handle}</h3>

      <time class="convo-item__date" datetime="{format(parseISO(convo.lastMessage.sentAt), 'yyyy-MM-dd\'T\'HH:mm:ss')}">{intlRelativeTimeFormatState.format({ laterDate: parseISO(convo.lastMessage.sentAt) })}</time>
    </div>

    <p class="convo-item__text">{convo.lastMessage.text}</p>

    <button class="convo-item__button" onclick={handleOpen}></button>

    <Menu bind:isMenuOpen={isMenuOpen}>
      {#snippet content()}
            <ul class="timeline-menu-list" >
          <li class="timeline-menu-list__item only-pc">
            <button class="timeline-menu-list__button" onclick={() => addColumn(convo.id, convo.members.filter(member => member.did !== _agent.did())[0].displayName || convo.members.filter(member => member.did !== _agent.did())[0].handle, true)}>
              <PictureInPicture2 size="18" color="var(--text-color-1)"></PictureInPicture2>
              {$_('chat_menu_add_popup')}
            </button>
          </li>

          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button" onclick={() => addColumn(convo.id, convo.members.filter(member => member.did !== _agent.did())[0].displayName || convo.members.filter(member => member.did !== _agent.did())[0].handle, false)}>
              <ListPlus size="18" color="var(--text-color-1)"></ListPlus>
              {$_('chat_menu_add_column')}
            </button>
          </li>

          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button" onclick={leaveChat}>
              <LogOut size="18" color="var(--text-color-1)"></LogOut>
              {$_('chat_menu_leave')}
            </button>
          </li>

          {#if convo.muted}
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={unMuteChat}>
                <MessageCircleOff size="18" color="var(--text-color-1)"></MessageCircleOff>
                {$_('chat_menu_unmute')}
              </button>
            </li>
          {:else}
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={muteChat}>
                <MessageCircleOff size="18" color="var(--text-color-1)"></MessageCircleOff>
                {$_('chat_menu_mute')}
              </button>
            </li>
          {/if}
        </ul>
          {/snippet}
    </Menu>
  </div>
</article>

<style lang="postcss">
  .convo-item {
      position: relative;
      display: grid;
      grid-template-columns: 46px 1fr;
      gap: 12px;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color-2);
      padding: 12px 0;

      &__name {
          font-weight: bold;
          font-size: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
      }

      &__avatar {
          position: relative;
          z-index: 2;
      }

      &__button {
          position: absolute;
          left: 0;
          bottom: 0;
          top: 0;
          right: 0;
      }

      &__text {
          color: var(--text-color-3);
          font-size: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
      }

      &__date {
          color: var(--timeline-date-color);
          letter-spacing: .05em;
          position: relative;
          cursor: default;
          font-weight: normal;
          font-size: 14px;

          &::before {
              content: '・';
          }

          &:not(:last-child) {
              &::after {
                  content: '・';
              }
          }
      }

      &__heading {
          display: flex;
          flex-wrap: wrap;
          padding-right: 30px;
      }


      &__mute {
          margin-right: 4px;
      }
  }

  .convo-badge {
      position: absolute;
      right: -2px;
      bottom: -2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background-color: var(--danger-color);
      color: #fff;
      font-weight: bold;
      display: grid;
      place-content: center;
      font-size: 10px;
      font-family: var(--ui-font);
      pointer-events: none;
      cursor: default;
      z-index: 1;
  }
</style>