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

export default async function Page() {
  const user = await getUserFromToken();
  console.log(user);
  if (!user) {
    redirect("/register");
  }

  return (
    <SidebarProvider>
      <Toaster />
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-xl font-semibold">Обзор Данных</h1>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-card shadow-sm border aspect-video rounded-xl p-4">
              File
              <TablePage />
            </div>
          </div>
          ``
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
