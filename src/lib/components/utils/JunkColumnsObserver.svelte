<script lang="ts">
  /* import { run } from 'svelte/legacy';

  import {junkColumns} from "$lib/stores";
  import {onNavigate} from "$app/navigation";

  run(() => {
    if ($junkColumns.length > 20) {
        $junkColumns.shift();
    }
  });

  onNavigate(async (navigation) => {
      return new Promise((resolve) => {
          const handle = navigation.to?.params?.handle;
          const profileId = handle ? 'profile_' + handle : undefined;

          if (navigation.type !== 'popstate' && navigation.from?.params?.handle !== handle) {
              if (profileId) {
                  $junkColumns = $junkColumns.filter(column => column.id !== profileId);
              }
          }

          resolve();
      });
  }) */
</script>