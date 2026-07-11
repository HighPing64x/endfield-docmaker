<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import Button from '$lib/components/ui/button/button.svelte';
  import DraggableList from '$lib/components/DraggableList.svelte';
  import { ISSUERS, normalizeIssuerKey } from '$lib/constants';
  import { pick } from '$lib/utils';
  import type { Authority } from '$lib/types';
  import PlusIcon from '@lucide/svelte/icons/plus';

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
    disabled = false,
    onchange
  }: {
    value: Authority[];
    maxItems?: number;
    disabled?: boolean;
    onchange?: (value: Authority[]) => void;
  } = $props();

  function defaultPrefix(faction: Authority['faction']) {
    return m[`prefix_${normalizeIssuerKey(faction)}`]();
  }

  function displayPrefix(auth: Authority) {
    return auth.prefix ?? defaultPrefix(auth.faction);
  }

  function updateFaction(i: number, auth: Authority, faction: string) {
    const nextFaction = normalizeIssuerKey(faction);
    const currentPrefix = auth.prefix?.trim() ?? '';
    const shouldFollowFaction = currentPrefix === '' || currentPrefix === defaultPrefix(auth.faction);
    value[i] = {
      ...auth,
      faction: nextFaction,
      prefix: shouldFollowFaction ? defaultPrefix(nextFaction) : auth.prefix
    };
    onchange?.(value);
  }

  function updatePrefix(i: number, auth: Authority, prefix: string) {
    value[i] = { ...auth, prefix };
    onchange?.(value);
  }

  function updateName(i: number, auth: Authority, name: string) {
    value[i] = { ...auth, name };
    onchange?.(value);
  }

  function handleListChange(newItems: Authority[]) {
    value = newItems;
    onchange?.(value);
  }

  function addAuthority() {
    const faction = pick(Array.from(ISSUERS)).key;
    value = [
      ...value,
      {
        faction,
        prefix: defaultPrefix(faction),
        name: pick(authorityNames)
      }
    ];
    onchange?.(value);
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <Label>{m.authorities()}</Label>
    {#if value.length < maxItems}
      <Button
        variant="outline"
        size="xs"
        class="cursor-pointer text-xs"
        onclick={addAuthority}
        {disabled}
      >
        <PlusIcon class="size-3" />
        {m.add_authority()}
      </Button>
    {/if}
  </div>
  <DraggableList items={value} onchange={handleListChange} {disabled}>
    {#snippet renderItem(auth, i)}
      {@const faction = normalizeIssuerKey(auth.faction)}
      <div class="flex flex-col gap-2 sm:flex-row sm:gap-0">
        <Select
          type="single"
          value={faction}
          onValueChange={(v) => updateFaction(i, auth, v)}
          {disabled}
        >
          <SelectTrigger class="w-full shrink-0 sm:w-36 sm:rounded-r-none sm:border-r-0">
            {m[`issuer_${faction}`]()}
          </SelectTrigger>
          <SelectContent>
            {#each ISSUERS as iss (iss.key)}
              <SelectItem value={iss.key} label={m[`issuer_${iss.key}`]()} />
            {/each}
          </SelectContent>
        </Select>
        <Input
          value={displayPrefix(auth)}
          oninput={(e) => updatePrefix(i, auth, e.currentTarget.value)}
          placeholder={m.authority_prefix_placeholder()}
          {disabled}
          class="sm:w-24 sm:rounded-none sm:border-r-0"
        />
        <Input
          value={auth.name}
          oninput={(e) => updateName(i, auth, e.currentTarget.value)}
          placeholder={m.authority_name_placeholder()}
          {disabled}
          class="sm:rounded-l-none"
        />
      </div>
    {/snippet}
  </DraggableList>
</div>
