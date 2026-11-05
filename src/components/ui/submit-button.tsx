"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  pendingText?: string;
};

export function SubmitButton({
  children,
  pendingText = "Working…",
  className = "button button-green",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled || pending);

  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      className={className}
      disabled={isDisabled}
      aria-busy={pending}
      data-pending={pending ? "true" : "false"}
    >
      {pending && <span className="button-spinner" aria-hidden="true" />}
      <span>{pending ? pendingText : children}</span>
    </button>
  );
}
