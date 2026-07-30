import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDualStock(stock: number, unit: string, category?: string) {
  const isWeightBased = category === 'রড' || unit === 'কেজি' || unit === 'টন';

  if (!isWeightBased) {
    return { main: `${stock} ${unit}`, sub: null };
  }

  let totalKg = 0;
  let totalTons = 0;

  if (unit === 'টন') {
    totalTons = Number(stock) || 0;
    totalKg = totalTons * 1000;
  } else {
    totalKg = Number(stock) || 0;
    totalTons = totalKg / 1000;
  }

  const tonsFormatted = Number.isInteger(totalTons) ? totalTons.toString() : totalTons.toFixed(3).replace(/\.?0+$/, '');

  return {
    main: `${tonsFormatted} টন`,
    sub: `(${totalKg.toLocaleString()} কেজি)`,
    totalKg,
    totalTons
  };
}

export function fixMiliName(name?: string): string {
  if (!name) return '';
  return name.replace(/মিমি/g, 'মিলি').replace(/mimi/gi, 'mili');
}
