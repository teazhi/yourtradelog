"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  BarChart3,
  Target,
  Shield,
  LineChart,
  Zap,
  Users,
  Trophy,
  ChevronRight,
  Check,
  ArrowRight,
  Calendar,
  PieChart,
  Activity,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui";
import { Logo, LogoIcon } from "@/components/ui/logo";

// Floating card animation
function FloatingCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="animate-float"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-x-hidden overflow-y-auto" style={{ height: '100vh' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto flex h-16 items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#why-free" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Why Free?</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative container px-4 sm:px-6 lg:px-8 mx-auto flex flex-col lg:flex-row items-center gap-12 py-20 lg:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        <div className="flex-1 text-center lg:text-left space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-green-500" />
            <span>Built by traders, for traders</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
            Trade Smarter.{" "}
            <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              Win More.
            </span>
          </h1>

          <p className="mx-auto lg:mx-0 max-w-xl text-lg text-muted-foreground sm:text-xl">
            The professional trading journal that helps you track every trade, analyze your performance, and become a consistently profitable trader.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-lg px-8 h-14">
                Get Started — It&apos;s Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 justify-center lg:justify-start pt-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500" />
            <span>No credit card required</span>
            <span className="mx-2">•</span>
            <Check className="h-4 w-4 text-green-500" />
            <span>Free forever</span>
            <span className="mx-2">•</span>
            <Check className="h-4 w-4 text-green-500" />
            <span>All features included</span>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="flex-1 relative w-full max-w-2xl">
          {mounted && (
            <div className="relative">
              {/* Main Dashboard Preview */}
              <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
                <div className="border-b bg-muted/30 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">Dashboard — YourTradeLog</span>
                </div>
                <div className="p-6 space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-green-500/10 p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">+$12,450</div>
                      <div className="text-xs text-muted-foreground">Total P&L</div>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">68%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                    <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">2.4R</div>
                      <div className="text-xs text-muted-foreground">Avg Win</div>
                    </div>
                  </div>
                  {/* Chart Preview */}
                  <div className="h-32 rounded-lg bg-gradient-to-t from-green-500/20 to-transparent relative overflow-hidden">
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                      <path
                        d="M0,80 Q50,70 100,60 T200,40 T300,30 T400,10"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="3"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <FloatingCard delay={0}>
                <div className="absolute -left-8 top-1/4 rounded-xl border bg-card p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <LogoIcon size={16} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Today&apos;s P&L</div>
                      <div className="font-semibold text-green-500">+$1,240</div>
                    </div>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard delay={0.5}>
                <div className="absolute -right-4 top-1/3 rounded-xl border bg-card p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium text-sm">5 Day Win Streak!</span>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard delay={1}>
                <div className="absolute -right-8 bottom-1/4 rounded-xl border bg-card p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-sm">Squad: Alpha Traders</span>
                  </div>
                </div>
              </FloatingCard>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm mb-4">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Powerful Features</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                Trade Smarter
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Professional-grade tools designed by traders, for traders.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Trade Logging",
                description: "Log trades manually or import from your broker. Capture entries, exits, screenshots, and detailed notes.",
                color: "blue",
              },
              {
                icon: LineChart,
                title: "Advanced Analytics",
                description: "Deep dive into your performance with win rate, profit factor, expectancy, drawdown analysis, and more.",
                color: "purple",
              },
              {
                icon: Target,
                title: "Pattern Recognition",
                description: "Discover your most profitable setups, best trading times, and optimal position sizes.",
                color: "orange",
              },
              {
                icon: Shield,
                title: "Risk Management",
                description: "Set daily loss limits, track risk per trade, and monitor your drawdown in real-time.",
                color: "red",
              },
              {
                icon: Calendar,
                title: "Calendar View",
                description: "Visualize your trading history with a beautiful calendar showing daily P&L and trade counts.",
                color: "green",
              },
              {
                icon: Activity,
                title: "Emotion Tracking",
                description: "Log your emotional state to identify psychological patterns affecting your trading.",
                color: "pink",
              },
              {
                icon: Users,
                title: "Squad System",
                description: "Join or create trading squads. Compete, collaborate, and grow together with other traders.",
                color: "cyan",
              },
              {
                icon: Trophy,
                title: "Achievements",
                description: "Earn badges and track milestones. Celebrate your trading wins and streaks.",
                color: "yellow",
              },
              {
                icon: PieChart,
                title: "Setup Analysis",
                description: "Track performance by setup type. Know exactly which strategies work best for you.",
                color: "indigo",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative rounded-2xl border bg-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-${feature.color}-500/10 mb-4`}>
                  <feature.icon className={`h-6 w-6 text-${feature.color}-500`} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Get Started in{" "}
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                3 Simple Steps
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start tracking your trades and improving your performance in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create Your Account",
                description: "Sign up for free and set up your trading profile in under a minute.",
              },
              {
                step: "02",
                title: "Log Your Trades",
                description: "Enter trades manually or import from your broker. Add screenshots and notes.",
              },
              {
                step: "03",
                title: "Analyze & Improve",
                description: "Review your analytics, identify patterns, and make data-driven decisions.",
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-8xl font-bold text-muted/20 absolute -top-6 -left-2">
                  {item.step}
                </div>
                <div className="relative pt-8">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < 2 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-4 h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Free Section */}
      <section id="why-free" className="py-24 bg-muted/30">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-3xl border-2 border-green-500 bg-card p-12 md:p-16 text-center relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
              </div>

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm font-medium text-green-600 mb-6">
                  <Zap className="h-4 w-4" />
                  100% Free Forever
                </div>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                  All Features.{" "}
                  <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                    Zero Cost.
                  </span>
                </h2>

                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  YourTradeLog is a passion project built by traders who believe every trader deserves access to professional journaling tools. No hidden fees, no premium tiers, no credit card required.
                </p>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                  {[
                    "Unlimited Trades",
                    "Advanced Analytics",
                    "Squad System",
                    "Social Feed",
                    "Risk Management",
                    "Calendar View",
                    "Setup Tracking",
                    "Trade Journal",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center justify-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="/signup">
                  <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-lg px-10 h-14">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-r from-green-500 to-emerald-600 p-12 md:p-20 overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="relative text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Ready to Transform Your Trading?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Start tracking your trades today and discover the patterns that will make you a better trader. It&apos;s completely free.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 h-14">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-white/60">
                No credit card required • Free forever • All features included
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <Logo size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">
                The professional trading journal for serious traders.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Feedback</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} YourTradeLog. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
