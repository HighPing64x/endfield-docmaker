<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Spinner } from '$lib/components/ui/spinner';
  import { Separator } from '$lib/components/ui/separator';
  import * as Tabs from '$lib/components/ui/tabs';
  import { pick, triggerDownload } from '$lib/utils';
  import { onDestroy, onMount } from 'svelte';
  import typst, {
    loadingState,
    packageLoadingState,
    downloadProgress,
    waitForTypst
  } from '$lib/typst.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import DynamicForm from '$lib/components/DynamicForm.svelte';
  import CompileError from '$lib/components/CompileError.svelte';
  import { TEMPLATES, getTemplate } from '$lib/templates';

  let isReady = $state(false);
  let isGenerating = $state(false);
  let canDownload = $state(false);
  let canShare = $state(false);

  // Template selection
  const STORAGE_PREFIX = 'docmaker';
  const LEGACY_STORAGE_PREFIX = `${'end'}field-doc`;
  const STORAGE_META_KEY = `${STORAGE_PREFIX}:meta`;
  const LEGACY_STORAGE_META_KEY = `${LEGACY_STORAGE_PREFIX}:meta`;
  let templateId = $state(TEMPLATES[0].id);
  let template = $derived(getTemplate(templateId));

  // Form values (keyed by template id)
  let valuesMap = $state<Record<string, Record<string, unknown>>>({});

  // Ensure values are initialized for the current template
  $effect(() => {
    if (!valuesMap[templateId]) {
      valuesMap[templateId] = template.defaults();
    }
  });

  function getValues(): Record<string, unknown> {
    return valuesMap[templateId] ?? {};
  }

  function setValues(v: Record<string, unknown>) {
    valuesMap[templateId] = v;
  }

  // Storage
  const storageKey = (tid: string, prefix = STORAGE_PREFIX) => `${prefix}:${tid}`;

  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_META_KEY, JSON.stringify({ templateId }));
      const tpl = getTemplate(templateId);
      localStorage.setItem(
        storageKey(templateId),
        JSON.stringify({ version: tpl.storageVersion, values: valuesMap[templateId] })
      );
    } catch (e) {
      console.error('Error saving to storage:', e);
    }
  };

  const loadFromStorage = () => {
    try {
      // Load meta
      const metaRaw =
        localStorage.getItem(STORAGE_META_KEY) ?? localStorage.getItem(LEGACY_STORAGE_META_KEY);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        if (meta.templateId && TEMPLATES.some((t) => t.id === meta.templateId)) {
          templateId = meta.templateId;
        }
      }

      // Load all template data
      for (const tpl of TEMPLATES) {
        const raw =
          localStorage.getItem(storageKey(tpl.id)) ??
          localStorage.getItem(storageKey(tpl.id, LEGACY_STORAGE_PREFIX));
        if (!raw) continue;
        const data = JSON.parse(raw);
        if (data.version !== tpl.storageVersion) continue;
        if (data.values) {
          valuesMap[tpl.id] = { ...tpl.defaults(), ...data.values };
        }
      }
    } catch (e) {
      console.error('Error loading from storage:', e);
    } finally {
      isReady = true;
    }
  };

  let debounceTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  let pdfBlob: Blob | undefined = $state(undefined);
  let pdf: string | undefined = $state(undefined);
  let compileError: string | undefined = $state(undefined);
  let generationToken = 0;
  let generationQueue = Promise.resolve();

  const getFileName = () => template.getFileName(getValues());

  function setPdfUrl(url: string | undefined) {
    if (pdf && pdf !== url) URL.revokeObjectURL(pdf);
    pdf = url;
  }

  const generatePDF = () => {
    const token = ++generationToken;
    const runTemplate = template;
    const runValues = getValues();
    const fileName = runTemplate.getFileName(runValues);

    generationQueue = generationQueue
      .catch(() => undefined)
      .then(() => runGeneratePDF(token, runTemplate, runValues, fileName));

    return generationQueue;
  };

  const runGeneratePDF = async (
    token: number,
    runTemplate: typeof template,
    runValues: Record<string, unknown>,
    fileName: string
  ) => {
    isGenerating = true;
    try {
      await waitForTypst();
      await runTemplate.prepareAssets?.(runValues);
      const source = runTemplate.generateTypstSource(runValues);
      await typst.addSource('/main.typ', source);
      const data = await typst.pdf();
      packageLoadingState.name = null;
      if (!data) return;
      const blob = new Blob([new Uint8Array(data)], { type: 'application/pdf' });

      if (token !== generationToken) {
        return;
      }

      pdfBlob = blob;
      setPdfUrl(URL.createObjectURL(blob));

      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
        try {
          canShare = navigator.canShare({ files: [file] });
        } catch {
          canShare = false;
        }
      } else {
        canShare = false;
      }

      compileError = undefined;
      saveToStorage();
    } catch (e) {
      if (token === generationToken) {
        compileError = e instanceof Error ? e.message : String(e);
        pdfBlob = undefined;
        setPdfUrl(undefined);
        canShare = false;
      }
      console.error('Error generating PDF:', e);
    } finally {
      if (token === generationToken) {
        isGenerating = false;
      }
    }
  };

  const handleShare = async () => {
    if (!pdfBlob || !canShare) return;
    const file = new File([pdfBlob], getFileName(), { type: 'application/pdf' });
    try {
      await navigator.share({ files: [file] });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      console.error('Error sharing:', e);
    }
  };

  const handleDownload = () => {
    if (!pdf) return;
    triggerDownload(pdf, getFileName());
  };

  /** Schedule a PDF regeneration. Instant for non-text changes, debounced for text. */
  function scheduleGenerate(debounce: boolean) {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    if (debounce) {
      debounceTimeout = setTimeout(generatePDF, 500);
    } else {
      generatePDF();
    }
  }

  // Track template switches – regenerate immediately
  let prevTemplateId: string | undefined;
  $effect(() => {
    if (prevTemplateId !== undefined && templateId !== prevTemplateId) {
      scheduleGenerate(false);
    }
    prevTemplateId = templateId;
  });

  onMount(async () => {
    loadFromStorage();
    if (typeof document !== 'undefined') {
      canDownload = 'download' in document.createElement('a');
    }
    await waitForTypst();
  });

  onDestroy(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    if (pdf) URL.revokeObjectURL(pdf);
  });
