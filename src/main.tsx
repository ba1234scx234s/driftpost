import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import "./index.css";
import App from "./App";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// A few more themes existed briefly; anyone on one of those goes back to following the device.
try {
  const saved = localStorage.getItem("theme");
  if (saved && !["light", "dark", "system"].includes(saved)) localStorage.setItem("theme", "system");
} catch {
  // Storage can be blocked; next-themes then just uses the default.
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <App />
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
