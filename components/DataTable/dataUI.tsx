"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { DataTable } from "./data-table";
import { columns, File } from "./columns";
import { Input } from "@/components/ui/input";
import { Search, Folder, FileIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRefreshSignal } from "@/lib/useRefreshSignal";

interface TablePageProps {
  folderUuid: string;
}

export default function TablePage({ folderUuid }: TablePageProps) {
  const [data, setData] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "folder" | "file">(
    "all",
  );

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/files/getList/${folderUuid}`);
      if (!res.ok) throw new Error(`Error: ${res.status}`);
      const json = await res.json();

      const files = (json.files || []).map((f: any) => ({
        ...f,
        kind: "file",
        date: formatDate(f.date),
        size: formatSize(f.size),
      }));

      const folders = (json.folders || []).map((f: any) => ({
        ...f,
        kind: "folder",
        type: "folder",
        size: formatSize(f.size),
        date: formatDate(f.date),
      }));

      setData([...folders, ...files]);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [folderUuid]);
  useRefreshSignal(fetchFiles);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "folder" && item.kind === "folder") ||
        (typeFilter === "file" && item.kind === "file");
      return matchesSearch && matchesType;
    });
  }, [data, searchQuery, typeFilter]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        Loading files...
      </div>
    );
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v: any) => setTypeFilter(v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All items</SelectItem>
              <SelectItem value="folder">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-yellow-500" />
                  Folders
                </div>
              </SelectItem>
              <SelectItem value="file">
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4 text-blue-500" />
                  Files
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <DataTable columns={columns(fetchFiles)} data={filteredData} />
      </div>
    </div>
  );

  function formatDate(date: string | number) {
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU");
  }

  function formatSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
