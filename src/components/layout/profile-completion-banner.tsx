"use client";

import * as React from "react";
import Link from "next/link";
import { X, User, AlertCircle, ChevronRight } from "lucide-react";
import { Button, cn } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface ProfileCompletionData {
  username: string | null;
  display_name: string | null;
  trading_style: string | null;
  experience_level: string | null;
  favorite_instruments: string[] | null;
  bio: string | null;
}

interface ProfileField {
  key: keyof ProfileCompletionData;
  label: string;
  weight: number; // Higher weight = more important
}

const PROFILE_FIELDS: ProfileField[] = [
  { key: "display_name", label: "Display name", weight: 3 },
  { key: "username", label: "Username", weight: 2 },
  { key: "trading_style", label: "Trading style", weight: 2 },
  { key: "experience_level", label: "Experience level", weight: 2 },
  { key: "favorite_instruments", label: "Favorite instruments", weight: 1 },
  { key: "bio", label: "Bio", weight: 1 },
];

function calculateCompletionPercentage(profile: ProfileCompletionData): number {
  let totalWeight = 0;
  let completedWeight = 0;

  for (const field of PROFILE_FIELDS) {
    totalWeight += field.weight;
    const value = profile[field.key];

    if (field.key === "favorite_instruments") {
      if (Array.isArray(value) && value.length > 0) {
        completedWeight += field.weight;
      }
    } else if (value && typeof value === "string" && value.trim().length > 0) {
      completedWeight += field.weight;
    }
  }

  return Math.round((completedWeight / totalWeight) * 100);
}

function getMissingFields(profile: ProfileCompletionData): string[] {
  const missing: string[] = [];

  for (const field of PROFILE_FIELDS) {
    const value = profile[field.key];

    if (field.key === "favorite_instruments") {
      if (!Array.isArray(value) || value.length === 0) {
        missing.push(field.label);
      }
    } else if (!value || (typeof value === "string" && value.trim().length === 0)) {
      missing.push(field.label);
    }
  }

  return missing;
}

export function ProfileCompletionBanner() {
  const [profile, setProfile] = React.useState<ProfileCompletionData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem("profile-banner-dismissed");
    if (dismissed) {
      setIsDismissed(true);
      setIsLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("username, display_name, trading_style, experience_level, favorite_instruments, bio")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          setProfile(data as ProfileCompletionData);
        } else {
          // No profile exists - treat as completely incomplete
          setProfile({
            username: null,
            display_name: null,
            trading_style: null,
            experience_level: null,
            favorite_instruments: null,
            bio: null,
          });
        }
      } catch (err) {
        console.error("Exception fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("profile-banner-dismissed", "true");
    setIsDismissed(true);
  };

  // Don't show anything while loading or if dismissed
  if (isLoading || isDismissed || !profile) {
    return null;
  }

  const completionPercentage = calculateCompletionPercentage(profile);
  const missingFields = getMissingFields(profile);

  // Don't show banner if profile is complete (100%)
  if (completionPercentage === 100) {
    return null;
  }

  // Different urgency levels based on completion
  const isUrgent = completionPercentage < 30;
  const isMedium = completionPercentage >= 30 && completionPercentage < 70;

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-4 rounded-lg border p-3 sm:p-4 mb-4",
        isUrgent && "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
        isMedium && "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
        !isUrgent && !isMedium && "bg-muted/50 border-border"
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className={cn(
            "flex items-center justify-center h-9 w-9 shrink-0 rounded-full",
            isUrgent && "bg-amber-100 dark:bg-amber-900/50",
            isMedium && "bg-blue-100 dark:bg-blue-900/50",
            !isUrgent && !isMedium && "bg-muted"
          )}
        >
          {isUrgent ? (
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm sm:text-base">
              {isUrgent
                ? "Complete your profile to get started"
                : completionPercentage < 70
                ? "Your profile is almost there!"
                : "Just a few more details"}
            </p>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                isUrgent && "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
                isMedium && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                !isUrgent && !isMedium && "bg-muted text-muted-foreground"
              )}
            >
              {completionPercentage}% complete
            </span>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {missingFields.length <= 3
              ? `Add your ${missingFields.join(", ").toLowerCase()}`
              : `${missingFields.length} fields remaining`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" variant={isUrgent ? "default" : "outline"}>
          <Link href="/profile" className="flex items-center gap-1">
            <span className="hidden sm:inline">Complete Profile</span>
            <span className="sm:hidden">Complete</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
