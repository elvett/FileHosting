"use client";
import { MoreHorizontal, Folder, FileIcon, ArrowUpDown } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import Link from "next/link";
import { handler } from "next/dist/build/templates/app-page";

export type File = {
  uuid: string | null;
  name: string;
  size: string;
  privacy: boolean;
  type: string;
  date: string;
  kind: "file" | "folder";
};

const handleDownload = (uuid: string, filename: string) => {
  const downloadUrl = `/api/files/download/${uuid}`;
  window.location.href = downloadUrl;
  toast.success(`Download of "${filename}" started.`);
};

const handlePreview = async (uuid: string, filename: string) => {
  const previewApiUrl = `/api/files/preview/${uuid}`;

  try {
    const response = await fetch(previewApiUrl);
    if (!response.ok) {
      const errorData = await response.json();
      toast.error(
        errorData.error || `Failed to get preview link for "${filename}".`
      );
      return;
    }

    const data = await response.json();
    if (data.url) {
      window.open(data.url, "_blank");
      toast.info(`Opening preview for "${filename}"...`);
    } else {
      toast.error(`Invalid preview link received for "${filename}".`);
    }
  } catch (error) {
    console.error("Error generating preview link:", error);
    toast.error("An error occurred while generating the preview link.");
  }
};

const handleUpdateShareSettings = async (uuid: string, isPublic: boolean) => {
  const setprivacy = isPublic ? 0 : 1;
  const url = `/api/files/update-privacy/${uuid}/${setprivacy}`;
  try {
    const response = await fetch(url, { method: "POST" });
    if (response.ok) {
      toast.success(`Share settings updated.`);
    } else {
      toast.error("Failed to update share settings.");
    }
  } catch (error) {
    console.error("Error updating share settings:", error);
    toast.error("An error occurred during update.");
  }
};

const handleRemove = async (uuid: string, filename: string) => {
  try {
    const res = await fetch(`/api/files/remove/${uuid}`, { method: "DELETE" });
    if (res.ok) toast.success(`File "${filename}" removed successfully.`);
    else toast.error("Failed to remove file.");
  } catch (err) {
    toast.error("An error occurred during removal.");
  }
};

const handleFolderRemove = async (uuid: string, filename: string) => {
  try {
    const res = await fetch(`/api/folders/removeFolder/${uuid}`, {
      method: "DELETE",
    });
    if (res.ok) toast.success(`Folder "${filename}" removed successfully.`);
    else toast.error("Failed to remove folder.");
  } catch (err) {
    toast.error("An error occurred during folder removal.");
  }
};

export const columns = (refetch: () => void): ColumnDef<File>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const item = row.original;
      const fileUuid = item.uuid;

      if (!fileUuid) {
        return (
          <div className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            <span>{item.name}</span>
          </div>
        );
      }

      if (item.kind === "folder") {
        return (
          <Link
            href={`/dashboard/${fileUuid}`}
            className="flex items-center gap-2 font-semibold text-blue-600"
          >
            <Folder className="w-4 h-4 text-yellow-600" />
            <span>{item.name}</span>
          </Link>
        );
      }

      return (
        <Button
          variant="link"
          className="p-0 h-auto justify-start text-inherit hover:no-underline"
          onClick={() => handlePreview(fileUuid, item.name)}
        >
          <div className="flex items-center gap-2">
            <FileIcon className="w-4 h-4" />
            <span>{item.name}</span>
          </div>
        </Button>
      );
    },
  },

  {
    accessorKey: "size",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Size
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) =>
      row.original.kind === "folder" ? "—" : row.original.size,
  },

  {
    accessorKey: "privacy",
    header: "Public",
    cell: ({ row }) =>
      row.original.kind === "folder"
        ? "—"
        : row.original.privacy
        ? "No"
        : "Yes",
  },

  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) =>
      row.original.kind === "folder" ? "Folder" : row.original.type,
  },

  {
    accessorKey: "date",
    header: "Date",
  },

  {
    id: "actions",
    cell: ({ row }) => {
      const file = row.original;

 
      if (file.kind === "folder") {
        if (!file.uuid)
          return <div className="text-sm text-muted-foreground">Error</div>;

        const folderUuid = file.uuid as string;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
          </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Folder Actions</DropdownMenuLabel>

              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={async () => {
                await handleFolderRemove(folderUuid, file.name)
                refetch();
              }}
              >
                Delete Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }

      const [isPublic, setIsPublic] = useState(!file.privacy);

      if (!file.uuid)
        return <div className="text-sm text-muted-foreground">Error</div>;

      const fileUuid = file.uuid as string;
      const publicLink = `${window.location.origin}/api/files/download/${fileUuid}`;

      return (
        <Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuItem
                onClick={async () => {
                  await handleDownload(fileUuid, file.name)
                refetch();
              }}
                
              >
                Download
              </DropdownMenuItem>

              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Share
                </DropdownMenuItem>
              </DialogTrigger>

              <DropdownMenuItem
               onClick={async () => {
                  await handleRemove(fileUuid, file.name)
                refetch();
              }}

                className="text-red-600 focus:text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Share File: {file.name}</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await handleUpdateShareSettings(fileUuid, isPublic);
                refetch();
              }}
            >
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="link-1" className="text-left">
                    Public Link
                  </Label>
                  <Input
                    id="link-1"
                    name="link"
                    defaultValue={publicLink}
                    readOnly
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="privacy-mode"
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(checked)}
                  />
                  <Label htmlFor="privacy-mode">
                    Make public (Anyone with the link can view)
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Close
                  </Button>
                </DialogClose>
                <Button type="submit">Update Share Settings</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      );
    },
  },
];
