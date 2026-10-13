import * as React from "react";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-neutral-200/90 bg-white p-6 text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
