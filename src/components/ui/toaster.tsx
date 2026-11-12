"use client";

import * as React from "react";
import { Toaster as Sonner } from "sonner";

export function Toast() {
  return <Sonner position="bottom-right" richColors />
}

export function useToast() {
  return {
    toast: () => {},
  };
}
