<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { languageMap } from '$lib/langs/languageMap';
    import type { SettingOption } from '$lib/settings/schema.types';

    interface Props {
        value: string | number | boolean;
        options?: readonly SettingOption[];
        optionsSource?: 'languages' | 'userLanguages' | 'datetimeFormats';
        fullwidth?: boolean;
        id?: string;
    }

    let { value = $bindable(), options = [], optionsSource, fullwidth = false, id }: Props = $props();

    const resolvedOptions = $derived.by<readonly SettingOption[]>(() => {
        if (optionsSource === 'userLanguages') {
            return Array.from(languageMap as Iterable<[string, { name: string }]>).map(
                ([code, lang]) => ({ value: code, label: lang.name }),
            );
        }
        return options;
    });
</script>

<div class="select" class:select--fullwidth={fullwidth}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select__icon lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

    <select class="select__input" {id} bind:value>
        {#each resolvedOptions as option (String(option.value))}
            <option value={option.value}>
                {option.literalLabel ? option.label : $_(option.label)}
            </option>
        {/each}
    </select>
</div>
