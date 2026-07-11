import logoBusinessAssociation from '$lib/assets/logos/business-association.svg?raw';
import logoGeneralOffice from '$lib/assets/logos/general-office.png';
import logoPublicAffairs from '$lib/assets/logos/public-affairs.svg?raw';
import logoScienceInstitute from '$lib/assets/logos/science-institute.svg?raw';
import logoWorkersAssociation from '$lib/assets/logos/workers-association.svg?raw';

import type { IssuerEntry } from './types';

export const ISSUERS = [
  { key: 'general_office', type: 'png', url: logoGeneralOffice },
  { key: 'science_institute', type: 'svg', raw: logoScienceInstitute },
  { key: 'public_affairs', type: 'svg', raw: logoPublicAffairs },
  { key: 'business_association', type: 'svg', raw: logoBusinessAssociation },
  { key: 'workers_association', type: 'svg', raw: logoWorkersAssociation }
] as const satisfies readonly IssuerEntry[];

const LEGACY_ISSUER_KEYS = Object.fromEntries([
  [`${'end'}field_industries`, 'general_office'],
  ['has', 'science_institute'],
  [`${'rho'}des_island`, 'public_affairs'],
  ['tgcc', 'business_association'],
  ['uwst', 'workers_association']
]) as Record<string, (typeof ISSUERS)[number]['key']>;

export function normalizeIssuerKey(key: unknown): (typeof ISSUERS)[number]['key'] {
  const value = String(key ?? '');
  if (ISSUERS.some((issuer) => issuer.key === value)) {
    return value as (typeof ISSUERS)[number]['key'];
  }
  return LEGACY_ISSUER_KEYS[value] ?? ISSUERS[0].key;
}

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
