import { officialDocTemplate } from './official-doc';
import { testpaperTemplate } from './testpaper';
import type { TemplateDefinition } from './types';

export const TEMPLATES: TemplateDefinition[] = [testpaperTemplate, officialDocTemplate];

export const getTemplate = (id: string): TemplateDefinition =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export type { TemplateDefinition } from './types';
export type { FormField } from './types';
