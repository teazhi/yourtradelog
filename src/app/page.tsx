import Link from "next/link";
import {
  TrendingUp,
  BarChart3,
  Target,
  Shield,
  LineChart,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">YourTradeLog</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Master Your Trading with{" "}
            <span className="text-primary">Data-Driven Insights</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Track every trade, analyze your performance, and identify winning
            patterns. The professional trading journal that helps you become a
            consistently profitable trader.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup">
              <Button size="lg" className="min-w-[200px]">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="min-w-[200px]">
                Log in to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Trade Smarter
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful tools designed by traders, for traders.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-lg border bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Track Every Trade</h3>
              <p className="mt-2 text-muted-foreground">
                Log trades manually or import from your broker. Capture entries,
                exits, position sizes, and notes in one place.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <LineChart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                Analyze Performance
              </h3>
              <p className="mt-2 text-muted-foreground">
                View detailed analytics including win rate, profit factor,
                expectancy, and drawdown. Understand what works.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Identify Patterns</h3>
              <p className="mt-2 text-muted-foreground">
                Discover your most profitable setups, best trading times, and
                optimal position sizes with pattern analysis.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-lg border bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Manage Risk</h3>
              <p className="mt-2 text-muted-foreground">
                Set risk parameters and track your exposure. Stay disciplined
                with built-in risk management tools.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-lg border bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Real-Time Sync</h3>
              <p className="mt-2 text-muted-foreground">
                Access your journal from any device. Your data syncs instantly
                across all platforms.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-lg border bg-background p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                Improve Consistently
              </h3>
              <p className="mt-2 text-muted-foreground">
                Review your trades with detailed playback. Learn from mistakes
                and replicate your successes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Take Control of Your Trading?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands of traders who are already improving their
              performance with YourTradeLog.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="min-w-[200px]">
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required. 14-day free trial.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-semibold">YourTradeLog</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} YourTradeLog. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
