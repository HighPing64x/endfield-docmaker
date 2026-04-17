import logoEndfieldInds from '$lib/assets/logos/endfield-industries.png';
import logoRhodesIsl from '$lib/assets/logos/rhodes-island.svg?raw';
import logoUWST from '$lib/assets/logos/uwst.svg?raw';
import logoTGCC from '$lib/assets/logos/tgcc.svg?raw';
import logoHAS from '$lib/assets/logos/has.svg?raw';

import type { IssuerEntry } from './types';

export const ISSUERS = [
  { key: 'endfield_industries', type: 'png', url: logoEndfieldInds },
  { key: 'has', type: 'svg', raw: logoHAS },
  { key: 'rhodes_island', type: 'svg', raw: logoRhodesIsl },
  { key: 'tgcc', type: 'svg', raw: logoTGCC },
  { key: 'uwst', type: 'svg', raw: logoUWST }
] as const satisfies readonly IssuerEntry[];

/**
 * Shared logo scales set by `typst.svelte.ts` during initialization.
 * Exposed as a module-level mutable reference so templates can read them.
 */
let sharedLogoScales: Record<string, number> = {};
export function getLogoScales(): Record<string, number> {
  return sharedLogoScales;
}
export function setLogoScales(scales: Record<string, number>) {
  sharedLogoScales = scales;
}

/** Get the file extension for a given issuer key. */
export function issuerExt(key: string): string {
  return ISSUERS.find((i) => i.key === key)?.type === 'svg' ? 'svg' : 'png';
}
