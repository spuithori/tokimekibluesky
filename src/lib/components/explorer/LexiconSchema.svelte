<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import Self from './LexiconSchema.svelte';
  import { lexiconPath } from '$lib/explorer/input';
  import type { LexiconSchema } from '$lib/explorer/lexicon';

  let { schema, base, name = undefined, required = false, depth = 0 }: {
    schema: LexiconSchema;
    base: string;
    name?: string;
    required?: boolean;
    depth?: number;
  } = $props();

  const CONSTRAINTS = ['format', 'minLength', 'maxLength', 'minGraphemes', 'maxGraphemes', 'minimum', 'maximum', 'maxSize', 'const', 'default', 'key'] as const;

  const body = $derived(schema.type === 'record' ? schema.record : schema);
  const constraints = $derived(CONSTRAINTS.filter((key) => schema[key] !== undefined).map((key) => `${key}: ${schema[key]}`));
  const refs = $derived(schema.type === 'ref' && schema.ref ? [schema.ref] : schema.type === 'union' ? schema.refs ?? [] : []);
  const typeLabel = $derived(schema.type === 'array' && schema.items ? `array<${schema.items.type === 'ref' ? 'ref' : schema.items.type}>` : schema.type);

  function refHref(ref: string): string {
    const [id, fragment] = ref.split('#');
    return lexiconPath(id || base) + (fragment ? '#' + fragment : '');
  }
</script>

<div class="lex" class:lex--nested={depth > 0}>
  <div class="lex__line">
    {#if name}<span class="lex__name">{name}</span>{/if}
    <span class="lex__type">{typeLabel}</span>
    {#if required}<span class="lex__required">{$_('explorer_schema_required')}</span>{/if}
    {#each constraints as constraint (constraint)}
      <span class="lex__constraint">{constraint}</span>
    {/each}
  </div>

  {#if schema.description}
    <p class="lex__description">{schema.description}</p>
  {/if}

  {#if refs.length}
    <div class="lex__refs">
      {#each refs as ref (ref)}
        <a class="lex__ref" href={refHref(ref)}>{ref}</a>
      {/each}
    </div>
  {/if}

  {#if schema.knownValues?.length || schema.enum?.length || schema.accept?.length}
    <div class="lex__refs">
      {#each schema.knownValues ?? schema.enum ?? schema.accept ?? [] as value (value)}
        <span class="lex__constraint">{value}</span>
      {/each}
    </div>
  {/if}

  {#if schema.type === 'array' && schema.items && (schema.items.type === 'ref' || schema.items.type === 'union' || schema.items.type === 'object')}
    <Self schema={schema.items} {base} depth={depth + 1} />
  {/if}

  {#if body?.properties && depth < 6}
    <div class="lex__children">
      {#each Object.entries(body.properties) as [key, property] (key)}
        <Self schema={property} {base} name={key} required={body.required?.includes(key)} depth={depth + 1} />
      {/each}
    </div>
  {/if}

  {#each [['parameters', schema.parameters], ['input', schema.input?.schema], ['output', schema.output?.schema], ['message', schema.message?.schema]] as [label, part] (label)}
    {#if part && typeof part === 'object'}
      <div class="lex__children">
        <Self schema={part} {base} name={label as string} depth={depth + 1} />
      </div>
    {/if}
  {/each}

  {#if schema.errors?.length}
    <div class="lex__refs">
      {#each schema.errors as error (error.name)}
        <span class="lex__constraint" title={error.description}>{error.name}</span>
      {/each}
    </div>
  {/if}
</div>

<style lang="postcss">
  .lex {
      padding: 6px 0;

      &--nested {
          border-top: 1px solid var(--border-color-2);
      }

      &__line {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 4px 8px;
      }

      &__name {
          font-family: var(--code-font);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-color-1);
      }

      &__type {
          font-family: var(--code-font);
          font-size: 12px;
          color: color-mix(in oklab, var(--primary-color) 70%, var(--text-color-1));
      }

      &__required {
          font-size: 11px;
          color: var(--danger-color);
      }

      &__constraint {
          font-family: var(--code-font);
          font-size: 11px;
          padding: 1px 6px;
          border-radius: var(--radius-round, 999px);
          background-color: var(--bg-color-3);
          color: var(--text-color-3);
      }

      &__description {
          margin-top: 2px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-color-3);
          overflow-wrap: anywhere;
      }

      &__refs {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 8px;
          margin-top: 4px;
      }

      &__ref {
          font-family: var(--code-font);
          font-size: 12px;
          color: var(--link-color, var(--primary-color));

          @media (hover: hover) {
              &:hover {
                  text-decoration: underline;
              }
          }
      }

      &__children {
          margin: 4px 0 0 6px;
          padding-left: 14px;
          border-left: 1px solid var(--border-color-2);
      }
  }
</style>
