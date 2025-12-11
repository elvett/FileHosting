"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SlashIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import React from "react";

interface BreadcrumbNode {
  uuid: string;
  name: string;
}

interface BreadcrumbWithApiProps {
  folderUuid: string;
}

export function BreadcrumbWithApi({ folderUuid }: BreadcrumbWithApiProps) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPath() {
      setLoading(true);
      try {
        const res = await fetch(`/api/fs/folders/getPath/${folderUuid}`);
        const data = await res.json();
        if (data.success) {
          setBreadcrumbs(data.path);
        } else {
          console.error("Error fetching breadcrumbs:", data.error);
        }
      } catch (err) {
        console.error("Network error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (folderUuid) fetchPath();
  }, [folderUuid]);

  if (loading) return <div>Loading breadcrumbs...</div>;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.uuid}>
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{item.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={`/dashboard/${item.uuid}`}>{item.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && (
              <BreadcrumbSeparator>
                <SlashIcon />
              </BreadcrumbSeparator>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
