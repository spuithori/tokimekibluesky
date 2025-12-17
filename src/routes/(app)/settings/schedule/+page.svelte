<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { onMount } from 'svelte';
    import { agents } from '$lib/stores';
    import { toast } from 'svelte-sonner';
    import { page } from '$app/stores';
    import { accountsDb } from '$lib/db';
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import {
        checkScheduleAuth,
        startScheduleAuth,
        revokeScheduleAuth,
        getScheduledPosts,
        deleteScheduledPost,
        type ScheduledPost
    } from '$lib/scheduleApi';
    import type { Agent } from '$lib/agent';
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import { Trash } from 'lucide-svelte';

    interface AccountAuthState {
        key: number;
        agent: Agent;
        avatar?: string;
        displayName?: string;
        isAuthenticated: boolean;
        isChecking: boolean;
        isConnecting: boolean;
        scheduledPosts: ScheduledPost[];
    }

    let accountStates = $state<AccountAuthState[]>([]);
    let isInitialLoading = $state(true);
    let selectedAccountDid = $state<string | null>(null);

    async function loadAccountInfo(key: number, agent: Agent): Promise<{ avatar?: string; displayName?: string }> {
        try {
            const account = await accountsDb.accounts.get(key);
            return {
                avatar: account?.avatar,
                displayName: account?.name,
            };
        } catch {
            return {};
        }
    }

    async function checkAuthForAccount(state: AccountAuthState) {
        state.isChecking = true;
        try {
            state.isAuthenticated = await checkScheduleAuth(state.agent.agent);
            if (state.isAuthenticated) {
                state.scheduledPosts = await getScheduledPosts(state.agent.agent);
            }
        } catch {
            state.isAuthenticated = false;
        }
        state.isChecking = false;
    }

    async function initializeAccounts() {
        isInitialLoading = true;
        const states: AccountAuthState[] = [];

        for (const [key, agent] of $agents) {
            const info = await loadAccountInfo(key, agent);
            const state: AccountAuthState = {
                key,
                agent,
                avatar: info.avatar,
                displayName: info.displayName,
                isAuthenticated: false,
                isChecking: true,
                isConnecting: false,
                scheduledPosts: [],
            };
            states.push(state);
        }

        accountStates = states;
        isInitialLoading = false;

        await Promise.all(accountStates.map(state => checkAuthForAccount(state)));

        if (accountStates.length > 0 && !selectedAccountDid) {
            selectedAccountDid = accountStates[0].agent.did();
        }
    }

    async function connect(state: AccountAuthState) {
        state.isConnecting = true;
        const handle = state.agent.handle();
        if (!handle) {
            toast.error($_('schedule_settings_no_handle'));
            state.isConnecting = false;
            return;
        }
        const url = await startScheduleAuth(handle);
        if (url) {
            window.location.href = url;
        } else {
            toast.error($_('schedule_settings_auth_start_error'));
            state.isConnecting = false;
        }
    }

    async function disconnect(state: AccountAuthState) {
        const success = await revokeScheduleAuth(state.agent.agent);
        if (success) {
            state.isAuthenticated = false;
            state.scheduledPosts = [];
            toast.success($_('schedule_settings_disconnect_success'));
        } else {
            toast.error($_('schedule_settings_disconnect_error'));
        }
    }

    async function handleDeletePost(state: AccountAuthState, id: string) {
        if (!confirm($_('schedule_settings_delete_confirm'))) return;

        const success = await deleteScheduledPost(state.agent.agent, id);
        if (success) {
            state.scheduledPosts = state.scheduledPosts.filter(p => p.id !== id);
            toast.success($_('schedule_settings_delete_success'));
        } else {
            toast.error($_('schedule_settings_delete_error'));
        }
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleString();
    }

    function getStatusLabel(status: ScheduledPost['status']): string {
        switch (status) {
            case 'pending': return $_('schedule_settings_status_pending');
            case 'processing': return $_('schedule_settings_status_processing');
            case 'completed': return $_('schedule_settings_status_completed');
            case 'failed': return $_('schedule_settings_status_failed');
            default: return status;
        }
    }

    function getSelectedAccountState(): AccountAuthState | undefined {
        return accountStates.find(s => s.agent.did() === selectedAccountDid);
    }

    onMount(async () => {
        const authResult = $page.url.searchParams.get('auth');
        if (authResult === 'success') {
            toast.success($_('schedule_settings_connect_success'));
            window.history.replaceState({}, '', '/settings/schedule');
        } else if (authResult === 'error') {
            const message = $page.url.searchParams.get('message') || $_('schedule_settings_connect_error');
            toast.error(message);
            window.history.replaceState({}, '', '/settings/schedule');
        }

        await initializeAccounts();
    });

    let selectedState = $derived(getSelectedAccountState());
