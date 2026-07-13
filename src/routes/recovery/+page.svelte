<script lang="ts">
  let message = $state('');
  let isBlocked = $state(false);
  let isWorking = $state(false);

  function deleteIdb(name: string): Promise<void> {
      return new Promise((resolve, reject) => {
          const req = indexedDB.deleteDatabase(name);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
          req.onblocked = () => {
              isBlocked = true;
          };
      });
  }

  async function deleteCachesAndSw() {
      try {
          if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(key => caches.delete(key)));
          }
      } catch (e) {
          console.error(e);
      }

      try {
          const registrations = await navigator.serviceWorker?.getRegistrations?.();
          if (registrations) {
              await Promise.all(registrations.map(registration => registration.unregister()));
          }
      } catch (e) {
          console.error(e);
      }
  }

  async function deleteAccounts() {
      isWorking = true;
      isBlocked = false;

      try {
          await Promise.all([
              deleteIdb('accountDatabase'),
              deleteIdb('tokimeki-oauth'),
          ]);
          localStorage.removeItem('columns');
          localStorage.removeItem('accounts');
          localStorage.removeItem('currentProfile');

          message = 'Accounts and Profiles Delete was successful.'
      } catch (e) {
          message = String(e);
          console.log(e);
      } finally {
          isWorking = false;
      }
  }

  async function deleteSettings() {
      localStorage.removeItem('settings');
      message = 'Settings Delete was successful.'
  }

  async function deleteAll() {
      isWorking = true;
      isBlocked = false;

      try {
          await Promise.all([
              deleteIdb('accountDatabase'),
              deleteIdb('tokimeki-oauth'),
              deleteIdb('bookmarkDatabase'),
              deleteIdb('themeDatabase'),
          ]);
          localStorage.clear();
          sessionStorage.clear();
          await deleteCachesAndSw();

          message = 'All Delete was successful.'
      } catch (e) {
          message = String(e);
          console.log(e);
      } finally {
          isWorking = false;
      }
  }
</script>

<div class="app recovery-page">
  <h1>This is TOKIMEKI recovery page</h1>
  <p>リカバリー用ページ / Recovery page</p>

  <p>
    <button class="button" onclick={deleteAccounts} disabled={isWorking}>Delete All Account and Profile</button>
    <button class="button" onclick={deleteSettings} disabled={isWorking}>Delete All Settings</button>
    <button class="button" onclick={deleteAll} disabled={isWorking}>Delete All</button>
  </p>

  {#if isBlocked}
    <p class="recovery-blocked">
      他のタブやウィンドウでTOKIMEKIが開かれているため削除を完了できません。このタブ以外をすべて閉じてから、もう一度お試しください。<br>
      Deletion is blocked because TOKIMEKI is open in another tab or window. Please close all other tabs and try again.
    </p>
  {/if}

  <p>{message}</p>

  {#if message}
    <p><a href="/">アプリに戻る / Back to the app</a></p>
  {/if}
</div>

<style lang="postcss">
  .recovery-page {
      padding: 20px;
  }

  .recovery-blocked {
      color: var(--danger-color, #d33);
      max-width: 640px;
  }
</style>
