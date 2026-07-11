/**
 * Main-thread client that communicates with the Typst Web Worker.
 *
 * Provides the same public API surface as the previous direct typst.ts
 * integration but all heavy operations run off the main thread.
 */

import fontXiaoBiaoSong from '$lib/assets/fonts/FZXIAOBIAOSONG-B05.TTF?url';
import fontSimFang from '$lib/assets/fonts/SIMFANG.TTF?url';
import fontSimHei from '$lib/assets/fonts/SIMHEI.TTF?url';
import fontSimKai from '$lib/assets/fonts/SIMKAI.TTF?url';
import fontTimesNewRoman from '$lib/assets/fonts/times.ttf?url';
import fontNotoSans from '$lib/assets/fonts/NotoSansCJKsc-Regular.otf?url';
import fontNotoSerif from '$lib/assets/fonts/NotoSerifCJKsc-Regular.otf?url';
import fontSTIXTwoMath from '$lib/assets/fonts/STIXTwoMath-Regular.otf?url';
import fontTeXGyreTermes from '$lib/assets/fonts/texgyretermes-math.otf?url';
import fontJBMono from '$lib/assets/fonts/JetBrainsMono-VariableFont_wght.ttf?url';

import { tintImage, tintSvg, recenterSvg } from '$lib/utils/image';
import { dev } from '$app/environment';
import { base } from '$app/paths';
import { ISSUERS, setLogoScales } from './constants';
import type { IssuerKey, UploadedImage } from './types';
import { loadFontsWithCache, getAllFonts } from '$lib/stores/fonts';

import type { WorkerResponse, LoadingStatus } from '$lib/typst-worker/protocol';

export const DEFAULT_FONTS: { name: string; url: string }[] = [
  { name: 'FZXIAOBIAOSONG-B05.TTF', url: fontXiaoBiaoSong },
  { name: 'SIMFANG.TTF', url: fontSimFang },
  { name: 'SIMHEI.TTF', url: fontSimHei },
  { name: 'SIMKAI.TTF', url: fontSimKai },
  { name: 'times.ttf', url: fontTimesNewRoman },
  { name: 'NotoSansCJKsc-Regular.otf', url: fontNotoSans },
  { name: 'NotoSerifCJKsc-Regular.otf', url: fontNotoSerif },
  { name: 'STIXTwoMath-Regular.otf', url: fontSTIXTwoMath },
  { name: 'texgyretermes-math.otf', url: fontTeXGyreTermes },
  { name: 'JetBrainsMono-VariableFont_wght.ttf', url: fontJBMono }
];

// ── Reactive state ─────────────────────────────────────────────────────

export const loadingState: { status: LoadingStatus } = $state({ status: '' });
export const packageLoadingState: { name: string | null; downloaded: number } = $state({
  name: null,
  downloaded: 0
});

/** Download progress for fonts or any batch download (0 → 1, plus active file names). */
export const downloadProgress: { progress: number; activeFiles: string[] } = $state({
  progress: 0,
  activeFiles: []
});

// ── Worker management ──────────────────────────────────────────────────

/** Create a standalone ArrayBuffer copy of a typed array, safe for transfer. */
function detachBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

let worker: Worker | null = null;
let nextId = 1;
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- internal bookkeeping, not reactive state
const pending = new Map<
  number,
  { resolve: (data?: ArrayBuffer) => void; reject: (e: Error) => void }
>();
let initResolve: (() => void) | null = null;
let initReject: ((e: Error) => void) | null = null;
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- binary asset cache, not UI state
const watermarkAssetCache = new Map<string, Uint8Array>();

const imageExt = (image: UploadedImage | null | undefined): 'svg' | 'png' | 'jpg' => {
  const type = image?.type.toLowerCase() ?? '';
  const name = image?.name.toLowerCase() ?? '';
  if (type.includes('svg') || name.endsWith('.svg')) return 'svg';
  if (type.includes('jpeg') || type.includes('jpg') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return 'jpg';
  }
  return 'png';
};

const hashString = (value: string): string => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

const imageBytes = async (image: UploadedImage): Promise<Uint8Array> => {
  const res = await fetch(image.dataUrl);
  return new Uint8Array(await res.arrayBuffer());
};

const imageText = async (image: UploadedImage): Promise<string> => {
  const res = await fetch(image.dataUrl);
  return await res.text();
};

