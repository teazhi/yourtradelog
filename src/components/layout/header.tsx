"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, Settings, UserCircle, ChevronDown } from "lucide-react";
import {
  Button,
  SidebarTrigger,
  Separator,
} from "@/components/ui";
import { ThemeToggle } from "./theme-toggle";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const [user, setUser] = React.useState<{ email?: string; name?: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", user.id)
            .single();

          const profileData = profile as { display_name?: string; avatar_url?: string } | null;
          setUser({
            email: user.email,
            name: profileData?.display_name || user.email?.split("@")[0] || "User",
          });
        }
      } catch (error) {
        console.log("Could not fetch user:", error);
      }
    };

    fetchUser();
  }, []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    setIsOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Trading Journal</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8" />
          <div className="h-8 w-8 rounded-full bg-muted" />
        </div>
      </header>
    );
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Trading Journal</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Custom Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            className="relative h-9 flex items-center gap-2 rounded-full px-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover p-1 shadow-lg z-50">
              {/* User Info */}
              <div className="px-3 py-2 border-b mb-1">
                <p className="text-sm font-medium">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || "user@example.com"}</p>
              </div>

              {/* Menu Items */}
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer"
              >
                <UserCircle className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>

              <div className="border-t my-1" />

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-950 text-red-600 w-full cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                {isLoading ? "Signing out..." : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
