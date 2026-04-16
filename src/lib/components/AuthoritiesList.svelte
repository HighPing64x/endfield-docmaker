<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { Input } from '$lib/components/ui/input';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import Button from '$lib/components/ui/button/button.svelte';
  import { ISSUERS } from '$lib/constants';
  import { pick } from '$lib/utils';
  import type { Authority } from '$lib/types';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import GripVerticalIcon from '@lucide/svelte/icons/grip-vertical';
  import { slide } from 'svelte/transition';

  const authorityNames = [
    '纪律检查委员会',
    '人事管理局',
    '摸鱼事务所',
    '后勤保障部',
    '危机处理小组',
    '特种技术部门',
    '安全监察处',
    '综合协调办公室'
  ];

  let {
    value = $bindable<Authority[]>([]),
    maxItems = 9,
    disabled = false
  }: {
    value: Authority[];
    maxItems?: number;
    disabled?: boolean;
  } = $props();

  let dragIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let inputFocused = $state(false);
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium">{m.authorities()}</span>
    {#if value.length < maxItems}
      <Button
        variant="outline"
        size="sm"
        class="h-7 cursor-pointer text-xs"
        onclick={() => {
          value = [
            ...value,
            {
              faction: pick(Array.from(ISSUERS)).key,
              name: pick(authorityNames)
            }
          ];
        }}
        {disabled}
      >
        <PlusIcon class="size-4" />
        {m.add_authority()}
      </Button>
    {/if}
  </div>
  {#each value as auth, i (i)}
    <div
      class="flex items-center gap-2 rounded-md transition-colors {dragOverIndex === i &&
      dragIndex !== null &&
      dragIndex !== i
        ? 'bg-muted/60'
        : ''}"
      draggable={!inputFocused && !disabled && value.length > 1}
      ondragstart={(e) => {
        dragIndex = i;
        e.dataTransfer!.effectAllowed = 'move';
      }}
      ondragover={(e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        dragOverIndex = i;
      }}
      ondragleave={() => {
        if (dragOverIndex === i) dragOverIndex = null;
      }}
      ondrop={(e) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== i) {
          const updated = [...value];
          const [moved] = updated.splice(dragIndex, 1);
          updated.splice(i, 0, moved);
          value = updated;
        }
        dragIndex = null;
        dragOverIndex = null;
      }}
      ondragend={() => {
        dragIndex = null;
        dragOverIndex = null;
      }}
      role="listitem"
      transition:slide={{ duration: 80 }}
    >
      {#if value.length > 1}
        <span
          class="text-muted-foreground/60 hover:text-muted-foreground flex shrink-0 cursor-grab active:cursor-grabbing"
        >
          <GripVerticalIcon class="size-4" />
        </span>
      {/if}
      <div class="flex min-w-0 flex-1">
        <Select
          type="single"
          value={auth.faction}
          onValueChange={(v) => {
            value[i] = { ...auth, faction: v as Authority['faction'] };
          }}
          {disabled}
        >
          <SelectTrigger class="w-auto shrink-0 rounded-r-none border-r-0">
            {m[`prefix_${auth.faction}`]()}
          </SelectTrigger>
          <SelectContent>
            {#each ISSUERS as iss (iss.key)}
              <SelectItem value={iss.key} label={m[`prefix_${iss.key}`]()} />
            {/each}
          </SelectContent>
        </Select>
        <Input
          value={auth.name}
          oninput={(e) => {
            value[i] = { ...auth, name: e.currentTarget.value };
          }}
          onfocus={() => (inputFocused = true)}
          onblur={() => (inputFocused = false)}
          {disabled}
          class="rounded-l-none"
        />
      </div>
      {#if value.length > 1}
        <Button
          variant="ghost"
          size="sm"
          class="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 cursor-pointer p-0"
          onclick={() => {
            value = value.filter((_, idx) => idx !== i);
          }}
          {disabled}
        >
          ✕
        </Button>
      {/if}
    </div>
  {/each}
</div>
