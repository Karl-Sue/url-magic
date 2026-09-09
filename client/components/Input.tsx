"use client"

import type { ChangeEvent, KeyboardEvent } from "react";

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
};

export function Input({
  value, 
  onChange, 
  onKeyDown, 
  placeholder,
  autoFocus = false,
  ariaLabel,
}: InputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      className="url-input"
    />
  );
}