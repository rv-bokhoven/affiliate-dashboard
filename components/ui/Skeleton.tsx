// components/ui/Skeleton.tsx
import React from 'react';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-neutral-800/50 ${className}`}
      {...props}
    />
  );
}