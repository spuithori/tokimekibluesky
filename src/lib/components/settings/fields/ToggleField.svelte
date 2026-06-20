<script lang="ts">
    interface Props {
        value: boolean;
        id: string;
        disabled?: boolean;
        onchange?: (event: Event) => void;
    }

    let { value = $bindable(), id, disabled = false, onchange }: Props = $props();
</script>

<div class="input-toggle">
    <input
        class="input-toggle__input"
        type="checkbox"
        {id}
        {disabled}
        bind:checked={value}
        {onchange}
    /><label class="input-toggle__label" for={id}></label>
</div>
