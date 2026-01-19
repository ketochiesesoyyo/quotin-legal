// src/components/layout/AppLayout.tsx  (ajusta la ruta si tu archivo vive en otro folder)
import * as React from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden">
        <AppSidebar />

        <main className="flex-1 flex min-h-0 flex-col">
          <header className="h-14 border-b flex items-center px-4 bg-background shrink-0">
            <SidebarTrigger />
          </header>

          {/* Este es el contenedor que debe scrollear */}
          <ScrollArea className="flex-1 min-h-0 p-6 bg-muted/30">{children}</ScrollArea>
        </main>
      </div>
    </SidebarProvider>
  );
}
