<script lang="ts">
  let log: string[] = $state([]);
  let loaded: Record<string, boolean> = $state({});

  function addLog(msg: string) {
    log = [...log, `[${new Date().toISOString().slice(11, 23)}] ${msg}`];
  }

  // Progressive module loading stages
  // Each stage dynamically imports a group of dependencies
  const stages: { name: string; load: () => Promise<void> }[] = [
    {
      name: '1_css_fonts',
      async load() {
        await import('../../../routes/styles.css');
        await import('@fontsource-variable/inter');
        await import('@fontsource-variable/noto-sans-jp');
      }
    },
    {
      name: '2_i18n',
      async load() {
        await import('$lib/i18n');
        const { locale, waitLocale } = await import('svelte-i18n');
        locale.set('en');
        await waitLocale();
      }
    },
    {
      name: '3_stores',
      async load() {
        await import('$lib/stores');
      }
    },
    {
      name: '4_state_classes',
      async load() {
        await import('$lib/classes/appState.svelte');
        await import('$lib/classes/columnState.svelte');
        await import('$lib/classes/settingsState.svelte');
        await import('$lib/classes/sideState.svelte');
        await import('$lib/classes/imageState.svelte');
        await import('$lib/classes/comicReaderState.svelte');
        await import('$lib/classes/postState.svelte');
        await import('$lib/classes/keywordMuteState.svelte');
        await import('$lib/classes/intlRelativeTimeFormatState.svelte');
      }
    },
    {
      name: '5_database',
      async load() {
        await import('$lib/db');
      }
    },
    {
      name: '6_atproto_api',
      async load() {
        // @atproto/api removed from client bundle
      }
    },
    {
      name: '7_oauth',
      async load() {
        await import('$lib/oauth');
      }
    },
    {
      name: '8_tiptap_editor',
      async load() {
        await import('@tiptap/core');
        await import('@tiptap/pm/state');
        await import('@tiptap/pm/view');
        await import('@tiptap/extension-document');
        await import('@tiptap/extension-text');
        await import('@tiptap/extension-paragraph');
        await import('@tiptap/extension-link');
        await import('@tiptap/extension-mention');
        await import('@tiptap/extension-hard-break');
      }
    },
    {
      name: '9_emoji_data',
      async load() {
        await import('$lib/components/editor/emojiData');
      }
    },
    {
      name: '10_lucide_icons',
      async load() {
        // Import the heaviest icon file (columnIcons imports 74+ icons)
        await import('$lib/columnIcons');
      }
    },
    {
      name: '11_ui_components',
      async load() {
        await import('$lib/components/ui/Menu.svelte');
        await import('$lib/components/ui/Modal.svelte');
        await import('$lib/components/ui/Tooltip.svelte');
        await import('$lib/components/ui/LoadingSpinner.svelte');
        await import('$lib/components/ui/ConfirmModal.svelte');
      }
    },
    {
      name: '12_timeline_components',
      async load() {
        await import('$lib/components/post/TimelineContent.svelte');
        await import('$lib/components/post/TimelineText.svelte');
        await import('$lib/components/post/ReactionButtons.svelte');
        await import('$lib/components/post/EmbedExternal.svelte');
        await import('$lib/components/post/EmbedRecord.svelte');
        await import('$lib/components/post/EmbedVideo.svelte');
        await import('$lib/components/post/TimelineWarn.svelte');
        await import('$lib/timelineFilter');
      }
    },
    {
      name: '13_side_footer',
      async load() {
        await import('../../../routes/(app)/Side.svelte');
        await import('../../../routes/(app)/Footer.svelte');
      }
    },
    {
      name: '14_realtime',
      async load() {
        await import('$lib/realtime');
      }
    },
    {
      name: '15_misc_libs',
      async load() {
        await import('svelte-sonner');
        await import('$lib/builtInThemes');
        await import('$lib/defaultSettings');
        await import('$lib/defaultColors');
      }
    },
  ];

  async function loadStage(stage: { name: string; load: () => Promise<void> }) {
    try {
      await stage.load();
      loaded[stage.name] = true;
      addLog(`Loaded: ${stage.name}`);
    } catch (e: any) {
      addLog(`Error loading ${stage.name}: ${e.message}`);
      loaded[stage.name] = true; // Mark as attempted
    }
  }

  async function loadAll() {
    for (const stage of stages) {
      if (!loaded[stage.name]) {
        await loadStage(stage);
      }
    }
    addLog('All stages loaded');
  }

  // Expose API for Playwright
  if (typeof window !== 'undefined') {
    (window as any).__baselineMemoryTest = {
      stages: stages.map(s => s.name),

      async loadStage(name: string) {
        const stage = stages.find(s => s.name === name);
        if (stage && !loaded[stage.name]) {
          await loadStage(stage);
        }
      },

      async loadAll() {
        await loadAll();
      },

      getLog() {
        return log;
      },

      getLoaded() {
        return { ...loaded };
      },
    };
  }
</script>

<div style="font-family: monospace; padding: 20px; max-width: 900px; margin: 0 auto;">
  <h1 style="font-size: 18px;">Baseline Memory Test</h1>
  <p style="color: #666; font-size: 12px;">Load modules progressively and measure memory via Playwright CDP</p>

  <div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0;">
    <button onclick={loadAll} style="padding: 6px 16px; font-weight: bold; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Load All
    </button>
  </div>

  <div style="display: flex; flex-direction: column; gap: 4px; margin: 16px 0;">
    {#each stages as stage}
      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          onclick={() => loadStage(stage)}
          disabled={loaded[stage.name]}
          style="padding: 4px 12px; font-size: 12px; min-width: 200px; text-align: left; cursor: pointer; border: 1px solid #ccc; border-radius: 3px; background: {loaded[stage.name] ? '#e8f5e9' : '#fff'};"
        >
          {loaded[stage.name] ? '✓' : '○'} {stage.name}
        </button>
      </div>
    {/each}
  </div>

  <div style="margin-top: 16px; background: #1a1a2e; color: #0f0; padding: 12px; border-radius: 4px; font-size: 11px; max-height: 300px; overflow-y: auto;">
    {#each log as line}
      <div>{line}</div>
    {/each}
    {#if log.length === 0}
      <div style="color: #666;">Ready. Use buttons or Playwright to load stages.</div>
    {/if}
  </div>
</div>
