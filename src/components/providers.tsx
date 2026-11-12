import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toast } from "@/components/ui/toaster";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}

export function WithToaster({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toast />
    </>
  );
}
