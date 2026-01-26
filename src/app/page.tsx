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
  Star,
  ArrowRight,
  Play,
  Calendar,
  PieChart,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui";
import { Logo, LogoIcon } from "@/components/ui/logo";

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setHasAnimated(true);
          let startTime: number;
          const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`counter-${end}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return (
    <span id={`counter-${end}`}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

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
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
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
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>Now with Squad Challenges & Social Feed</span>
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
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 h-14 gap-2">
              <Play className="h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          <div className="flex items-center gap-8 justify-center lg:justify-start pt-4">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border-2 border-background" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                <strong className="text-foreground">2,500+</strong> traders
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-sm text-muted-foreground ml-1">4.9/5</span>
            </div>
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

      {/* Stats Section */}
      <section className="border-y bg-muted/30 py-16">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">
                <AnimatedCounter end={2500} suffix="+" />
              </div>
              <div className="text-muted-foreground mt-1">Active Traders</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">
                <AnimatedCounter end={150000} suffix="+" />
              </div>
              <div className="text-muted-foreground mt-1">Trades Logged</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">
                $<AnimatedCounter end={25} suffix="M+" />
              </div>
              <div className="text-muted-foreground mt-1">P&L Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">
                <AnimatedCounter end={98} suffix="%" />
              </div>
              <div className="text-muted-foreground mt-1">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm mb-4">
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
      <section id="how-it-works" className="py-24 bg-muted/30">
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

      {/* 100% Free Section */}
      <section className="py-24">
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
                  YourTradeLog is completely free. No hidden fees, no premium tiers, no credit card required.
                  Get unlimited access to all features and start improving your trading today.
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

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-muted/30">
        <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Loved by{" "}
              <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                Traders Worldwide
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See what our community has to say.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "YourTradeLog completely changed how I approach trading. The analytics helped me identify my winning patterns and eliminate my bad habits.",
                author: "Alex K.",
                role: "Day Trader",
                rating: 5,
              },
              {
                quote: "The squad feature is amazing! Competing with my trading buddies keeps me accountable and motivated. Best investment I've made in my trading career.",
                author: "Sarah M.",
                role: "Swing Trader",
                rating: 5,
              },
              {
                quote: "Finally, a trading journal that doesn't feel like a chore. The interface is beautiful and the insights are incredibly valuable.",
                author: "Michael R.",
                role: "Options Trader",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <div key={index} className="rounded-2xl border bg-card p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">&quot;{testimonial.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500" />
                  <div>
                    <div className="font-medium">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
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
                Join thousands of traders who are already improving their performance with YourTradeLog. It&apos;s completely free.
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
                <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} YourTradeLog. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
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
