<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { toast } from 'svelte-sonner';
    import type { PollUrlInfo } from './embedUtil';
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

    const POLL_API_BASE = 'https://poll.tokimeki.tech';

    interface Props {
        pollInfo: PollUrlInfo;
        _agent: any;
    }

    let { pollInfo, _agent }: Props = $props();

    const minHeight = $derived(
        pollInfo.options
            ? pollInfo.options * 52 + 71
            : undefined
    );

    interface OptionResult {
        index: number;
        text: string;
        count: number;
    }

    interface PollData {
        poll: {
            uri: string;
            cid: string;
            author: { handle: string; displayName?: string; avatar?: string };
            options: string[];
            createdAt: string;
            endsAt: string;
        };
        options: OptionResult[];
        totalVotes: number;
        isEnded: boolean;
        myVote?: number;
        myVoteUri?: string;
    }

    let pollData = $state<PollData | null>(null);
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    let selectedOption = $state<number | null>(null);
    let isSubmitting = $state(false);

    const isAuthor = $derived(_agent?.did?.() === pollInfo.did);
    const hasVoted = $derived(pollData?.myVote !== undefined);
    const showResults = $derived(hasVoted || pollData?.isEnded || isAuthor);
    const canVote = $derived(!hasVoted && !pollData?.isEnded);

    fetchPoll();

    async function fetchPoll() {
        try {
            isLoading = true;
            error = null;

            const viewerDid = _agent?.did?.() || '';
            const viewerParam = viewerDid ? `&viewer=${encodeURIComponent(viewerDid)}` : '';
            const res = await fetch(`${POLL_API_BASE}/xrpc/tech.tokimeki.poll.getPoll?uri=${encodeURIComponent(pollInfo.uri)}${viewerParam}`);

            if (!res.ok) {
                throw new Error('Failed to fetch poll');
            }

            pollData = await res.json();

            if (pollData?.myVote !== undefined) {
                selectedOption = pollData.myVote;
            }
        } catch (e: any) {
            error = e.message || 'Failed to load poll';
            console.error('Poll fetch error:', e);
        } finally {
            isLoading = false;
        }
    }

    function getPercentage(count: number): number {
        if (!pollData || pollData.totalVotes === 0) return 0;
        return Math.round((count / pollData.totalVotes) * 100);
    }

    function formatTimeRemaining(endsAt: string): string {
        const endDate = new Date(endsAt);
        const now = new Date();

        if (endDate <= now) {
            return $_('poll_ended');
        }

        const diffMs = endDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        const locale = $settings?.general?.userLanguage || 'en';
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' });

        if (diffDays > 0) {
            return rtf.format(diffDays, 'day');
        } else if (diffHours > 0) {
            return rtf.format(diffHours, 'hour');
        } else {
            return rtf.format(Math.max(1, diffMinutes), 'minute');
        }
    }

    async function submitVote() {
        if (selectedOption === null || isSubmitting || !pollData || pollData.myVote !== undefined || pollData.isEnded) {
            return;
        }

        isSubmitting = true;
        const votedOption = selectedOption;

        pollData = {
            ...pollData,
            myVote: votedOption,
            myVoteUri: 'pending',
            totalVotes: pollData.totalVotes + 1,
            options: pollData.options.map((opt, idx) =>
                idx === votedOption ? { ...opt, count: opt.count + 1 } : opt
            )
        };

        try {
            const record = {
                $type: 'tech.tokimeki.poll.vote',
                poll: {
                    uri: pollData.poll.uri,
                    cid: pollData.poll.cid
                },
                optionIndex: votedOption,
                createdAt: new Date().toISOString()
            };

            const result = await _agent.agent.api.com.atproto.repo.createRecord({
                repo: _agent.did(),
                collection: 'tech.tokimeki.poll.vote',
                record: record
            });

            pollData = {
                ...pollData,
                myVoteUri: result.data.uri
            };

            toast.success($_('poll_vote_success'));
        } catch (e: any) {
            console.error('Vote error:', e);
            toast.error($_('poll_vote_error'));
            await fetchPoll();
        } finally {
            isSubmitting = false;
        }
    }

    async function deleteVote() {
        if (!pollData?.myVoteUri || pollData.myVoteUri === 'pending' || isSubmitting) return;

        isSubmitting = true;
        const previousVote = pollData.myVote;
        const previousVoteUri = pollData.myVoteUri;

        pollData = {
            ...pollData,
            myVote: undefined,
            myVoteUri: undefined,
            totalVotes: Math.max(0, pollData.totalVotes - 1),
            options: pollData.options.map((opt, idx) =>
                idx === previousVote ? { ...opt, count: Math.max(0, opt.count - 1) } : opt
            )
        };
        selectedOption = null;

        try {
            const rkey = previousVoteUri.split('/').pop();

            await _agent.agent.api.com.atproto.repo.deleteRecord({
                repo: _agent.did(),
                collection: 'tech.tokimeki.poll.vote',
                rkey: rkey
            });

            toast.success($_('poll_vote_deleted'));
        } catch (e: any) {
            console.error('Delete vote error:', e);
            toast.error($_('poll_vote_delete_error'));
            await fetchPoll();
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="embed-poll" style:min-height={minHeight ? `${minHeight}px` : undefined}>
    {#if isLoading}
        <div class="poll-loading">
            <LoadingSpinner></LoadingSpinner>
        </div>
    {:else if error}
        <div class="poll-error">
            <p>{error}</p>
            <a href="https://poll.tokimeki.tech/p/{pollInfo.did}/{pollInfo.rkey}" target="_blank" rel="noopener">
                {$_('poll_open_in_browser')}
            </a>
        </div>
    {:else if pollData}
        <div class="poll-options">
            {#each pollData.options as option, index}
                {@const percentage = getPercentage(option.count)}
                {@const isSelected = selectedOption === index}
                {@const isMyVote = pollData.myVote === index}

                {#if showResults}
                    <button
                        type="button"
                        class="poll-option-result"
                        class:is-my-vote={isMyVote}
                        class:is-selected={isSelected && canVote}
                        class:is-clickable={canVote}
                        onclick={() => canVote && (selectedOption = index)}
                        disabled={!canVote || isSubmitting}
                    >
                        <div class="poll-option-bar" style="width: {percentage}%"></div>
                        <div class="poll-option-content">
                            <span class="poll-option-text">
                                {#if canVote}
                                    <span class="poll-radio" class:checked={isSelected}></span>
                                {/if}
                                {option.text}
                                {#if isMyVote}
                                    <span class="poll-my-vote-badge">{$_('poll_voted')}</span>
                                {/if}
                            </span>
                            <span class="poll-option-stats">
                                <span class="poll-option-percentage">{percentage}%</span>
                            </span>
                        </div>
                    </button>
                {:else}
                    <button
                        type="button"
                        class="poll-option-button"
                        class:selected={isSelected}
                        onclick={() => selectedOption = index}
                        disabled={isSubmitting}
                    >
                        <span class="poll-radio" class:checked={isSelected}></span>
                        <span class="poll-option-text">{option.text}</span>
                    </button>
                {/if}
            {/each}
        </div>

        <div class="poll-footer">
            <div class="poll-stats">
                <span class="poll-total-votes">{pollData.totalVotes} {$_('poll_votes')}</span>
                <span class="poll-separator">·</span>
                <span class="poll-time-remaining">{formatTimeRemaining(pollData.poll.endsAt)}</span>
            </div>

            <div class="poll-actions">
                {#if canVote}
                    <button
                        type="button"
                        class="poll-vote-button"
                        onclick={submitVote}
                        disabled={selectedOption === null || isSubmitting}
                    >
                        {isSubmitting ? $_('poll_submitting') : $_('poll_vote')}
                    </button>
                {:else if hasVoted && !pollData.isEnded}
                    <button
                        type="button"
                        class="poll-delete-button"
                        onclick={deleteVote}
                        disabled={isSubmitting}
                    >
                        {$_('poll_delete_vote')}
                    </button>
                {/if}
            </div>
        </div>
    {/if}
</div>

<style lang="postcss">
    .embed-poll {
        background-color: var(--bg-color-2);
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        padding: 12px 12px 10px;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        justify-content: center;

        @container timeline-item (max-width: 345px) {
            margin-left: calc((var(--avatar-size) + var(--avatar-gap)) * -1);
        }
    }

    .poll-loading {
        display: flex;
        justify-content: center;
        padding: 20px;
    }

    .poll-error {
        text-align: center;
        padding: 16px;
        color: var(--text-color-3);

        a {
            color: var(--primary-color);
            margin-top: 8px;
            display: inline-block;
        }
    }

    .poll-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .poll-option-button {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 12px;
        background-color: var(--bg-color-3);
        border: 2px solid var(--border-color-1);
        border-radius: 6px;
        color: var(--text-color-1);
        font-size: 14px;
        text-align: left;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover:not(:disabled) {
            border-color: var(--primary-color);
        }

        &.selected {
            border-color: var(--primary-color);
            background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
        }

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    }

    .poll-radio {
        width: 16px;
        height: 16px;
        border: 2px solid var(--border-color-1);
        border-radius: 50%;
        flex-shrink: 0;
        transition: all 0.15s ease;

        &.checked {
            border-color: var(--primary-color);
            background-color: var(--primary-color);
            box-shadow: inset 0 0 0 3px var(--bg-color-3);
        }
    }

    .poll-option-result {
        position: relative;
        padding: 10px 12px;
        background-color: var(--bg-color-3);
        border: 2px solid var(--border-color-1);
        border-radius: 6px;
        width: 100%;
        text-align: left;
        overflow: hidden;

        &.is-clickable {
            cursor: pointer;

            &:hover:not(:disabled) {
                border-color: var(--primary-color);
            }
        }

        &:not(.is-clickable) {
            cursor: default;
        }

        &:disabled {
            opacity: 1;
        }

        &.is-selected {
            border-color: var(--primary-color);
        }

        &.is-my-vote {
            border-color: var(--primary-color);
        }
    }

    .poll-option-bar {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        background-color: color-mix(in srgb, var(--primary-color) 20%, transparent);
        transition: width 0.3s ease-out;
    }

    .poll-option-content {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
    }

    .poll-option-text {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 3px 6px;
        font-size: 14px;
    }

    .poll-my-vote-badge {
        font-size: 11px;
        padding: 2px 6px;
        background-color: var(--primary-color);
        color: #fff;
        white-space: nowrap;
        border-radius: 10px;
    }

    .poll-option-stats {
        font-size: 13px;
        color: var(--text-color-3);
    }

    .poll-option-percentage {
        font-weight: 600;
        color: var(--text-color-1);
        white-space: nowrap;
    }

    .poll-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--border-color-1);
    }

    .poll-stats {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0 6px;
        color: var(--text-color-3);
        font-size: 13px;
    }

    .poll-actions {
        display: flex;
        gap: 8px;
    }

    .poll-vote-button {
        padding: 6px 16px;
        background-color: var(--primary-color);
        border: none;
        border-radius: 9999px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.15s ease;

        &:hover:not(:disabled) {
            filter: brightness(1.1);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .poll-delete-button {
        padding: 6px 12px;
        background-color: transparent;
        border: 1px solid var(--border-color-1);
        border-radius: 9999px;
        color: var(--text-color-3);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover:not(:disabled) {
            border-color: var(--danger-color);
            color: var(--danger-color);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }
</style>
