"use client";
import { MoreHorizontal, Folder, FileIcon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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

export type File = {
  uuid: string | null;
  name: string;
  size: string;
  privacy: boolean;
  type: string;
  date: string;
  kind: "file" | "folder";   // ❤️ Новое поле
};

const handleDownload = (uuid: string, filename: string) => {
  const downloadUrl = `/api/files/download/${uuid}`;
  window.location.href = downloadUrl;
  toast.success(`Download of "${filename}" started.`);
};

const handleUpdateShareSettings = async (uuid: string, setprivacy: number) => {
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
  const url = `/api/files/remove/${uuid}`;
  try {
    const response = await fetch(url, { method: "DELETE" });
    if (response.ok) {
      toast.success(`File "${filename}" removed successfully.`);
    } else {
      toast.error("Failed to remove file.");
    }
  } catch (error) {
    console.error("Error removing file:", error);
    toast.error("An error occurred during removal.");
  }
};

export const columns: ColumnDef<File>[] = [
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

      return (
        <div className="flex items-center gap-2">
          {item.kind === "folder" ? (
            <Folder className="w-4 h-4 text-yellow-600" />
          ) : (
            <FileIcon className="w-4 h-4" />
          )}
          <span>{item.name}</span>
        </div>
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
    cell: ({ row }) => {
      const item = row.original;

      return item.kind === "folder" ? "—" : item.size;
    },
  },

  {
    accessorKey: "privacy",
    header: "Private",
    cell: ({ row }) => {
      const item = row.original;

      return item.kind === "folder"
        ? "—"
        : item.privacy
        ? "Yes"
        : "No";
    },
  },

  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      return row.original.kind === "folder"
        ? "Folder"
        : row.original.type;
    },
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
        return (
          <div className="text-sm text-muted-foreground">
            —
          </div>
        );
      }

      const [isPublic, setIsPublic] = useState(!file.privacy);

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
                onClick={() => handleDownload(file.uuid!, file.name)}
              >
                Download
              </DropdownMenuItem>

              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Share
                </DropdownMenuItem>
              </DialogTrigger>

              <DropdownMenuItem
                onClick={() => handleRemove(file.uuid!, file.name)}
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
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateShareSettings(file.uuid!, isPublic ? 1 : 0);
              }}
            >
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Public Link</Label>
                  <Input
                    defaultValue={`http://localhost:3000/api/files/download/${file.uuid}`}
                    readOnly
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(checked)}
                  />
                  <Label>Make public</Label>
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button type="submit">Update</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      );
    },
  },
];
