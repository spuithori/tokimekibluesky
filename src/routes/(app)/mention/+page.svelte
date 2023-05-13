<script>
import {_} from 'svelte-i18n';
import { fly } from 'svelte/transition';

</script>

<div class="timeline">
  <h1 class="page-nav-title" in:fly={{ x: 10, duration: 100, delay: 100 }}>{$_('mentions')}</h1>

  <p>工事中<br>Under construction</p>
</div>