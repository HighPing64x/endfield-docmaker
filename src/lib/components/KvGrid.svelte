<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { Input } from '$lib/components/ui/input';
  import Button from '$lib/components/ui/button/button.svelte';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import XIcon from '@lucide/svelte/icons/x';

  export type KvEntry = { key: string; value: string };

  let {
    value = $bindable<KvEntry[]>([]),
    disabled = false,
    label = '',
    onchange
  }: {
    value: KvEntry[];
    disabled?: boolean;
    label?: string;
    onchange?: (value: KvEntry[]) => void;
  } = $props();

  function addEntry() {
    value = [...value, { key: '', value: '' }];
    onchange?.(value);
  }

  function updateKey(i: number, entry: KvEntry, newKey: string) {
    value[i] = { ...entry, key: newKey };
    onchange?.(value);
  }

  function updateValue(i: number, entry: KvEntry, newValue: string) {
    value[i] = { ...entry, value: newValue };
    onchange?.(value);
  }

  function removeEntry(i: number) {
    value = value.filter((_, idx) => idx !== i);
    onchange?.(value);
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    {#if label}
      <span class="text-sm font-medium">{label}</span>
    {/if}
    <Button
      variant="outline"
      size="sm"
      class="h-7 cursor-pointer text-xs"
      onclick={addEntry}
      {disabled}
    >
      <PlusIcon class="size-4" />
      {m.kv_add()}
    </Button>
  </div>
  {#each value as entry, i (i)}
    <div class="flex items-center gap-2">
      <Input
        value={entry.key}
        oninput={(e) => updateKey(i, entry, e.currentTarget.value)}
        placeholder={m.kv_key_placeholder()}
        class="w-1/3 shrink-0"
        {disabled}
      />
      <Input
        value={entry.value}
        oninput={(e) => updateValue(i, entry, e.currentTarget.value)}
        placeholder={m.kv_value_placeholder()}
        class="flex-1"
        {disabled}
      />
      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 cursor-pointer p-0"
        onclick={() => removeEntry(i)}
        {disabled}
      >
        <XIcon class="size-4" />
      </Button>
    </div>
  {/each}
</div>
