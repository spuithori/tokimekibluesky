<script lang="ts">
    import { _, locale, getLocale } from 'tokimeki-i18n';

    (window as { __i18nTest?: unknown }).__i18nTest = {
        ready: true,
        getLocale: () => getLocale(),
    };
</script>

<h1 data-testid="settings">{$_('settings')}</h1>
<p data-testid="locale">{$locale}</p>
<p data-testid="interpolated">{$_('reposted_by', { name: 'Alice' })}</p>
<p data-testid="missing">{$_('__nonexistent_test_key__')}</p>
