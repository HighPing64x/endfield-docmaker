<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const switchVariants = tv({
    slots: {
      root: 'focus-visible:ring-ring/50 focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      thumb:
        'bg-background pointer-events-none block size-4 rounded-full shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
    }
  });

  export type SwitchVariant = VariantProps<typeof switchVariants>;
</script>

<script lang="ts">
  import { cn } from '$lib/utils/ui.js';

  let {
    checked = $bindable(false),
    disabled = false,
    id,
    class: className,
    onchange,
    ...restProps
  }: {
    checked?: boolean;
    disabled?: boolean;
    id?: string;
    class?: string;
    onchange?: (checked: boolean) => void;
  } & Record<string, unknown> = $props();

  const { root, thumb } = switchVariants();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  data-state={checked ? 'checked' : 'unchecked'}
  {disabled}
  {id}
  class={cn(root(), className)}
  onclick={toggle}
  onkeydown={onKeydown}
  {...restProps}
>
  <span data-state={checked ? 'checked' : 'unchecked'} class={thumb()}></span>
</button>
