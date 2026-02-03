"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

export default function ContactPage() {
  const router = useRouter();

  const handleBack = () => {
    // Go back to previous page in history
    router.back();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
            <p className="text-lg text-muted-foreground">
              Have questions, feedback, or need support? We&apos;d love to hear from you.
            </p>
          </div>

          <div className="bg-card border rounded-xl p-8 space-y-6">
            <div className="flex justify-center">
              <svg
                viewBox="0 0 24 24"
                className="h-12 w-12 text-foreground"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground">
                Reach out to us on X (formerly Twitter)
              </p>
              <a
                href="https://x.com/yourtradinglog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xl font-semibold text-primary hover:underline"
              >
                @yourtradinglog
              </a>
            </div>

            <Button asChild size="lg" className="w-full sm:w-auto">
              <a
                href="https://x.com/yourtradinglog"
                target="_blank"
                rel="noopener noreferrer"
              >
                Message us on X
              </a>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            We typically respond within 24-48 hours.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} YourTradeLog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
