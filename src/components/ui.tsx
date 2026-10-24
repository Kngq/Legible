// Small shared pieces. Ink or grey text on soft tints; white text only on strong fills.
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Pop = "accent" | "info" | "attention" | "positive" | "muted";

// Tags use the soft tints with ink text. Strong fills are for large cards only.
const POP: Record<Pop, string> = {
  accent: "bg-accent-soft text-foreground",
  info: "bg-info-soft text-foreground",
  attention: "bg-attention-soft text-foreground",
  positive: "bg-positive-soft text-foreground",
  muted: "bg-surface-muted text-foreground",
};

export function Tag({ pop = "muted", children }: { pop?: Pop; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-small font-semibold ${POP[pop]}`}>{children}</span>;
}

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "text" }) {
  const v = {
    primary: "bg-primary text-primary-foreground disabled:bg-surface-muted disabled:text-muted-foreground min-h-12 px-6 font-semibold",
    secondary: "bg-surface-muted text-foreground hover:bg-border min-h-12 px-5 font-semibold",
    text: "text-foreground underline-offset-4 hover:underline min-h-12 px-3 font-semibold",
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-md text-body transition-colors duration-(--duration) ease-legible disabled:cursor-not-allowed ${FOCUS} ${v} ${className}`}
      {...rest}
    />
  );
}

export { FOCUS };
