<script lang="ts">
    import { agent, supabase, supabaseSession } from '$lib/stores';
    import {createEventDispatcher} from 'svelte';
    import toast from 'svelte-french-toast';
    import { _ } from 'svelte-i18n';
    const dispatch = createEventDispatcher();

    export let bookmark;

    let name = bookmark?.name || '';
    let text = bookmark?.text || '';

    async function save () {
        const { error } = await $supabase
            .from('bookmarks')
            .upsert({
                id: bookmark?.id || undefined,
                name: name,
                text: text,
                owner: $agent.did(),
                created_at: Date.now(),
                user_id: $supabaseSession.user.id
            })
            .single();

        if (error) {
            toast.error('Error: ' + error.message);
            throw new Error(error.message);
        }

        toast.success($_('bookmark_save_success'));
        dispatch('close', {
            clear: false,
        });
    }

    async function remove () {
        if (bookmark?.id) {
            const { error } = await $supabase
                .from('bookmarks')
                .delete()
                .eq('id', bookmark.id)

            if (error) {
                toast.error('Error: ' + error.message);
                throw new Error(error.message);
            }

            toast.success($_('bookmark_delete_success'));
            dispatch('close', {
                clear: true,
            });
        } else {
            dispatch('close', {
                clear: true,
            });
        }
    }
</script>

<div class="bookmark-modal">
  <div class="bookmark-modal-contents">
    <h2 class="bookmark-modal-title">{$_('bookmark_add_management')}</h2>

    <dl class="bookmark-modal-group">
      <dt class="bookmark-modal-group__name">
        <label for="bookmarkName">{$_('bookmark_name')}</label>
      </dt>

      <dd class="bookmark-modal-group__content">
        <div class="bookmark-modal-name">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
          </svg>

          <input id="bookmarkName" type="text" class="bookmark-modal-name__input" bind:value={name}>
        </div>
      </dd>
    </dl>

    <dl class="bookmark-modal-group">
      <dt class="bookmark-modal-group__name">
        <label for="bookmarkDescription">{$_('bookmark_description')}</label>
      </dt>

      <dd class="bookmark-modal-group__content">
        <div class="bookmark-modal-name">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
          </svg>

          <input id="bookmarkDescription" type="text" class="bookmark-modal-name__input" bind:value={text}>
        </div>
      </dd>
    </dl>

    <div class="bookmark-modal-close">
      <button class="button button--sm" on:click={save}>{$_('save_button')}</button>
      <button class="button button--sm button--border button--danger" on:click={remove}>{$_('remove')}</button>
    </div>
  </div>
</div>

<style lang="postcss">
    .bookmark-modal {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        background-color: rgba(0, 0, 0, .5);
        overflow: auto;
        padding: 50px 0;

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .bookmark-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .bookmark-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 26px;
    }

    .bookmark-modal-group {
        @media (max-width: 767px) {
            margin-bottom: 20px;
        }

        &__name {
            font-size: 14px;
            margin-bottom: 6px;
        }

        &__content {

        }

        &--name {
            margin-bottom: 30px;

            @media (max-width: 767px) {
                margin-bottom: 20px;
            }
        }

        &__input {
            border: 1px solid var(--border-color-1);
            border-radius: 4px;
            height: 40px;
            padding: 0 10px;
            width: 100%;
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
        }
    }

    .bookmark-modal-name {
        position: relative;
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        height: 40px;
        padding: 0 10px;
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
        overflow: hidden;

        &__input {
            color: var(--text-color-1);
        }

        &:focus-within {
            border-color: var(--text-color-1);
        }

        svg {
            flex-shrink: 0;
        }
    }

    .bookmark-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }
</style>