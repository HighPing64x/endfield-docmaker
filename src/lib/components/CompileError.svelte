<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { Switch } from '$lib/components/ui/switch';
  import { Label } from '$lib/components/ui/label';
  import WarningCircleIcon from 'phosphor-svelte/lib/WarningCircleIcon';
  import WarningIcon from 'phosphor-svelte/lib/WarningIcon';

  let {
    error
  }: {
    error: string;
  } = $props();

  interface Diagnostic {
    severity: 'Error' | 'Warning';
    message: string;
    trace: string[];
    hints: string[];
  }

  let structured = $state(true);

  function parseDiagnostics(raw: string): Diagnostic[] | null {
    try {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('[') || !trimmed.includes('SourceDiagnostic')) return null;

      const results: Diagnostic[] = [];
      // Matches: SourceDiagnostic { severity: Error|Warning, span: Span(...), message: "...", trace: [...], hints: [...] }
      const diagRegex =
        /SourceDiagnostic\s*\{\s*severity:\s*(Error|Warning)\s*,\s*span:\s*Span\([^)]*\)\s*,\s*message:\s*"((?:[^"\\]|\\.)*)"\s*,\s*trace:\s*\[((?:[^\]])*)\]\s*,\s*hints:\s*\[((?:[^\]])*)\]\s*\}/g;
      let match;
      while ((match = diagRegex.exec(trimmed)) !== null) {
        const severity = match[1] as 'Error' | 'Warning';
        const message = unescapeString(match[2]);
        const trace = parseCommaSeparated(match[3]);
        const hints = parseCommaSeparated(match[4]).map((h) => {
          const quoted = h.match(/^"((?:[^"\\]|\\.)*)"$/);
          return quoted ? unescapeString(quoted[1]) : h;
        });
        results.push({ severity, message, trace, hints });
      }

      return results.length > 0 ? results : null;
    } catch {
      return null;
    }
  }

  function unescapeString(s: string): string {
    return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  function parseCommaSeparated(raw: string): string[] {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** Deduplicate diagnostics by severity + message, keeping count. */
  function deduplicateDiagnostics(diags: Diagnostic[]): (Diagnostic & { count: number })[] {
    const seen: Record<string, Diagnostic & { count: number }> = {};
    const result: (Diagnostic & { count: number })[] = [];
    for (const d of diags) {
      const key = `${d.severity}:${d.message}`;
      if (seen[key]) {
        seen[key].count++;
      } else {
        const entry = { ...d, count: 1 };
        seen[key] = entry;
        result.push(entry);
      }
    }
    return result;
  }

  const diagnostics = $derived(parseDiagnostics(error));
  const deduped = $derived(diagnostics ? deduplicateDiagnostics(diagnostics) : null);
  const errors = $derived(deduped?.filter((d) => d.severity === 'Error') ?? []);
  const warnings = $derived(deduped?.filter((d) => d.severity === 'Warning') ?? []);
</script>

<div class="flex flex-col gap-2 p-6">
  <div class="flex items-center justify-between">
    <p class="text-destructive text-sm font-medium">{m.compile_error()}</p>
    {#if diagnostics}
      <div class="flex items-center gap-2">
        <Switch bind:checked={structured} />
        <Label class="text-muted-foreground cursor-pointer text-xs"
          >{m.compile_error_structured()}</Label
        >
      </div>
    {/if}
  </div>
  <p class="text-muted-foreground text-xs">{m.compile_error_desc()}</p>

  {#if structured && deduped}
    <div class="flex flex-col gap-2">
      {#if errors.length > 0}
        <div class="flex flex-col gap-1.5">
          {#each errors as diag (diag.message)}
            <div
              class="bg-destructive/10 text-destructive flex items-start gap-2 px-3 py-2 text-xs"
            >
              <WarningCircleIcon class="mt-0.5 size-4 shrink-0" weight="fill" />
              <div class="min-w-0 flex-1">
                <span class="font-medium">{diag.message}</span>
                {#if diag.count > 1}
                  <span class="text-destructive/60 ml-1 text-[10px]">×{diag.count}</span>
                {/if}
                {#if diag.trace.length > 0}
                  <div class="text-destructive/70 mt-0.5 font-mono text-[10px]">
                    {diag.trace.join(' → ')}
                  </div>
                {/if}
                {#if diag.hints.length > 0}
                  {#each diag.hints as hint, hi (hi)}
                    <div class="text-destructive/70 mt-0.5 text-[10px] italic">{hint}</div>
                  {/each}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
      {#if warnings.length > 0}
        <div class="flex flex-col gap-1.5">
          {#each warnings as diag (diag.message)}
            <div
              class="flex items-start gap-2 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
            >
              <WarningIcon class="mt-0.5 size-4 shrink-0" weight="fill" />
              <div class="min-w-0 flex-1">
                <span class="font-medium">{diag.message}</span>
                {#if diag.count > 1}
                  <span class="ml-1 text-[10px] opacity-60">×{diag.count}</span>
                {/if}
                {#if diag.trace.length > 0}
                  <div class="mt-0.5 font-mono text-[10px] opacity-70">
                    {diag.trace.join(' → ')}
                  </div>
                {/if}
                {#if diag.hints.length > 0}
                  {#each diag.hints as hint, hi (hi)}
                    <div class="mt-0.5 text-[10px] italic opacity-70">{hint}</div>
                  {/each}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <pre class="bg-muted text-destructive/80 p-3 font-mono text-xs text-wrap">{error}</pre>
  {/if}
</div>
