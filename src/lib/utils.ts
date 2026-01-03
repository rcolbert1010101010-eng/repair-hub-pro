import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(input?: string | null): string {
  if (!input) return '';
  return input.replace(/\D/g, '');
}
