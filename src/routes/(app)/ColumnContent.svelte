<script lang="ts">
    import type { Component } from "svelte";
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import ThreadTimeline from "./ThreadTimeline.svelte";
    import ChatTimeline from "./ChatTimeline.svelte";
    import ChatListTimeline from "./ChatListTimeline.svelte";
    import ListTimeline from "./ListTimeline.svelte";
    import BookmarkTimeline from "./BookmarkTimeline.svelte";
    import MochottTimeline from "./MochottTimeline.svelte";
    import Timeline from "./Timeline.svelte";
    import PublishColumn from "./PublishColumn.svelte";
    import SettingsColumn from "./SettingsColumn.svelte";
    import ModuleColumnPlaceholder from "./ModuleColumnPlaceholder.svelte";
    import ModuleColumnError from "./ModuleColumnError.svelte";
    import ColumnAgentMissing from "$lib/components/column/ColumnAgentMissing.svelte";
    import { getScopedColumnState } from "$lib/classes/columnState.svelte";
    import { capabilityOf } from "$lib/columnKinds";
    import { getColumnKind } from "$lib/columnKindRegistry.svelte";
    import { riceState } from "$lib/rice/riceState.svelte";

    interface Props {
        index: number;
        _agent: any;
        unique?: symbol;
        isSplit?: boolean;
        isTopScrolling?: boolean;
        onrefresh?: (event?: any) => void;
    }

    let {
        index,
        _agent,
        unique,
        isSplit = false,
        isTopScrolling = false,
        onrefresh,
    }: Props = $props();

    const builtinComponents: Record<string, Component<any>> = {
        notification: NotificationTimeline,
        thread: ThreadTimeline,
        chat: ChatTimeline,
        chatList: ChatListTimeline,
        list: ListTimeline,
        bookmark: BookmarkTimeline,
        mochottTimeline: MochottTimeline,
        networkFeed: MochottTimeline,
        publish: PublishColumn,
        settings: SettingsColumn,
    };

    const columnState = getScopedColumnState();
    const column = $derived(columnState.getColumn(index));
    const type = $derived(column?.algorithm?.type);
    const capability = $derived(capabilityOf(type));
    const isModuleKind = $derived(type?.startsWith('module:') || type?.startsWith('plugin:'));
    const moduleKind = $derived(isModuleKind ? getColumnKind(type) : undefined);
    const pluginId = $derived(type?.startsWith('plugin:') ? type.split(':')[1] : undefined);
    const pluginOptions = $derived(pluginId !== undefined ? riceState.pluginConfig(pluginId)?.options ?? {} : undefined);
    const ContentComponent = $derived(type !== undefined ? builtinComponents[type] : undefined);

    let reloadKey = $state(0);

    function reloadModule() {
        reloadKey++;
    }
</script>

{#if isModuleKind}
    {#if moduleKind?.loader}
        {#if capability.hasAgent && !_agent}
            <ColumnAgentMissing {column}></ColumnAgentMissing>
        {:else}
            {#key reloadKey}
                {#await moduleKind.loader() then loaded}
                    {@const ModuleComponent = loaded.default}
                    <svelte:boundary>
                        <ModuleComponent {index} {unique} {isSplit} {onrefresh} {column} options={pluginOptions} _agent={capability.hasAgent ? _agent : undefined}></ModuleComponent>

                        {#snippet failed(error, reset)}
                            <ModuleColumnError {index} {error} {reset} {pluginId}></ModuleColumnError>
                        {/snippet}
                    </svelte:boundary>
                {:catch error}
                    <ModuleColumnError {index} {error} {pluginId} reset={reloadModule}></ModuleColumnError>
                {/await}
            {/key}
        {/if}
    {:else}
        <ModuleColumnPlaceholder {index}></ModuleColumnPlaceholder>
    {/if}
{:else if !capability.hasAgent}
    {#if ContentComponent}
        <ContentComponent {index}></ContentComponent>
    {/if}
{:else if _agent}
    {#if capability.remountOnUnique}
        {#key unique}
            {#if ContentComponent}
                <ContentComponent {index} {_agent} {unique} {isSplit}></ContentComponent>
            {:else}
                <Timeline {index} {_agent} {unique} {isSplit} {isTopScrolling}></Timeline>
            {/if}
        {/key}
    {:else if ContentComponent}
        <ContentComponent {index} {_agent} {unique} {onrefresh} {isSplit}></ContentComponent>
    {:else}
        <Timeline {index} {_agent} {unique} {isSplit} {isTopScrolling}></Timeline>
    {/if}
{:else}
    <ColumnAgentMissing {column}></ColumnAgentMissing>
{/if}