function attachWorkerHandlers(w: Worker) {
  w.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;

    switch (msg.type) {
      case 'status':
        loadingState.status = msg.status;
        break;

      case 'packageLoading':
        packageLoadingState.name = msg.name;
        packageLoadingState.downloaded = msg.downloaded;
        break;

      case 'initDone':
        isInitialized = true;
        initResolve?.();
        initResolve = null;
        initReject = null;
        break;

      case 'initError':
        initReject?.(new Error(msg.error));
        initResolve = null;
        initReject = null;
        initializationPromise = null;
        break;

      case 'result': {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          p.resolve(msg.data);
        }
        break;
      }

      case 'error': {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          p.reject(new Error(msg.error));
        }
        break;
      }
    }
  };

  w.onerror = (e) => {
    const error = new Error(e.message || 'Typst worker error');
    for (const [id, p] of pending) {
      pending.delete(id);
      p.reject(error);
    }
    initReject?.(error);
    initResolve = null;
    initReject = null;
    initializationPromise = null;
    console.error('Typst worker error:', e);
  };
}

function getWorker(): Worker {
  if (worker) return worker;

  // In dev mode, reuse existing worker across HMR updates
  if (dev) {
    const g = globalThis as typeof globalThis & { __typstWorker?: Worker };
    if (g.__typstWorker) {
      worker = g.__typstWorker;
      attachWorkerHandlers(worker);
      return worker;
    }
  }

  worker = new Worker(new URL('./typst-worker/worker.ts', import.meta.url), {
    type: 'module'
  });

  attachWorkerHandlers(worker);

  if (dev) {
    (globalThis as typeof globalThis & { __typstWorker?: Worker }).__typstWorker = worker;
  }

  return worker;
}

// ── Request helpers ────────────────────────────────────────────────────

function request(
  msg: Record<string, unknown>,
  transfer?: Transferable[]
): Promise<ArrayBuffer | undefined> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...msg, id }, { transfer: transfer ?? [] });
  });
}

// ── Public API ─────────────────────────────────────────────────────────

/** Prepare fonts and logos on the main thread, then send to worker. */
export const initializeTypst = async () => {
  if (initializationPromise) return initializationPromise;

  if (dev) {
    const g = globalThis as typeof globalThis & { __typstWorkerInit?: Promise<void> };
    if (g.__typstWorkerInit) {
      initializationPromise = g.__typstWorkerInit;
      return initializationPromise;
    }
  }

  if (isInitialized) return;

  initializationPromise = (async () => {
    // 1. Load fonts (main thread, with IndexedDB caching + progress tracking)
    loadingState.status = 'loading_fonts';
    downloadProgress.progress = 0;
    downloadProgress.activeFiles = [];

    const fontsVersion: string = __FONTS_VERSION__;
    const defaultFontBlobUrls = await loadFontsWithCache(DEFAULT_FONTS, fontsVersion, (p) => {
      downloadProgress.progress = p.progress;
      downloadProgress.activeFiles = p.activeFiles;
    });

    // Reset download progress after fonts are loaded
    downloadProgress.progress = 0;
    downloadProgress.activeFiles = [];

    // Fetch raw data for each default font (from the blob URLs)
    const defaultFontData = await Promise.all(
      defaultFontBlobUrls.map(async (blobUrl) => {
        const res = await fetch(blobUrl);
        return await res.arrayBuffer();
      })
    );

    // Load custom fonts
    const allCached = await getAllFonts();
    const customFonts = allCached.filter((f) => f.custom);
    const customFontData = customFonts.map((f) => detachBuffer(new Uint8Array(f.data)));

    const fontData = [...defaultFontData, ...customFontData];

    // 2. Process logos (main thread – needs DOM APIs like Image/Canvas)
    const logoScales: Record<string, number> = {};
    const logoMappings: { path: string; data: ArrayBuffer }[] = [];

    await Promise.all(
      ISSUERS.map(async (issuer) => {
        if (issuer.type === 'svg') {
          const { svg: recentered, scale } = await recenterSvg(issuer.raw);
          logoScales[issuer.key] = scale;
          const redTinted = tintSvg(recentered, [220, 0, 0]);
          const blackTinted = tintSvg(issuer.raw, [0, 0, 0], 0.25);
          logoMappings.push(
            {
              path: `/stamp-${issuer.key}.svg`,
              data: detachBuffer(redTinted)
            },
            {
              path: `/watermark-${issuer.key}.svg`,
              data: detachBuffer(blackTinted)
            }
          );
        } else {
          const [{ image: redTinted, scale }, { image: blackTinted }] = await Promise.all([
            tintImage(issuer.url, [210, 0, 0], 1, true),
            tintImage(issuer.url, [0, 0, 0], 0.25)
          ]);
          logoScales[issuer.key] = scale;
          logoMappings.push(
            {
              path: `/stamp-${issuer.key}.png`,
              data: detachBuffer(redTinted)
            },
            {
              path: `/watermark-${issuer.key}.png`,
              data: detachBuffer(blackTinted)
            }
          );
        }
      })
    );

    setLogoScales({ ...logoScales });

    // 3. Send everything to the worker
    const w = getWorker();
    const transfer = [...fontData, ...logoMappings.map((m) => m.data)];

    await new Promise<void>((resolve, reject) => {
      initResolve = resolve;
      initReject = reject;
      w.postMessage(
        {
          type: 'init',
          fontData,
          logoMappings,
          isDev: dev,
          basePath: base
        },
        { transfer }
      );
    });
  })();

  if (dev) {
    (globalThis as typeof globalThis & { __typstWorkerInit?: Promise<void> }).__typstWorkerInit =
      initializationPromise;
  }

  return initializationPromise;
};

