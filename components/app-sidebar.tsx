"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Uploadfile } from "./uploadButton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getUserFromToken } from "@/lib/auth";

const navMain = [
  {
    title: "Main",
    url: "#",
    icon: SquareTerminal,
  },
  {
    title: "Models",
    url: "#",
    icon: Bot,
  },
  {
    title: "Documentation",
    url: "#",
    icon: BookOpen,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  folderUuid: string;
}

interface UserData {
  name: string;
}

export function AppSidebar({ folderUuid, ...props }: AppSidebarProps) {
  const [user, setUser] = React.useState<UserData | null>(null);

  React.useEffect(() => {
    let mounted = true;

    fetch("/api/user/getData", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load user");
        return res.json();
      })
      .then((data) => {
        if (mounted && data?.user?.uniqName) {
          setUser({ name: data.user.uniqName });
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Uploadfile folderUuid={folderUuid}></Uploadfile>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
