import type { Component } from 'svelte';

/** Base definition shared by all form fields. */
interface BaseField {
  /** Unique key used as the data property name. */
  key: string;
  /** Localised label shown in the UI. */
  label: () => string;
  /**
   * Number of CSS grid columns this field spans.
   * Defaults to the full row width when omitted.
   */
  colspan?: number;
}

export interface TextField extends BaseField {
  type: 'text';
  placeholder?: () => string;
}

export interface TextareaField extends BaseField {
  type: 'textarea';
  placeholder?: () => string;
  /** When `true` the field uses `flex-1` to fill remaining space. */
  grow?: boolean;
}

export interface SelectField extends BaseField {
  type: 'select';
  options: { value: string; label: () => string }[];
  placeholder?: () => string;
}

export interface NumberField extends BaseField {
  type: 'number';
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface ToggleField extends BaseField {
  type: 'toggle';
  description?: () => string;
}

export interface DateField extends BaseField {
  type: 'date';
}

export interface AuthoritiesField extends BaseField {
  type: 'authorities';
  maxItems?: number;
}

export interface KvGridField extends BaseField {
  type: 'kv-grid';
}

export interface PrefixedInputField extends BaseField {
  type: 'prefixed-input';
  prefixKey: string;
  prefixes: { value: string; label: () => string }[];
  placeholder?: () => string;
}

export interface CustomField extends BaseField {
  type: 'custom';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<any>;
}

export type FormField =
  | TextField
  | TextareaField
  | SelectField
  | NumberField
  | ToggleField
  | DateField
  | AuthoritiesField
  | KvGridField
  | PrefixedInputField
  | CustomField;

/** A complete template definition. */
export interface TemplateDefinition {
  /** Unique identifier (used as storage key suffix). */
  id: string;
  /** Localised display name. */
  name: () => string;
  /** CSS grid column count at the `sm` breakpoint (defaults to 3). */
  gridCols?: number;
  /** Ordered list of form fields. */
  fields: FormField[];
  /** Factory that returns the initial/default form values. */
  defaults: () => Record<string, unknown>;
  /** Build a Typst source string from the current form values. */
  generateTypstSource: (values: Record<string, unknown>) => string;
  /** Build a human-friendly file name from the current form values. */
  getFileName: (values: Record<string, unknown>) => string;
  /** Bumped whenever the storage shape changes. */
  storageVersion: number;
}
