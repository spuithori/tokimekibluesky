<script lang="ts">
    import {onMount} from 'svelte';
    import { _ } from 'svelte-i18n';
    import {getAccountIdByDidFromDb} from "$lib/util";
    import {accountsDb} from "$lib/db";
    import {List} from "lucide-svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import {watch} from "runed";
    import {getPostState} from "$lib/classes/postState.svelte";

    let { _agent, post, onclose } = $props();
    const postState = getPostState();
    let officialLists = $state([]);
    let _threadGate = $state(post.threadGate || 'everybody');
    let custom = $state([]);

    $effect(() => {
        post.threadGate = _threadGate;
    })

    $effect(() => {
        if (custom.length !== 0) {
            _threadGate = custom;
        }
    })

    if (Array.isArray(_threadGate)) {
        custom = _threadGate;
    }

    watch(() => post.postGate, () => {
        postState.postGate.current = post.postGate;
    });

    watch(() => post.threadGate, () => {
        postState.threadGate.current = post.threadGate;
    });

    async function updateLists() {
        const accountId = await getAccountIdByDidFromDb(_agent.did());
        const account = await accountsDb.accounts.get(accountId);
        officialLists = account?.lists;

        const res = await _agent.agent.api.app.bsky.graph.getLists({actor: _agent.did() as string, limit: 100, cursor: ''});
        officialLists = res.data.lists;

        await accountsDb.accounts.update(accountId, {
            lists: $state.snapshot(officialLists),
        });
    }

    function handleCustomChange() {
        if (custom.length === 0) {
            _threadGate = 'everybody';
        }
    }

    onMount(async () => {
        await updateLists();
    });
</script>

<Modal title={$_('thread_gate_modal_title')} size="small" {onclose}>
    <p class="modal-description">{$_('thread_gate_modal_description')}</p>

    <div class="settings-group">
        <div class="settings-group__content">
            <dl class="settings-group settings-group--column postgate-settings-group">
                <dt class="settings-group__name">
                    {$_('postgate_quote_permission')}
                </dt>

                <dd class="settings-group__content">
                    <div class="input-toggle">
                        <input class="input-toggle__input" type="checkbox" id="postgate" bind:checked={post.postGate}><label class="input-toggle__label" for="postgate"></label>
                    </div>
                </dd>
            </dl>

            <div class="big-radio-group big-radio-group--vertical">
                <div class="big-radio big-radio--slim big-radio--fullwidth">
                    <input type="radio" id="everybody" name="threadGate" bind:group={_threadGate} value={'everybody'} onclick={() => {custom = []}}>
                    <label for="everybody">
                                <span class="big-radio__ui">
                                    <span class="big-radio__check">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--check-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                    </span>
                                    <span class="big-radio__content">
                                        <span class="big-radio__title">{$_('thread_gate_everybody_title')}</span>
                                    </span>
                                </span>
                    </label>
                </div>

                <div class="big-radio big-radio--slim big-radio--fullwidth">
                    <input type="radio" id="nobody" name="threadGate" bind:group={_threadGate} value={'nobody'} onclick={() => {custom = []; _threadGate = 'nobody'}}>
                    <label for="nobody">
                                <span class="big-radio__ui">
                                    <span class="big-radio__check">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--check-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                    </span>
                                    <span class="big-radio__content">
                                         <span class="big-radio__title">{$_('thread_gate_nobody_title')}</span>
                                    </span>
                                </span>
                    </label>
                </div>
            </div>

            <section class="thread-gate-custom">
                <h4 class="thread-gate-custom-title">{$_('thread_gate_custom_title')}</h4>
                <p class="modal-description">{$_('thread_gate_custom_description')}</p>

                <div class="thread-gate-custom-list">
                    <div class="checkbox checkbox--padding checkbox--fullwidth">
                        <input type="checkbox" class="checkbox__input" bind:group={custom} value={'mention'} onchange={handleCustomChange} id="mention">
                        <label class="checkbox__label" for="mention">
                            <span class="checkbox__ui"></span>
                            <span class="checkbox__text">{$_('thread_gate_mention_title')}</span>
                        </label>
                    </div>

                    <div class="checkbox checkbox--padding checkbox--fullwidth">
                        <input type="checkbox" class="checkbox__input" bind:group={custom} value={'following'} onchange={handleCustomChange} id="following">
                        <label class="checkbox__label" for="following">
                            <span class="checkbox__ui"></span>
                            <span class="checkbox__text">{$_('thread_gate_following_title')}</span>
                        </label>
                    </div>

                    {#if officialLists.length}
                        {#each officialLists as list}
                            <div class="checkbox checkbox--padding checkbox--fullwidth">
                                <input type="checkbox" class="checkbox__input" bind:group={custom} value={list.uri} onchange={handleCustomChange} id={list.uri}>
                                <label class="checkbox__label" for={list.uri}>
                                    <span class="checkbox__ui"></span>
                                    <span class="checkbox__text"><List color="var(--text-color-3)" size="18"></List>{list.name}</span>
                                </label>
                            </div>
                        {/each}
                    {/if}
                </div>
            </section>
        </div>
    </div>
</Modal>

<style lang="postcss">
    .thread-gate-custom {
        margin-top: 8px;
        background-color: var(--bg-color-3);
        padding: 16px 12px;
    }

    .thread-gate-custom-title {
        color: var(--text-color-1);
        font-size: 14px;
    }

    .thread-gate-custom-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;

        @media (max-width: 767px) {
            grid-template-columns: 1fr;
        }
    }

    .postgate-settings-group {
        margin-bottom: 24px;
        padding: 12px;
        border: 2px solid var(--primary-color);
        border-radius: var(--border-radius-3);

        .settings-group__name {
            font-weight: bold;
        }
    }
</style>