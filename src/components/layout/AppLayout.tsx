import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="h-14 shrink-0 border-b flex items-center px-4 bg-background">
            <SidebarTrigger />
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-6 bg-muted/30">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
