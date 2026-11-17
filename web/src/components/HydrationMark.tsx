"use client";
import { useEffect } from "react";
/** Marks the document once React has hydrated (used by end-to-end tests). */
export function HydrationMark() {
  useEffect(() => { document.documentElement.dataset.hydrated = "1"; }, []);
  return null;
}
