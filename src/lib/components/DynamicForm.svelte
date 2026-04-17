<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { Switch } from '$lib/components/ui/switch';
  import DateInput from '$lib/components/DateInput.svelte';
  import AuthoritiesList from '$lib/components/AuthoritiesList.svelte';
  import KvGrid from '$lib/components/KvGrid.svelte';
  import FileList from '$lib/components/FileList.svelte';
  import type { FormField, TemplateDefinition } from '$lib/templates/types';

  let {
    template,
    templateId,
    values = {},
    disabled = false,
    onchange,
    onfileschange
  }: {
    template: TemplateDefinition;
    templateId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: Record<string, any>;
    disabled?: boolean;
    onchange?: (values: Record<string, unknown>, options?: { debounce?: boolean }) => void;
    onfileschange?: () => void;
  } = $props();

  const cols = $derived(template.gridCols ?? 3);

  function colspanClass(field: FormField): string {
    const span = field.colspan ?? cols;
    switch (span) {
      case 1:
        return 'sm:col-span-1';
      case 2:
        return 'sm:col-span-2';
      case 3:
        return 'sm:col-span-3';
      case 4:
        return 'sm:col-span-4';
      default:
        return `sm:col-span-${span}`;
    }
  }

  function minHeightClass(field: FormField): string {
    if (field.type !== 'textarea') return '';
    const h = field.minHeight;
    switch (h) {
      case undefined:
        // By default, textareas fallback to UI component defaults (min-h-16) unless overridden
        return '';
      case 0:
        return 'min-h-0';
      case 16:
        return 'min-h-16';
      case 20:
        return 'min-h-20';
      case 24:
        return 'min-h-24';
      case 32:
        return 'min-h-32';
      case 40:
        return 'min-h-40';
      case 48:
        return 'min-h-48';
      case 64:
        return 'min-h-64';
      default:
        return `min-h-[${h}px]`;
    }
  }

  function update(key: string, val: unknown, debounce = false) {
    onchange?.({ ...values, [key]: val }, { debounce });
  }

  const gridColsClass = $derived(
    cols === 1
      ? 'grid-cols-1'
      : cols === 2
        ? 'sm:grid-cols-2'
        : cols === 3
          ? 'sm:grid-cols-3'
          : 'sm:grid-cols-4'
  );
</script>

<div class="flex flex-1 flex-col gap-4">
  <div class="grid grid-cols-1 gap-4 {gridColsClass} shrink-0">
    {#each template.fields.filter((f) => !(f.type === 'textarea' && f.grow) && f.type !== 'file-list') as field (field.key)}
      {@render formField(field)}
    {/each}
  </div>
  {#each template.fields.filter((f) => f.type === 'file-list') as field (field.key)}
    {@render formField(field)}
  {/each}
  {#each template.fields.filter((f) => f.type === 'textarea' && f.grow) as field (field.key)}
    {@render formField(field)}
  {/each}
</div>

{#snippet formField(field: FormField)}
  {@const span = colspanClass(field)}
  {#if field.type === 'text'}
    <div class="space-y-2 {span}">
      <Label>{field.label()}</Label>
      <Input
        value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
        oninput={(e) => update(field.key, e.currentTarget.value, true)}
        placeholder={field.placeholder?.() ?? ''}
        {disabled}
      />
    </div>
  {:else if field.type === 'textarea'}
    <div class="space-y-2 {span} {field.grow ? 'flex flex-1 flex-col' : ''}">
      <Label>{field.label()}</Label>
      <Textarea
        value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
        oninput={(e) => update(field.key, e.currentTarget.value, true)}
        placeholder={field.placeholder?.() ?? ''}
        class="field-sizing-fixed {minHeightClass(field)} resize-none {field.grow ? 'flex-1' : ''}"
        {disabled}
      />
    </div>
  {:else if field.type === 'select'}
    <div class="space-y-2 {span}">
      <Label>{field.label()}</Label>
      <Select
        type="single"
        value={typeof values[field.key] === 'string' ? (values[field.key] as string) : undefined}
        onValueChange={(v) => update(field.key, v)}
        {disabled}
      >
        <SelectTrigger class="w-full">
          {#if values[field.key]}
            {field.options.find((o) => o.value === values[field.key])?.label() ??
              field.placeholder?.() ??
              ''}
          {:else}
            {field.placeholder?.() ?? ''}
          {/if}
        </SelectTrigger>
        <SelectContent>
          {#each field.options as opt (opt.value)}
            <SelectItem value={opt.value} label={opt.label()} />
          {/each}
        </SelectContent>
      </Select>
    </div>
  {:else if field.type === 'number'}
    <div class="space-y-2 {span}">
      <Label>{field.label()}</Label>
      <Input
        type="number"
        value={values[field.key] != null ? String(values[field.key]) : ''}
        oninput={(e) => {
          const v = e.currentTarget.value;
          update(field.key, v === '' ? '' : v, true);
        }}
        min={field.min}
        max={field.max}
        placeholder={field.placeholder ?? ''}
        {disabled}
      />
    </div>
  {:else if field.type === 'toggle'}
    <div class="flex items-center gap-3 {span}">
      <Switch checked={!!values[field.key]} onchange={(v) => update(field.key, v)} {disabled} />
      <div class="flex flex-col">
        <Label class="cursor-pointer">{field.label()}</Label>
        {#if field.description}
          <span class="text-muted-foreground text-xs">{field.description()}</span>
        {/if}
      </div>
    </div>
  {:else if field.type === 'date'}
    <div class="space-y-2 {span}">
      <Label>{field.label()}</Label>
      <DateInput
        value={values[field.key] ?? { year: '', month: '', day: '' }}
        onchange={(v) => update(field.key, v, true)}
        class="w-full"
        {disabled}
      />
    </div>
  {:else if field.type === 'authorities'}
    <div class={span}>
      <AuthoritiesList
        value={values[field.key] ?? []}
        onchange={(v) => update(field.key, v)}
        maxItems={field.maxItems ?? 9}
        {disabled}
      />
    </div>
  {:else if field.type === 'kv-grid'}
    <div class={span}>
      <KvGrid
        value={values[field.key] ?? []}
        onchange={(v) => update(field.key, v)}
        label={field.label()}
        {disabled}
      />
    </div>
  {:else if field.type === 'prefixed-input'}
    <div class="space-y-2 {span}">
      <Label>{field.label()}</Label>
      <div class="flex">
        <Select
          type="single"
          value={typeof values[field.prefixKey] === 'string'
            ? (values[field.prefixKey] as string)
            : undefined}
          onValueChange={(v) => update(field.prefixKey, v)}
          {disabled}
        >
          <SelectTrigger class="w-auto shrink-0 rounded-r-none border-r-0">
            {field.prefixes.find((p) => p.value === values[field.prefixKey])?.label() ?? ''}
          </SelectTrigger>
          <SelectContent>
            {#each field.prefixes as p (p.value)}
              <SelectItem value={p.value} label={p.label()} />
            {/each}
          </SelectContent>
        </Select>
        <Input
          value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
          oninput={(e) => update(field.key, e.currentTarget.value, true)}
          placeholder={field.placeholder?.() ?? ''}
          class="rounded-l-none"
          {disabled}
        />
      </div>
    </div>
  {:else if field.type === 'file-list'}
    <FileList
      {templateId}
      label={field.label()}
      defaultFiles={field.defaultFiles ?? []}
      onchange={onfileschange}
      {disabled}
    />
  {:else if field.type === 'custom'}
    <div class={span}>
      <field.component bind:value={values[field.key]} {disabled} />
    </div>
  {/if}
{/snippet}
