import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { BrowserRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <AIAssistantProvider>
          <App />
          <Toaster />
        </AIAssistantProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