export const waitForTypst = async () => {
  if (isInitialized) return;
  if (initializationPromise) {
    await initializationPromise;
  } else {
    await initializeTypst();
  }
};

// ── Proxy methods matching the old `typst` default export ──────────────

async function addSource(path: string, content: string): Promise<void> {
  await request({ type: 'addSource', path, content });
}

async function mapShadow(path: string, data: Uint8Array): Promise<void> {
  const buf = detachBuffer(data);
  await request({ type: 'mapShadow', path, data: buf }, [buf]);
}

async function unmapShadow(path: string): Promise<void> {
  await request({ type: 'unmapShadow', path });
}

export async function prepareWatermarkAsset(issuerKey: IssuerKey, opacityPercent: number) {
  await waitForTypst();
  const issuer = ISSUERS.find((i) => i.key === issuerKey);
  if (!issuer) return;

  const opacity = Math.max(0, Math.min(100, opacityPercent)) / 100;
  const cacheKey = `${issuerKey}:${opacity.toFixed(3)}`;
  let data = watermarkAssetCache.get(cacheKey);

  if (!data) {
    if (issuer.type === 'svg') {
      const { svg } = await recenterSvg(issuer.raw);
      data = tintSvg(svg, [0, 0, 0], opacity);
    } else {
      data = (await tintImage(issuer.url, [0, 0, 0], opacity, true)).image;
    }
    watermarkAssetCache.set(cacheKey, data);
  }

  await mapShadow(`/watermark-${issuerKey}.${issuer.type}`, data);
}

export const customWatermarkExt = (image: UploadedImage | null | undefined) =>
  imageExt(image) === 'svg' ? 'svg' : 'png';

export const customStampExt = (image: UploadedImage | null | undefined) => imageExt(image);

export async function prepareCustomWatermarkAsset(
  image: UploadedImage | null | undefined,
  opacityPercent: number
) {
  if (!image) return;
  await waitForTypst();

  const opacity = Math.max(0, Math.min(100, opacityPercent)) / 100;
  const ext = customWatermarkExt(image);
  const cacheKey = `custom-watermark:${hashString(image.dataUrl)}:${opacity.toFixed(3)}`;
  let data = watermarkAssetCache.get(cacheKey);

  if (!data) {
    if (imageExt(image) === 'svg') {
      const { svg } = await recenterSvg(await imageText(image));
      data = tintSvg(svg, [0, 0, 0], opacity);
    } else {
      data = (await tintImage(image.dataUrl, [0, 0, 0], opacity, true)).image;
    }
    watermarkAssetCache.set(cacheKey, data);
  }

  await mapShadow(`/watermark-custom.${ext}`, data);
}

export async function prepareCustomStampAsset(image: UploadedImage | null | undefined) {
  if (!image) return;
  await waitForTypst();
  await mapShadow(`/stamp-custom.${customStampExt(image)}`, await imageBytes(image));
}

async function pdf(): Promise<Uint8Array | undefined> {
  const buf = await request({ type: 'pdf' });
  return buf ? new Uint8Array(buf) : undefined;
}

/**
 * Proxy object that provides the same method interface as the old
 * `$typst` default export, so call-sites need minimal changes.
 */
const typstProxy = { addSource, mapShadow, unmapShadow, pdf };

export default typstProxy;
