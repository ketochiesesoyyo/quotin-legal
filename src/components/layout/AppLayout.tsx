import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="h-14 shrink-0 border-b flex items-center px-4 bg-background">
          <SidebarTrigger />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
