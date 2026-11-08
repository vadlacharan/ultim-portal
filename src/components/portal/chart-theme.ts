"use client";

import { useTheme } from "next-themes";

export function useChartChrome() {
  const { resolvedTheme } = useTheme();
  const light = resolvedTheme === 'light';
  return {
    grid: light ? 'rgba(10,11,13,0.08)' : 'rgba(255,255,255,0.06)',
    tick: light ? 'rgba(10,11,13,0.55)' : 'rgba(255,255,255,0.45)',
    tickStrong: light ? 'rgba(10,11,13,0.65)' : 'rgba(255,255,255,0.55)',
    cursor: light ? 'rgba(10,11,13,0.04)' : 'rgba(255,255,255,0.04)',
  };
}
