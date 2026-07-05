<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import type { SettingOption, RadioAppearance } from '$lib/settings/schema.types';

    interface Props {
        value: string | number | boolean;
        options?: readonly SettingOption[];
        name: string;
        appearance?: RadioAppearance;
    }

    let { value = $bindable(), options = [], name, appearance = 'boxed' }: Props = $props();
</script>

<div class="radio-group">
    {#each options as option (String(option.value))}
        {@const optionId = `${name}_${option.value}`}
        <div class="radio" class:radio--boxed={appearance === 'boxed'}>
            <input type="radio" id={optionId} {name} value={option.value} bind:group={value} />
            <label for={optionId}>
                <span class="radio__ui"></span>
                {#if option.icon}
                    {@const Icon = option.icon}
                    <Icon size="20" />
                {/if}
                {option.literalLabel ? option.label : $_(option.label)}
            </label>
        </div>
    {/each}
</div>
