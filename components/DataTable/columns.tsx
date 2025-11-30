"use client";
import { MoreHorizontal } from "lucide-react";
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
  uuid: string;
  name: string;
  size: number;
  privacy: boolean;
  type: string;
  date: string;
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
    header: ({ column }) => {
      return (
      <Button
        variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      );
    },
  },
  {
    accessorKey: "size",
    header: ({ column }) => {
      return (
      <Button
        variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Size
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      );
    },
  },
  {
    accessorKey: "privacy",
    header: ({ column }) => {
      return (
      <Button
        variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Private
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "date",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const file = row.original;
      const [isPublic, setIsPublic] = useState(!file.privacy); 

      return (
        <Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              <DropdownMenuItem
                onClick={() => handleDownload(file.uuid, file.name)}
              >
                Download
              </DropdownMenuItem>


              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Share
                </DropdownMenuItem>
              </DialogTrigger>

              <DropdownMenuItem
                onClick={() => handleRemove(file.uuid, file.name)}
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
                handleUpdateShareSettings(file.uuid, isPublic ? 1 : 0);
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
                    defaultValue={`http://localhost:3000/api/files/download/${file.uuid}`}
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
