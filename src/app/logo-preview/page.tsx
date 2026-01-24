"use client";

import { Logo, LogoAlt1, LogoAlt2, LogoMinimal } from "@/components/ui/logo";

export default function LogoPreviewPage() {
  return (
    <div className="min-h-screen bg-background p-8 overflow-y-auto" style={{ height: '100vh' }}>
      <div className="max-w-4xl mx-auto space-y-16">
        <h1 className="text-3xl font-bold text-center mb-12">Logo Options</h1>

        {/* Option 1: Main Logo */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Option 1: Rising Chart Arrow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-card rounded-xl border">
              <p className="text-sm text-muted-foreground mb-4">Light Background</p>
              <Logo size="lg" />
            </div>
            <div className="p-8 bg-zinc-900 rounded-xl">
              <p className="text-sm text-zinc-400 mb-4">Dark Background</p>
              <Logo size="lg" />
            </div>
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <Logo size="sm" />
            <Logo size="md" />
            <Logo size="lg" />
            <Logo size="xl" />
          </div>
          <div className="flex gap-4">
            <Logo variant="icon" showText={false} size="lg" />
            <span className="text-muted-foreground">Icon only</span>
          </div>
        </section>

        {/* Option 2: Bar Chart */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Option 2: Rising Bar Chart</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-card rounded-xl border">
              <p className="text-sm text-muted-foreground mb-4">Light Background</p>
              <LogoAlt1 size="lg" />
            </div>
            <div className="p-8 bg-zinc-900 rounded-xl">
              <p className="text-sm text-zinc-400 mb-4">Dark Background</p>
              <LogoAlt1 size="lg" />
            </div>
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <LogoAlt1 size="sm" />
            <LogoAlt1 size="md" />
            <LogoAlt1 size="lg" />
            <LogoAlt1 size="xl" />
          </div>
        </section>

        {/* Option 3: Hexagon */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Option 3: Hexagon Growth</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-card rounded-xl border">
              <p className="text-sm text-muted-foreground mb-4">Light Background</p>
              <LogoAlt2 size="lg" />
            </div>
            <div className="p-8 bg-zinc-900 rounded-xl">
              <p className="text-sm text-zinc-400 mb-4">Dark Background</p>
              <LogoAlt2 size="lg" />
            </div>
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <LogoAlt2 size="sm" />
            <LogoAlt2 size="md" />
            <LogoAlt2 size="lg" />
            <LogoAlt2 size="xl" />
          </div>
        </section>

        {/* Option 4: Minimal */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Option 4: Minimal Outline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-card rounded-xl border">
              <p className="text-sm text-muted-foreground mb-4">Light Background</p>
              <LogoMinimal size="lg" />
            </div>
            <div className="p-8 bg-zinc-900 rounded-xl">
              <p className="text-sm text-zinc-400 mb-4">Dark Background</p>
              <LogoMinimal size="lg" />
            </div>
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <LogoMinimal size="sm" />
            <LogoMinimal size="md" />
            <LogoMinimal size="lg" />
            <LogoMinimal size="xl" />
          </div>
        </section>

        <div className="text-center text-muted-foreground pt-8 border-t">
          <p>Choose your favorite and let me know which one to use!</p>
        </div>
      </div>
    </div>
  );
}
