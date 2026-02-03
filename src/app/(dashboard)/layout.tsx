"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Calendar,
  Home,
  Layers,
  List,
  Settings,
  Menu,
  X,
  Users,
  Trophy,
  Rss,
  User,
  Target,
  Handshake,
  LogOut,
  ChevronDown,
  UserCircle,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Button, cn } from "@/components/ui";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { ProfileCompletionBanner } from "@/components/layout/profile-completion-banner";
import { createClient } from "@/lib/supabase/client";
import { AccountProvider } from "@/components/providers/account-provider";
import { AccountSelector } from "@/components/layout/account-selector";
import { DailyQuote } from "@/components/dashboard/daily-quote";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Journal", url: "/journal", icon: BookOpen },
  { title: "Trades", url: "/trades", icon: List },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Setups", url: "/setups", icon: Layers },
];

const progressItems = [
  { title: "Discipline", url: "/discipline", icon: Shield },
  { title: "Achievements", url: "/achievements", icon: Trophy },
  { title: "Challenges", url: "/challenges", icon: Target },
  { title: "Partner", url: "/partner", icon: Handshake },
];

const socialItems = [
  { title: "Feed", url: "/feed", icon: Rss },
  { title: "Squads", url: "/squads", icon: Users },
];

const accountItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help", url: "/contact", icon: HelpCircle },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [user, setUser] = React.useState<{ email?: string; name?: string } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch user data
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
      } catch {
        // Silent fail - user will see default greeting
      }
    };

    fetchUser();
  }, []);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setIsLoading(true);
    setDropdownOpen(false);
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

  const greeting = user?.name ? `Welcome back, ${user.name}!` : "Welcome back!";

  return (
    <AccountProvider>
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {sidebarOpen && (
            <Link href="/dashboard">
              <Logo size="sm" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {/* Main Navigation */}
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.url ||
                (item.url !== "/dashboard" && pathname.startsWith(item.url));
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>{item.title}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Progress Section */}
          {sidebarOpen && (
            <div className="mt-6 mb-2 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Progress
              </span>
            </div>
          )}
          {!sidebarOpen && <div className="my-4 border-t border-border" />}
          <ul className="space-y-1">
            {progressItems.map((item) => {
              const isActive =
                pathname === item.url || pathname.startsWith(item.url);
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>{item.title}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Community Section */}
          {sidebarOpen && (
            <div className="mt-6 mb-2 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Community
              </span>
            </div>
          )}
          {!sidebarOpen && <div className="my-4 border-t border-border" />}
          <ul className="space-y-1">
            {socialItems.map((item) => {
              const isActive =
                pathname === item.url || pathname.startsWith(item.url);
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>{item.title}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Account Section */}
          {sidebarOpen && (
            <div className="mt-6 mb-2 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account
              </span>
            </div>
          )}
          {!sidebarOpen && <div className="my-4 border-t border-border" />}
          <ul className="space-y-1">
            {accountItems.map((item) => {
              const isActive = pathname === item.url;
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>{item.title}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Admin Section - Only visible to admin */}
          {user?.email === "zhuot03@gmail.com" && (
            <>
              {sidebarOpen && (
                <div className="mt-6 mb-2 px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-500">
                    Admin
                  </span>
                </div>
              )}
              {!sidebarOpen && <div className="my-4 border-t border-red-500/30" />}
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/admin"
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      pathname === "/admin"
                        ? "bg-red-500 text-white"
                        : "text-red-500 hover:bg-red-500/10"
                    )}
                  >
                    <Shield className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>Admin Panel</span>}
                  </Link>
                </li>
              </ul>
            </>
          )}
        </nav>

        {/* Sidebar Footer with Logout */}
        <div className="border-t border-border p-4">
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full",
              "text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>{isLoading ? "Signing out..." : "Sign out"}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] transform border-r border-border bg-card transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard">
            <Logo size="sm" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.url ||
                (item.url !== "/dashboard" && pathname.startsWith(item.url));
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Progress Section */}
          <div className="mt-6 mb-2 px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Progress
            </span>
          </div>
          <ul className="space-y-1">
            {progressItems.map((item) => {
              const isActive =
                pathname === item.url || pathname.startsWith(item.url);
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Community Section */}
          <div className="mt-6 mb-2 px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Community
            </span>
          </div>
          <ul className="space-y-1">
            {socialItems.map((item) => {
              const isActive =
                pathname === item.url || pathname.startsWith(item.url);
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Account Section */}
          <div className="mt-6 mb-2 px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </span>
          </div>
          <ul className="space-y-1">
            {accountItems.map((item) => {
              const isActive = pathname === item.url;
              return (
                <li key={item.title}>
                  <Link
                    href={item.url}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile Sidebar Footer with Logout */}
        <div className="border-t border-border p-4">
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span>{isLoading ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 border-b border-border bg-background">
          <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="h-9 w-9 shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-sm sm:text-lg font-semibold shrink-0">{greeting}</h1>
              {/* Daily Quote - inline with welcome text */}
              <div className="hidden lg:block flex-1 min-w-0 max-w-2xl">
                <DailyQuote className="py-1" />
              </div>
            </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <AccountSelector />
            <ThemeToggle />

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                className="relative h-9 flex items-center gap-1 sm:gap-2 rounded-full px-1.5 sm:px-2"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <ChevronDown className={`h-4 w-4 hidden sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </Button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover p-1 shadow-lg z-50">
                  {/* User Info */}
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-medium">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || "user@example.com"}</p>
                  </div>

                  {/* Menu Items */}
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer"
                  >
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
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
          </div>
          {/* Daily Quote - shown on smaller screens below the header */}
          <div className="lg:hidden">
            <DailyQuote className="mx-3 sm:mx-4 mb-3" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <ProfileCompletionBanner />
          {children}
        </main>
      </div>
    </div>
    </AccountProvider>
  );
}
