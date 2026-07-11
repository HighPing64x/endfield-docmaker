<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Label } from '$lib/components/ui/label';
  import { m } from '$lib/paraglide/messages';
  import FileIcon from '@lucide/svelte/icons/file';
  import ImageIcon from '@lucide/svelte/icons/image';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import XIcon from '@lucide/svelte/icons/x';
  import type { UploadedImage } from '$lib/types';

  let {
    value = $bindable<UploadedImage | null>(null),
    label,
    description,
    accept = 'image/png,image/jpeg,image/svg+xml',
    disabled = false,
    onchange
  }: {
    value: UploadedImage | null;
    label: string;
    description?: string;
    accept?: string;
    disabled?: boolean;
    onchange?: (value: UploadedImage | null) => void;
  } = $props();

  let input: HTMLInputElement;

  function pickFile() {
    input?.click();
  }

  async function handleFileChange(e: Event) {
    const files = (e.currentTarget as HTMLInputElement).files;
    const file = files?.[0];
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    value = { name: file.name, type: file.type, dataUrl };
    onchange?.(value);
    if (input) input.value = '';
  }

  function clearImage() {
    value = null;
    onchange?.(null);
    if (input) input.value = '';
  }
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between gap-2">
    <div class="min-w-0">
      <Label>{label}</Label>
      {#if description}
        <p class="text-muted-foreground mt-1 text-xs">{description}</p>
      {/if}
    </div>
    <Button
      variant="outline"
      size="xs"
      class="shrink-0 cursor-pointer text-xs"
      onclick={pickFile}
      {disabled}
    >
      <UploadIcon class="size-3" />
      {m.image_upload()}
    </Button>
  </div>

  <input
    bind:this={input}
    type="file"
    class="hidden"
    {accept}
    onchange={handleFileChange}
    {disabled}
  />

  {#if value}
    <div class="border-border bg-muted/30 flex min-h-16 items-center gap-3 border p-2">
      <div class="bg-background flex size-12 shrink-0 items-center justify-center overflow-hidden border">
        {#if value.dataUrl.startsWith('data:image/svg') || value.dataUrl.startsWith('data:image/')}
          <img src={value.dataUrl} alt="" class="max-h-full max-w-full object-contain" />
        {:else}
          <ImageIcon class="text-muted-foreground size-5" />
        {/if}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <FileIcon class="text-muted-foreground size-3.5 shrink-0" />
          <span class="truncate text-xs">{value.name}</span>
        </div>
        <p class="text-muted-foreground mt-1 text-[10px]">{value.type || 'image'}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0 cursor-pointer p-0"
        onclick={clearImage}
        {disabled}
      >
        <XIcon class="size-4" />
      </Button>
    </div>
  {:else}
    <button
      type="button"
      class="border-border text-muted-foreground hover:bg-muted/40 flex h-16 w-full cursor-pointer items-center justify-center gap-2 border border-dashed text-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
      onclick={pickFile}
      {disabled}
    >
      <ImageIcon class="size-4" />
      {m.image_select()}
    </button>
  {/if}
</div>
