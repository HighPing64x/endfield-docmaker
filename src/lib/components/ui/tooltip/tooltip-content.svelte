<script lang="ts">
  import { Tooltip as TooltipPrimitive } from 'bits-ui';
  import { cn, type WithoutChildrenOrChild } from '$lib/utils/ui.js';
  import type { Snippet } from 'svelte';

  let {
    ref = $bindable(null),
    sideOffset = 8,
    class: className,
    children,
    ...restProps
  }: WithoutChildrenOrChild<TooltipPrimitive.ContentProps> & {
    children: Snippet;
  } = $props();
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    bind:ref
    data-slot="tooltip-content"
    {sideOffset}
    class={cn(
      'bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in-0 zoom-in-95 data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 z-50 w-fit rounded-none px-3 py-1.5 text-xs ring-1',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
