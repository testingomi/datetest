import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Cache control helper
export function setCacheControl(data: any) {
  if (typeof window !== 'undefined') {
    const timestamp = new Date().getTime();
    return { ...data, _timestamp: timestamp };
  }
  return data;
}

// Suppress non-critical network errors
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('net::ERR_CONNECTION_CLOSED') &&
      event.reason?.message?.includes('cdn-cgi/rum')) {
    event.preventDefault();
  }
});
