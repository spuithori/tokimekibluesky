<script lang="ts">
  import {junkColumns} from "$lib/stores";

  $: if ($junkColumns.length > 20) {
      $junkColumns.shift();
  }
</script>