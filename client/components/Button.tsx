"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  children?: ReactNode;
  variant?: "primary" | "ghost";
  small?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function Button({
  children, 
  variant = "primary", 
  small = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`button button--${variant}${small ? " button--small" : ""}`}
    >
      {children}
    </button>
  )
}