"use client";

import * as React from "react";
import { ChevronsUpDown, Plus, Upload, FolderPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRefreshSignal } from "@/lib/useRefreshSignal";

interface UploadfileProps {
  folderUuid: string;
}

export function Uploadfile({ folderUuid }: UploadfileProps) {
  const { isMobile } = useSidebar();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [folderName, setFolderName] = React.useState("");

  const triggerRefresh = useRefreshSignal();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const toastId = toast.loading("Uploading...", {
      description: "Please wait",
    });

    try {
      const response = await fetch(`/api/files/upload/${folderUuid}`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      await response.json();

      toast.success("Success", { id: toastId, description: "File uploaded successfully" });

      triggerRefresh(); 
    } catch (error) {
      toast.error("Error", { id: toastId, description: "File upload failed" });
    } finally {
      e.target.value = "";
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;

    const toastId = toast.loading("Creating folder...", { description: "Please wait" });

    try {
      const response = await fetch(`/api/folders/createFolder/${folderUuid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName.trim() }),
      });
      if (!response.ok) throw new Error("Folder creation failed");
      const data = await response.json();

      toast.success(`Folder "${data.name}" created`, { id: toastId });
      setFolderName("");
      setIsDialogOpen(false);

      triggerRefresh();
    } catch (error) {
      toast.error("Folder creation failed", { id: toastId });
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Plus className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">New</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="w-60"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel>New File</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleUploadClick();
                }}
              >
                <Upload className="mr-2 size-4" />
                <span>Upload File</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setIsDialogOpen(true);
                }}
              >
                <FolderPlus className="mr-2 size-4" />
                <span>Create Folder</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            autoFocus
          />

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
