import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import TablePage from "@/components/DataTable/dataUI";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import { getUserFromToken } from "@/lib/auth";
import { BreadcrumbWithApi } from "@/components/ui/BreadcrumbForPage";

interface PageProps {
  params: Promise<{ uuid: string }>;
}

export default async function Page({ params }: PageProps) {
  const user = await getUserFromToken();
  if (!user) redirect("/register");

  const { uuid: folderUuid } = await params;

  return (
    <SidebarProvider>
      <Toaster />
      <AppSidebar folderUuid={folderUuid} />

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background">
          <div className="flex items-center gap-3 px-6">
            <SidebarTrigger className="-ml-1" />
            <BreadcrumbWithApi folderUuid={folderUuid}></BreadcrumbWithApi>
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <TablePage folderUuid={folderUuid} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
