<script lang="ts">
  import {
    compressImageWithStats,
    type CompressStats,
  } from '$lib/imageCompressor/compressor';
  import type { CompressOptions } from '$lib/imageCompressor/types';

  type Variant = {
    label: string;
    options: CompressOptions;
    status: 'pending' | 'running' | 'done' | 'error';
    stats: CompressStats | null;
    url: string;
    errorMessage: string;
  };

  function defaultVariants(): Variant[] {
    return [
      {
        label: 'WebP (production)',
        options: { outputType: 'image/webp', maxWidthOrHeight: 2000, maxSizeMB: 2_000_000 / 1024 / 1024 },
        status: 'pending', stats: null, url: '', errorMessage: '',
      },
    ];
  }

  let originalFile = $state<File | null>(null);
  let originalUrl = $state('');
  let originalDims = $state<{ w: number; h: number } | null>(null);
  let variants = $state<Variant[]>(defaultVariants());
  let dragOver = $state(false);
  let customMaxWidth = $state(2000);
  let customMaxSizeMB = $state(2_000_000 / 1024 / 1024);

  $effect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      for (const v of variants) if (v.url) URL.revokeObjectURL(v.url);
    };
  });

  async function loadFile(file: File) {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    for (const v of variants) if (v.url) URL.revokeObjectURL(v.url);

    originalFile = file;
    originalUrl = URL.createObjectURL(file);
    originalDims = null;
    variants = defaultVariants().map(v => ({
      ...v,
      options: { ...v.options, maxWidthOrHeight: customMaxWidth, maxSizeMB: customMaxSizeMB },
    }));

    const img = new Image();
    img.onload = () => {
      originalDims = { w: img.naturalWidth, h: img.naturalHeight };
      img.src = '';
    };
    img.src = originalUrl;

    await runAll();
  }

  async function runAll() {
    if (!originalFile) return;
    await Promise.all(variants.map((_, i) => runVariant(i)));
  }

  async function runVariant(idx: number) {
    if (!originalFile) return;
    const v = variants[idx];
    if (v.url) URL.revokeObjectURL(v.url);
    v.status = 'running';
    v.stats = null;
    v.url = '';
    v.errorMessage = '';
    variants = [...variants];

    try {
      const stats = await compressImageWithStats(originalFile, v.options);
      v.stats = stats;
      v.url = URL.createObjectURL(stats.blob);
      v.status = 'done';
    } catch (e) {
      v.errorMessage = (e as Error).message;
      v.status = 'error';
    }
    variants = [...variants];
  }

  function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) loadFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function onDragLeave() {
    dragOver = false;
  }

  function rerunAll() {
    for (const v of variants) {
      v.options = { ...v.options, maxWidthOrHeight: customMaxWidth, maxSizeMB: customMaxSizeMB };
    }
    variants = [...variants];
    runAll();
  }

  function addVariant() {
    variants = [...variants, {
      label: `WebP (custom #${variants.length + 1})`,
      options: { outputType: 'image/webp', maxWidthOrHeight: customMaxWidth, maxSizeMB: customMaxSizeMB },
      status: 'pending', stats: null, url: '', errorMessage: '',
    }];
  }

  function removeVariant(idx: number) {
    const v = variants[idx];
    if (v.url) URL.revokeObjectURL(v.url);
    variants = variants.filter((_, i) => i !== idx);
  }

  function fmtBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  }

  function fmtRatio(a: number, b: number): string {
    if (!b) return '—';
    const pct = (a / b) * 100;
    return `${pct.toFixed(1)}%`;
  }

  function fmtDelta(a: number, b: number): string {
    if (!b) return '—';
    const d = a - b;
    const pct = (d / b) * 100;
    const sign = d >= 0 ? '+' : '';
    return `${sign}${fmtBytes(d)} (${sign}${pct.toFixed(1)}%)`;
  }

  function fmtMs(ms: number | undefined): string {
    if (ms === undefined) return '—';
    if (ms < 1) return '< 1 ms';
    if (ms < 1000) return `${ms.toFixed(1)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  }

  function pathLabel(timings: Record<string, number>): string {
    if (timings.shortCircuit) return 'short-circuit (strip EXIF)';
    if (timings.encodeWebpAccepted) return 'WASM WebP';
    if (timings.convertToBlobLoop) return 'Canvas convertToBlob loop';
    return 'WASM encode';
  }
</script>

<svelte:head>
  <title>Image Compression Test</title>
</svelte:head>

<main class="page">
  <header>
    <h1>Image Compression Test</h1>
    <p class="lead">
      ローカルで <code>compressImageWithStats</code> を呼び出すテストページ。
      <strong>uploadBlob は行いません</strong>。圧縮後の preview / サイズ / 時間を visually 比較できます。
    </p>
  </header>

  <section class="dropzone" class:dragOver
    role="region"
    aria-label="ファイルドロップ領域"
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}>
    <input type="file" accept="image/jpeg, image/png, image/webp, image/heic, image/heif" onchange={onFileChange} id="file-input" />
    <label for="file-input">画像をクリック選択 / ドラッグ&ドロップ (JPEG / PNG / WebP / HEIC)</label>
  </section>

  <section class="controls">
    <label class="control">
      <span>maxWidthOrHeight: <b>{customMaxWidth}px</b></span>
      <input type="range" min="500" max="4000" step="100" bind:value={customMaxWidth} />
    </label>
    <label class="control">
      <span>maxSizeMB: <b>{customMaxSizeMB.toFixed(2)} MB</b></span>
      <input type="range" min="0.1" max="5" step="0.1" bind:value={customMaxSizeMB} />
    </label>
    <button onclick={rerunAll} disabled={!originalFile}>Re-run all</button>
    <button onclick={addVariant} disabled={!originalFile}>+ Add WebP variant</button>
  </section>

  {#if originalFile && originalDims}
    <section class="original">
      <h2>Original</h2>
      <div class="image-card">
        <img src={originalUrl} alt="original" />
        <dl class="stat-list">
          <div><dt>File</dt><dd>{originalFile.name}</dd></div>
          <div><dt>Type</dt><dd>{originalFile.type || '(unknown)'}</dd></div>
          <div><dt>Size</dt><dd>{fmtBytes(originalFile.size)}</dd></div>
          <div><dt>Dimensions</dt><dd>{originalDims.w} × {originalDims.h}</dd></div>
        </dl>
      </div>
    </section>

    <section class="variants">
      <h2>Compressed variants ({variants.length})</h2>
      <div class="variant-grid">
        {#each variants as v, i (i)}
          <div class="image-card variant" class:running={v.status === 'running'}>
            <div class="variant-header">
              <strong>{v.label}</strong>
              <button class="remove" onclick={() => removeVariant(i)} aria-label="削除">×</button>
            </div>

            <div class="image-wrap">
              {#if v.url}
                <img src={v.url} alt={v.label} />
              {:else if v.status === 'running'}
                <div class="placeholder">圧縮中…</div>
              {:else if v.status === 'error'}
                <div class="placeholder error">Error: {v.errorMessage}</div>
              {:else}
                <div class="placeholder">待機中</div>
              {/if}
            </div>

            <dl class="stat-list">
              <div><dt>Output type</dt><dd>{v.options.outputType}</dd></div>
              {#if v.stats}
                <div><dt>Output size</dt><dd>{fmtBytes(v.stats.blob.size)} <span class="muted">({fmtRatio(v.stats.blob.size, v.stats.originalSize)})</span></dd></div>
                <div><dt>vs original</dt><dd class="delta">{fmtDelta(v.stats.blob.size, v.stats.originalSize)}</dd></div>
                <div><dt>Dimensions</dt><dd>{v.stats.width} × {v.stats.height}</dd></div>
                <div><dt>Total time</dt><dd><b>{fmtMs(v.stats.timings.total)}</b></dd></div>
                <div><dt>Path</dt><dd>{pathLabel(v.stats.timings)}</dd></div>
                <div><dt>Runtime</dt><dd>{v.stats.runtime}</dd></div>
              {/if}
            </dl>

            {#if v.stats}
              <details>
                <summary>Timings 詳細</summary>
                <table class="timings">
                  <tbody>
                    {#each Object.entries(v.stats.timings) as [k, val] (k)}
                      <tr><th>{k}</th><td>{typeof val === 'number' ? val.toFixed(2) : val}</td></tr>
                    {/each}
                  </tbody>
                </table>
              </details>
              <button onclick={() => runVariant(i)} class="rerun">この variant のみ再実行</button>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    {#if variants.some(v => v.stats)}
      <section class="summary-table">
        <h2>比較サマリー</h2>
        <table>
          <thead>
            <tr>
              <th>variant</th>
              <th>output</th>
              <th>output size</th>
              <th>ratio</th>
              <th>delta</th>
              <th>total time</th>
              <th>path</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><em>original</em></td>
              <td>{originalFile.type}</td>
              <td>{fmtBytes(originalFile.size)}</td>
              <td>100.0%</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>
            {#each variants as v, i (i)}
              {#if v.stats}
                <tr>
                  <td>{v.label}</td>
                  <td>{v.stats.blob.type}</td>
                  <td>{fmtBytes(v.stats.blob.size)}</td>
                  <td>{fmtRatio(v.stats.blob.size, v.stats.originalSize)}</td>
                  <td>{fmtDelta(v.stats.blob.size, v.stats.originalSize)}</td>
                  <td>{fmtMs(v.stats.timings.total)}</td>
                  <td>{pathLabel(v.stats.timings)}</td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  {:else}
    <section class="empty">
      画像を選択すると WebP variant が圧縮されます。
    </section>
  {/if}
</main>

<style>
  .page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }
  header h1 {
    margin: 0 0 4px;
    font-size: 26px;
    letter-spacing: -0.01em;
  }
  .lead {
    margin: 0 0 24px;
    color: #555;
    font-size: 14px;
    line-height: 1.6;
  }
  .lead code {
    background: #eef;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12.5px;
  }

  .dropzone {
    border: 2px dashed #b9c3d4;
    border-radius: 12px;
    padding: 28px;
    text-align: center;
    background: #fff;
    transition: background 0.15s, border-color 0.15s;
    margin-bottom: 16px;
  }
  .dropzone.dragOver {
    border-color: #5474ff;
    background: #f0f4ff;
  }
  .dropzone input[type=file] {
    display: none;
  }
  .dropzone label {
    cursor: pointer;
    color: #4257bf;
    font-weight: 500;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 12px 16px;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #e3e6ee;
    margin-bottom: 24px;
    align-items: end;
  }
  .control {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
    min-width: 220px;
  }
  .control input[type=range] {
    width: 100%;
  }
  .controls button {
    padding: 8px 14px;
    border: 1px solid #bcc4d3;
    background: #fff;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
  }
  .controls button:hover:not(:disabled) {
    background: #f3f5fb;
  }
  .controls button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  section h2 {
    font-size: 16px;
    margin: 24px 0 8px;
    color: #333;
  }

  .image-card {
    background: #fff;
    border: 1px solid #e3e6ee;
    border-radius: 10px;
    padding: 14px;
  }
  .image-card img,
  .image-card .placeholder {
    width: 100%;
    max-height: 360px;
    object-fit: contain;
    display: block;
    background: repeating-conic-gradient(#eee 0% 25%, #fff 25% 50%) 0 0 / 16px 16px;
    border-radius: 6px;
    margin-bottom: 10px;
  }
  .image-card .placeholder {
    height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 13px;
  }
  .image-card .placeholder.error {
    color: #c33;
    background: #fee;
  }

  .variant-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
  }
  .variant.running {
    border-color: #5474ff;
  }
  .variant-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .remove {
    background: transparent;
    border: 0;
    cursor: pointer;
    font-size: 18px;
    color: #999;
    line-height: 1;
    padding: 0 6px;
  }
  .remove:hover { color: #c33; }

  .stat-list {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    font-size: 12.5px;
    margin: 0;
  }
  .stat-list > div {
    display: contents;
  }
  .stat-list dt {
    color: #888;
  }
  .stat-list dd {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, monospace;
  }
  .stat-list dd .muted { color: #888; }
  .delta { color: #287d44; }

  details {
    margin-top: 10px;
    font-size: 12px;
  }
  details summary {
    cursor: pointer;
    color: #4257bf;
  }
  .timings {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    font-family: ui-monospace, monospace;
    font-size: 11.5px;
  }
  .timings th, .timings td {
    text-align: left;
    padding: 3px 6px;
    border-bottom: 1px solid #f0f0f0;
  }
  .timings th {
    color: #666;
    font-weight: normal;
    width: 50%;
  }

  .rerun {
    margin-top: 8px;
    padding: 6px 10px;
    font-size: 12px;
    background: #f3f5fb;
    border: 1px solid #bcc4d3;
    border-radius: 5px;
    cursor: pointer;
  }
  .rerun:hover { background: #e7ebf6; }

  .summary-table {
    margin-top: 32px;
  }
  .summary-table table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border: 1px solid #e3e6ee;
    border-radius: 8px;
    overflow: hidden;
    font-size: 13px;
  }
  .summary-table th, .summary-table td {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid #f0f0f0;
  }
  .summary-table th {
    background: #f6f8fb;
    color: #555;
    font-weight: 500;
  }
  .summary-table tr:last-child td { border-bottom: 0; }
  .summary-table td:nth-child(3),
  .summary-table td:nth-child(4),
  .summary-table td:nth-child(5),
  .summary-table td:nth-child(6) {
    font-family: ui-monospace, monospace;
  }

  .empty {
    margin-top: 32px;
    padding: 40px;
    background: #fff;
    border: 1px dashed #d0d6e2;
    border-radius: 10px;
    text-align: center;
    color: #888;
    font-size: 14px;
  }
</style>
