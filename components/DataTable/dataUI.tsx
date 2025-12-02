"use client";

import { useEffect, useState } from "react";
import { DataTable } from "./data-table";
import { columns, File } from "./columns";

export default function TablePage() {
  const [data, setData] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch("/api/files/getFileList");
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
          uuid: null,
          type: "folder",
          size: formatSize(f.size),
          date: formatDate(f.date),
        }));

        setData([...folders, ...files]);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchFiles();
  }, []);

  if (loading) return <div className="p-4">Loading files...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
}

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
