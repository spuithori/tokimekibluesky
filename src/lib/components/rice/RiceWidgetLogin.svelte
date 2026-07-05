<script lang="ts">
    import { _ } from 'svelte-i18n';
    import UserRound from '@lucide/svelte/icons/user-round';
</script>

<div class="rice-widget-login">
    <UserRound size={20} color="var(--text-color-3)" strokeWidth="var(--icon-stroke-width, 2px)"></UserRound>
    <p class="rice-widget-login__text">{$_('rice_widget_login_required')}</p>
</div>

<style>
    .rice-widget-login {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px 12px;
        color: var(--text-color-3);
        text-align: center;
    }

    .rice-widget-login__text {
        font-size: 13px;
    }
</style>
