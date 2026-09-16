// Small form-field primitives local to this tool. `@mmoall/tool-kit`'s ui
// module has no generic text-input equivalent, so these fill that gap in
// the same visual style (same classes as its Select/TextArea) without
// touching the kit itself.

import type { InputHTMLAttributes, ReactNode } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-sm text-[var(--color-fg)] outline-none focus:border-[var(--color-accent)] ${className}`}
      {...props}
    />
  );
}

export interface FieldProps {
  label: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, className = '', children }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium text-[var(--color-muted)] ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export interface CheckboxFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export function CheckboxField({ checked, onChange, label, className = '' }: CheckboxFieldProps) {
  return (
    <label className={`flex items-center gap-1.5 text-sm text-[var(--color-fg)] ${className}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">{children}</div>
  );
}

/** Shared visual grouping for one row of a repeatable list (port, env var, volume, …). */
export const ROW_CLASS = 'flex flex-wrap items-end gap-2 rounded-md border border-[var(--color-border)] p-2';