</script>

<svelte:head>
    <title>{$_('schedule_settings_title')} - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>
        {$_('schedule_settings_title')}
    </SettingsHeader>

    <div class="settings-wrap">
        {#if isInitialLoading}
            <div class="schedule-loading">
                {$_('loading')}...
            </div>
        {:else}
            <div class="schedule-notice">
                <h3>{$_('schedule_settings_about_title')}</h3>
                <p>{$_('schedule_settings_about_description')}</p>
                <p>{$_('schedule_settings_about_auth')}</p>
                <p>{$_('schedule_settings_about_note')}</p>
            </div>

            <div class="schedule-accounts-section">
                <h3>{$_('schedule_settings_connection_status')}</h3>
                <ul class="schedule-accounts-list">
                    {#each accountStates as state (state.key)}
                        <li class="schedule-account-item" class:schedule-account-item--selected={state.agent.did() === selectedAccountDid}>
                            <button class="schedule-account-select" onclick={() => { selectedAccountDid = state.agent.did(); }}>
                                <div class="schedule-account-avatar">
                                    {#if state.avatar}
                                        <img src={state.avatar} alt="">
                                    {/if}
                                </div>
                                <div class="schedule-account-info">
                                    <p class="schedule-account-name">{state.displayName || ''}</p>
                                    <p class="schedule-account-handle">@{state.agent.handle()}</p>
                                </div>
                            </button>
                            <div class="schedule-account-status">
                                {#if state.isChecking}
                                    <span class="schedule-status schedule-status--checking">
                                        <LoadingSpinner padding={0} size="20"></LoadingSpinner>
                                    </span>
                                {:else if state.isAuthenticated}
                                    <span class="schedule-status schedule-status--connected">{$_('schedule_settings_connected')}</span>
                                    <button class="button button--sm button--border button--danger" onclick={() => disconnect(state)}>{$_('schedule_settings_disconnect')}</button>
                                {:else}
                                    <span class="schedule-status schedule-status--disconnected">{$_('schedule_settings_not_connected')}</span>
                                    <button class="button button--sm button--primary" onclick={() => connect(state)} disabled={state.isConnecting}>
                                        {state.isConnecting ? $_('schedule_settings_connecting') : $_('schedule_settings_connect')}
                                    </button>
                                {/if}
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>

            {#if selectedState && selectedState.isAuthenticated}
                <div class="schedule-posts-section">
                    <h3>{$_('schedule_settings_posts_title')} - @{selectedState.agent.handle()} ({selectedState.scheduledPosts.length})</h3>

                    {#if selectedState.scheduledPosts.length === 0}
                        <p class="schedule-empty">{$_('schedule_settings_no_posts')}</p>
                    {:else}
                        <ul class="schedule-posts-list">
                            {#each selectedState.scheduledPosts as post}
                                <li class="schedule-post-item">
                                    <div class="schedule-post-content">
                                        <p class="schedule-post-text">{post.post_data.text}</p>
                                        <div class="schedule-post-meta">
                                            <span class="schedule-post-time">
                                                {$_('schedule_settings_scheduled_at')}: {formatDate(post.scheduled_at)}
                                            </span>
                                            <span class="schedule-post-status schedule-post-status--{post.status}">
                                                {getStatusLabel(post.status)}
                                            </span>
                                        </div>
                                        {#if post.error_message}
                                            <p class="schedule-post-error">{post.error_message}</p>
                                        {/if}
                                    </div>
                                    {#if post.status === 'pending'}
                                        <button
                                            class="schedule-post-delete"
                                            onclick={() => handleDeletePost(selectedState, post.id)}
                                            aria-label={$_('delete_post')}
                                        >
                                            <Trash color="var(--danger-color)" size="20"></Trash>
                                        </button>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {:else if selectedState && !selectedState.isChecking && !selectedState.isAuthenticated}
                <div class="schedule-posts-section">
                    <p class="schedule-empty">{$_('schedule_auth_required')}</p>
                </div>
            {/if}
        {/if}
    </div>
</div>

<style lang="postcss">
    .schedule-loading {
        padding: 20px;
        text-align: center;
        color: var(--text-color-3);
    }

    .schedule-notice {
        border: 1px solid var(--border-color-1);
        padding: 15px;
        margin: 15px 0;
        border-radius: 8px;

        h3 {
            margin: 0 0 10px;
            font-size: 16px;
        }

        p {
            margin: 5px 0;
            font-size: 14px;
            color: var(--text-color-2);
        }
    }

    .schedule-accounts-section {
        margin: 20px 0;

        h3 {
            margin: 0 0 15px;
            font-size: 16px;
        }
    }

    .schedule-accounts-list {
        list-style: none;
        padding: 0;
        margin: 0;
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        overflow: hidden;
    }

    .schedule-account-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        gap: 12px;
        border-bottom: 1px solid var(--border-color-1);

        &:last-child {
            border-bottom: none;
        }

        &--selected {
            background-color: var(--bg-color-2);
        }
    }

    .schedule-account-select {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: left;
    }

    .schedule-account-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        background-color: var(--primary-color);
        flex-shrink: 0;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .schedule-account-info {
        min-width: 0;
    }

    .schedule-account-name {
        font-weight: bold;
        font-size: 14px;
        color: var(--text-color-1);
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .schedule-account-handle {
        font-size: 12px;
        color: var(--text-color-3);
        margin: 2px 0 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .schedule-account-status {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
    }

    .schedule-status {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        background-color: var(--bg-color-3);

        &--connected {
            color: var(--success-color);
        }

        &--disconnected {
            color: var(--text-color-3);
        }

        &--checking {
            color: var(--text-color-3);
        }
    }

    .schedule-posts-section {
        margin-top: 30px;

        h3 {
            margin: 0 0 15px;
            font-size: 16px;
        }
    }

    .schedule-empty {
        color: var(--text-color-3);
        text-align: center;
        padding: 20px;
    }

    .schedule-posts-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .schedule-post-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 15px;
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        margin-bottom: 10px;
    }

    .schedule-post-content {
        flex: 1;
        min-width: 0;
    }

    .schedule-post-text {
        margin: 0 0 10px;
        white-space: pre-wrap;
        word-break: break-word;
    }

    .schedule-post-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        font-size: 13px;
    }

    .schedule-post-time {
        color: var(--text-color-3);
    }

    .schedule-post-status {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        background-color: var(--bg-color-3);

        &--pending {
            color: var(--primary-color);
        }

        &--processing {
            color: var(--warning-color);
        }

        &--completed {
            color: var(--success-color);
        }

        &--failed {
            color: var(--danger-color);
        }
    }

    .schedule-post-error {
        margin: 10px 0 0;
        color: var(--danger-color);
        font-size: 13px;
    }

    .schedule-post-delete {
        padding: 8px;
        background: none;
        border: none;
        color: var(--text-color-3);
        cursor: pointer;
        border-radius: 4px;

        &:hover {
            background-color: var(--bg-color-3);
        }
    }
</style>
