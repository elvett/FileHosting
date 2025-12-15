"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ChevronsUpDown,
  Plus,
  Upload,
  FolderPlus,
  FolderUp,
} from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  const triggerRefresh = useRefreshSignal();

  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleUploadFolderClick = useCallback(() => {
    if (folderInputRef.current) {
      folderInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      const toastId = toast.loading("Uploading file...", {
        description: "Please wait",
      });

      try {
        const response = await fetch(`/api/fs/files/upload/${folderUuid}`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Upload failed");
        }

        toast.success("Success", {
          id: toastId,
          description: "File uploaded successfully",
        });

        triggerRefresh();
      } catch (error: any) {
        toast.error("Error", {
          id: toastId,
          description: error.message || "File upload failed",
        });
      } finally {
        if (e.target) {
          e.target.value = "";
        }
      }
    },
    [folderUuid, triggerRefresh],
  );

  const handleFolderChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const formData = new FormData();
      let fileCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const webkitPath = (file as any).webkitRelativePath;
        const relativePath = webkitPath || file.name;

        formData.append(`file_${i}`, file);
        formData.append(`file_${i}_path`, relativePath);
        fileCount++;
      }

      const toastId = toast.loading("Uploading folder...", {
        description: `Uploading ${fileCount} files`,
      });

      try {
        const response = await fetch(`/api/fs/folders/upload/${folderUuid}`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Folder upload failed");
        }

        toast.success("Success", {
          id: toastId,
          description: data.message || "Folder uploaded successfully",
        });

        triggerRefresh();
      } catch (error: any) {
        toast.error("Error", {
          id: toastId,
          description: error.message || "Folder upload failed",
        });
      } finally {
        if (e.target) {
          e.target.value = "";
        }
      }
    },
    [folderUuid, triggerRefresh],
  );

  const handleCreateFolder = useCallback(async () => {
    const trimmedName = folderName.trim();
    if (!trimmedName) return;

    const toastId = toast.loading("Creating folder...", {
      description: "Please wait",
    });

    try {
      const response = await fetch(
        `/api/fs/folders/createFolder/${folderUuid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Folder creation failed");
      }

      toast.success("Folder created", { id: toastId });
      setFolderName("");
      setIsDialogOpen(false);

      triggerRefresh();
    } catch (error: any) {
      toast.error(error.message || "Folder creation failed", { id: toastId });
    }
  }, [folderName, folderUuid, triggerRefresh]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <input
        ref={folderInputRef}
        type="file"
        style={{ display: "none" }}
        multiple
        onChange={handleFolderChange}
        {...({
          webkitdirectory: "",
          directory: "",
          mozdirectory: "",
        } as any)}
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
              <DropdownMenuLabel>Upload</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleUploadClick();
                }}
              >
                <Upload className="mr-2 size-4" />
                <span>Upload File</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleUploadFolderClick();
                }}
              >
                <FolderUp className="mr-2 size-4" />
                <span>Upload Folder</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Create</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  setIsDialogOpen(true);
                }}
              >
                <FolderPlus className="mr-2 size-4" />
                <span>New Folder</span>
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateFolder();
              }
            }}
            autoFocus
          />

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} type="button">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
