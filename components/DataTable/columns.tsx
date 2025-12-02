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
  const downloadUrl = `/api/files/download/${uuid}`;
  window.location.href = downloadUrl;
  toast.success(`Download of "${filename}" started.`);
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

      return item.kind === "folder" && item.uuid ? (
        <Link
          href={`/dashboard/${item.uuid}`}
          className="flex items-center gap-2 font-semibold text-blue-600"
        >
          <Folder className="w-4 h-4 text-yellow-600" />
          <span>{item.name}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-2">
          <FileIcon className="w-4 h-4" />
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
    cell: ({ row }) => (row.original.kind === "folder" ? "—" : row.original.size),
  },

  {
    accessorKey: "privacy",
    header: "Private",
    cell: ({ row }) =>
      row.original.kind === "folder"
        ? "—"
        : row.original.privacy
        ? "Yes"
        : "No",
  },

  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (row.original.kind === "folder" ? "Folder" : row.original.type),
  },

  {
    accessorKey: "date",
    header: "Date",
  },

  {
    id: "actions",
    cell: ({ row }) => {
      const file = row.original;
      if (file.kind === "folder") return <div className="text-sm text-muted-foreground">—</div>;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuItem onClick={() => handleDownload(file.uuid!, file.name)}>
              Download
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => handleRemove(file.uuid!, file.name)} className="text-red-600">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
