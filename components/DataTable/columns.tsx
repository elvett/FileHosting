"use client";

import {
  MoreHorizontal,
  Folder,
  FileText,
  ArrowUpDown,
  Download,
  Share2,
  Trash2,
} from "lucide-react";

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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { useState } from "react";
import Link from "next/link";

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
  const downloadUrl = `/api/fs/files/download/${uuid}`;
  window.location.href = downloadUrl;
  toast.success(`Download of "${filename}" started.`);
};

const handlePreview = async (uuid: string, filename: string) => {
  try {
    const res = await fetch(`/api/fs/files/preview/${uuid}`);
    const data = await res.json();

    if (!res.ok || !data.url) {
      toast.error(`Failed to open preview for "${filename}"`);
      return;
    }

    window.open(data.url, "_blank");
  } catch {
    toast.error("Preview error");
  }
};

export const columns = (refetch: () => void): ColumnDef<File>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-0 font-medium"
      >
        Name <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const item = row.original;

      if (item.kind === "folder") {
        return (
          <Link
            href={`/dashboard/${item.uuid}`}
            className="flex items-center gap-2 font-semibold text-blue-600"
          >
            <Folder className="w-4 h-4 text-yellow-600" />
            {item.name}
          </Link>
        );
      }

      return (
        <button
          onClick={() => item.uuid && handlePreview(item.uuid, item.name)}
          className="flex items-center gap-3 text-left hover:text-foreground"
        >
          <FileText className="h-5 w-5 text-blue-600" />
          <span className="font-medium truncate max-w-96">{item.name}</span>
        </button>
      );
    },
  },

  {
    accessorKey: "size",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-0"
      >
        Size <ArrowUpDown className="ml-2 h-3 w-3" />
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
      const item = row.original;
      if (!item.uuid) return null;

      const [shareOpen, setShareOpen] = useState(false);
      const [isPublic, setIsPublic] = useState(!item.privacy);

      const updatePrivacy = async () => {
        await fetch(
          `/api/fs/files/update-privacy/${item.uuid}/${isPublic ? 0 : 1}`,
          { method: "POST" },
        );

        toast.success("Share settings updated.");
        refetch();
        setShareOpen(false);
      };

      const removeItem = async () => {
        const endpoint =
          item.kind === "folder"
            ? "/api/fs/folders/removeFolder"
            : "/api/fs/files/remove";

        await fetch(`${endpoint}/${item.uuid}`, { method: "DELETE" });

        toast.success(
          item.kind === "folder" ? "Folder removed" : "File removed",
        );
        refetch();
      };

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              {item.kind === "file" && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleDownload(item.uuid!, item.name)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => setShareOpen(true)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuItem
                onClick={removeItem}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {item.kind === "file" && (
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share: {item.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <Label>Public link</Label>
                    <Input
                      readOnly
                      value={`${window.location.origin}/api/fs/files/download/${item.uuid}`}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                    <Label>Make public (Anyone with the link can view)</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={updatePrivacy}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      );
    },
  },
];
