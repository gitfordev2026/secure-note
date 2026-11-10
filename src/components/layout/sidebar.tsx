"use client";

import * as React from "react";
import { Sun, Moon, Settings, LogOut, ShieldCheck, Users, FileText, LayoutDashboard, Pin, Archive, Menu, X } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isAdmin?: boolean;
}

const userNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "All Notes", href: "/notes", icon: FileText },
  { name: "Pinned", href: "/pinned", icon: Pin },
  { name: "Archived", href: "/archived", icon: Archive },
  { name: "Settings", href: "/settings", icon: Settings },
];

const adminNav = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "All Notes", href: "/admin/notes", icon: FileText },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function Sidebar({ isAdmin = false }: SidebarProps) {
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const items = isAdmin ? adminNav : userNav;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-background border-r border-input z-50 flex flex-col">
      <div className="flex items-center justify-between h-16 px-6 border-b border-input">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
            N
          </div>
          <span className="font-semibold text-lg tracking-tight">NoteApp</span>
        </div>
        <button className="md:hidden text-muted-foreground hover:text-foreground">
          <X className="h-6 w-6" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-input">
        <ThemeToggle />
        <div className="mt-4">
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Link>
        </div>
      </div>
    </aside>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors border border-input"
    >
      <div className="flex items-center gap-2">
        {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
      </div>
      <span className="ml-auto text-xs opacity-50">{isAdminBadge}</span>
    </button>
  );
}

const isAdminBadge = "";

export function MobileSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  // Mobile overlay handled via layout state
  return null;
}

export function TopBar({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-input bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-4 lg:px-8">
        <button className="ml-2 text-muted-foreground hover:text-foreground md:hidden">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">N</div>
            <span className="font-semibold text-lg hidden sm:block tracking-tight">NoteApp</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button className="text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-background border border-input">
            <Sun className="h-4 w-4" /> Light
          </button>
          <Link href="/login" className="hidden sm:flex">
            <Button variant="outline" size="sm">Sign in</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
