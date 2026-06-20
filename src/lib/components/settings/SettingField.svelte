<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { SettingItem, SettingsContext } from '$lib/settings/schema.types';
    import type { SettingsAccessor } from '$lib/settings/accessor';
    import { customFields } from '$lib/settings/customRegistry';
    import ToggleField from './fields/ToggleField.svelte';
    import SelectField from './fields/SelectField.svelte';
    import RadioField from './fields/RadioField.svelte';
    import RangeField from './fields/RangeField.svelte';

    interface Props {
        item: SettingItem;
        acc: SettingsAccessor;
        ctx: SettingsContext;
    }

    let { item, acc, ctx }: Props = $props();

    // Accessor reads/writes are untyped at the leaf; the dispatcher bridges the
    // generic value to each field's concrete value type.
    const get = () => acc.get(item.key) as any;
    const set = (value: any) => acc.set(item.key, value);
    const disabled = $derived(item.disabled?.(ctx) ?? false);

    // The <dl> anchor uses item.key (search-jump target). Inner inputs need a
    // DISTINCT id so the <label for>/<datalist list> association doesn't resolve
    // to the <dl> (the first element matching item.key, which isn't labelable).
    const fieldId = $derived(`field-${item.key}`);
</script>

<dl
    class="settings-group"
    class:only-mobile={item.platform === 'mobile'}
    class:only-pc={item.platform === 'pc'}
    id={item.key}
>
    <dt class="settings-group__name">
        {item.literalLabel ? item.label : $_(item.label)}{#if item.isNew}<span class="new-label">NEW</span>{/if}
    </dt>

    <dd class="settings-group__content">
        {#if item.type === 'toggle'}
            <ToggleField id={fieldId} {disabled} bind:value={get, set} />
        {:else if item.type === 'select'}
            <SelectField id={fieldId} options={item.options} optionsSource={item.optionsSource} fullwidth={item.fullwidth} bind:value={get, set} />
        {:else if item.type === 'radio'}
            <RadioField name={fieldId} options={item.options} appearance={item.appearance} bind:value={get, set} />
        {:else if item.type === 'range'}
            <RangeField id={fieldId} min={item.min} max={item.max} step={item.step} bind:value={get, set} />
        {:else if item.type === 'custom' && item.custom}
            {#await customFields[item.custom]() then module}
                {@const Custom = module.default}
                <Custom />
            {/await}
        {/if}

        {#if item.description}
            <p class="settings-group__description">{$_(item.description)}</p>
        {/if}
    </dd>
</dl>