</script>

<!-- Hero Section -->
<section class="relative flex flex-col items-center justify-center px-6 pt-12 pb-10">
  <div
    class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-muted)_0%,transparent_70%)]"
  ></div>
  <div class="relative flex flex-col items-center gap-6">
    <div class="mt-2">
      <h1 class="font-sans text-3xl font-bold tracking-tight sm:text-5xl">
        {m.app_name()}
      </h1>
      <p class="text-muted-foreground mt-1 text-sm sm:text-base">
        {m[`subtitle_${pick([1, 3, 4] as const)}`]()}
      </p>
    </div>
  </div>
</section>

<Separator />

<!-- Document Maker Section -->
<section
  class="mx-auto w-full max-w-400 px-4 py-8 sm:px-6 md:flex md:min-h-[calc(100vh-15rem)] md:flex-col md:px-8"
>
  <div class="grid grid-cols-1 gap-6 md:flex-1 md:grid-cols-2 md:grid-rows-[1fr]">
    <!-- Left: Form -->
    <Card class="border-border/50 flex flex-col">
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle class="text-base font-semibold">{m.app_name()}</CardTitle>
          <Tabs.Root
            value={templateId}
            onValueChange={(v) => {
              if (v) templateId = v;
            }}
          >
            <Tabs.List variant="line">
              {#each TEMPLATES as tpl (tpl.id)}
                <Tabs.Trigger value={tpl.id} class="cursor-pointer">{tpl.name()}</Tabs.Trigger>
              {/each}
            </Tabs.List>
          </Tabs.Root>
        </div>
      </CardHeader>
      <CardContent class="flex flex-1 flex-col">
        <DynamicForm
          {template}
          {templateId}
          values={getValues()}
          onchange={(v, opts) => {
            setValues(v);
            scheduleGenerate(opts?.debounce ?? false);
          }}
          onfileschange={() => scheduleGenerate(false)}
          disabled={!isReady}
        />
      </CardContent>
    </Card>

    <!-- Right: PDF Preview -->
    <Card class="border-border/50 flex flex-col">
      <CardHeader class="flex items-center justify-between">
        <CardTitle class="text-base font-semibold">{m.preview()}</CardTitle>
        <div class="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            class="cursor-pointer"
            size="sm"
            onclick={generatePDF}
            disabled={!pdf || isGenerating}
          >
            {#if !pdf || isGenerating}
              <Spinner class="size-4" />
              {m.generating()}
            {:else}
              {m.regenerate()}
            {/if}
          </Button>
          <Button
            variant="outline"
            class="cursor-pointer"
            size="sm"
            onclick={() => window.open(pdf, '_blank')}
            disabled={!pdf}
          >
            {m.open_in_new_tab()}
          </Button>
          {#if canDownload}
            <Button
              variant="outline"
              class="cursor-pointer"
              size="sm"
              onclick={handleDownload}
              disabled={!pdf}
            >
              {m.download()}
            </Button>
          {/if}
          {#if canShare}
            <Button
              variant="outline"
              class="cursor-pointer"
              size="sm"
              onclick={handleShare}
              disabled={!pdf}
            >
              {m.share()}
            </Button>
          {/if}
        </div>
      </CardHeader>
      <CardContent class="min-h-150 flex-1 p-0 pb-0">
        {#if compileError}
          <CompileError error={compileError} />
        {:else if pdf}
          <object
            data={pdf}
            type="application/pdf"
            class="h-full min-h-150 w-full"
            title={m.preview()}
          >
            <p class="text-muted-foreground p-6 text-sm">
              {m.pdf_not_available()}
              <a href={pdf} class="underline">{m.pdf_download()}</a>
            </p>
          </object>
        {:else}
          <div class="flex flex-col items-center justify-center gap-3 p-6 sm:p-8">
            <Spinner class="size-10" />
            {#if packageLoadingState.name}
              <p class="text-muted-foreground text-sm">
                {m.loading_package({ name: packageLoadingState.name })}
              </p>
              <!-- Package download: indeterminate progress bar -->
              <div class="bg-muted h-1.5 w-48 overflow-hidden rounded-full">
                <div
                  class="bg-foreground/40 h-full w-1/3 animate-[progress-slide_1.2s_ease-in-out_infinite] rounded-full"
                ></div>
              </div>
            {:else if loadingState.status}
              <p class="text-muted-foreground text-sm">
                {#if loadingState.status === 'loading_fonts' && downloadProgress.activeFiles.length > 0}
                  {#if downloadProgress.activeFiles.length > 3}
                    {m.loading_fonts_count({ count: String(downloadProgress.activeFiles.length) })}
                  {:else}
                    {m.loading_fonts_named({ files: downloadProgress.activeFiles.join(', ') })}
                  {/if}
                {:else}
                  {m[loadingState.status]()}
                {/if}
              </p>
              {#if loadingState.status === 'loading_fonts' && downloadProgress.progress > 0 && downloadProgress.progress < 1}
                <!-- Font download: determinate progress bar -->
                <div class="bg-muted h-1.5 w-48 overflow-hidden rounded-full">
                  <div
                    class="bg-foreground/60 h-full rounded-full transition-[width] duration-200 ease-out"
                    style="width: {downloadProgress.progress * 100}%"
                  ></div>
                </div>
              {/if}
            {/if}
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</section>
