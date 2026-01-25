"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sun,
  Moon,
  Calendar,
  CalendarDays,
  FileText,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Target,
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@/components/ui";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  category: "daily" | "weekly" | "monthly";
  prompts: TemplatePrompt[];
}

interface TemplatePrompt {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "checklist" | "rating";
  icon?: React.ElementType;
}

const TEMPLATES: Template[] = [
  // DAILY TEMPLATES
  {
    id: "morning-routine",
    name: "Morning Pre-Market Routine",
    description: "Prepare mentally and set intentions before the market opens",
    icon: Sun,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    category: "daily",
    prompts: [
      {
        id: "mindset",
        label: "Mindset Check-In",
        placeholder: "How am I feeling today? Am I well-rested? Any distractions or stress I need to acknowledge?",
        type: "textarea",
        icon: Brain,
      },
      {
        id: "market-conditions",
        label: "Market Conditions",
        placeholder: "What's the overall market sentiment? Any major news or events today? Key economic data releases?",
        type: "textarea",
        icon: TrendingUp,
      },
      {
        id: "key-levels",
        label: "Key Levels to Watch",
        placeholder: "Support levels:\n\nResistance levels:\n\nPivot points:",
        type: "textarea",
        icon: Target,
      },
      {
        id: "trading-plan",
        label: "Today's Trading Plan",
        placeholder: "What setups am I looking for?\n\nWhich instruments will I focus on?\n\nWhat's my max risk for today?",
        type: "textarea",
        icon: FileText,
      },
      {
        id: "rules-reminder",
        label: "Rules Reminder",
        placeholder: "• No revenge trading\n• Stick to my stop losses\n• Maximum 3 trades today\n• Take breaks between trades",
        type: "textarea",
        icon: AlertTriangle,
      },
      {
        id: "goals",
        label: "Today's Goals",
        placeholder: "1. Focus on quality over quantity\n2. Follow my trading plan\n3. Stay disciplined with position sizing",
        type: "textarea",
        icon: CheckCircle2,
      },
    ],
  },
  {
    id: "post-session",
    name: "Post-Session Review",
    description: "Reflect on your trading session and capture key learnings",
    icon: Moon,
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950",
    category: "daily",
    prompts: [
      {
        id: "session-summary",
        label: "Session Summary",
        placeholder: "How many trades did I take? What was my P&L? Did I follow my plan?",
        type: "textarea",
        icon: BarChart3,
      },
      {
        id: "what-worked",
        label: "What Worked Well",
        placeholder: "Which trades were executed perfectly? What did I do right? Any patterns I should repeat?",
        type: "textarea",
        icon: CheckCircle2,
      },
      {
        id: "what-didnt-work",
        label: "What Didn't Work",
        placeholder: "Which trades went wrong? What mistakes did I make? What would I do differently?",
        type: "textarea",
        icon: AlertTriangle,
      },
      {
        id: "emotions",
        label: "Emotional State",
        placeholder: "How did I feel during trading? Did emotions affect my decisions? Any FOMO, fear, or greed moments?",
        type: "textarea",
        icon: Brain,
      },
      {
        id: "lessons",
        label: "Key Lessons Learned",
        placeholder: "What's the most important thing I learned today? How can I improve tomorrow?",
        type: "textarea",
        icon: Lightbulb,
      },
      {
        id: "tomorrow-prep",
        label: "Preparation for Tomorrow",
        placeholder: "What should I focus on tomorrow? Any adjustments to my strategy? Levels to watch?",
        type: "textarea",
        icon: Clock,
      },
    ],
  },
  // WEEKLY TEMPLATES
  {
    id: "weekend-review",
    name: "Weekend Review",
    description: "Comprehensive weekly analysis and planning for the week ahead",
    icon: Calendar,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    category: "weekly",
    prompts: [
      {
        id: "week-stats",
        label: "Weekly Statistics",
        placeholder: "Total P&L:\nTotal Trades:\nWin Rate:\nBest Trade:\nWorst Trade:\nAverage R-Multiple:",
        type: "textarea",
        icon: BarChart3,
      },
      {
        id: "goal-review",
        label: "Goal Achievement Review",
        placeholder: "What goals did I set for this week? Which ones did I achieve? Why did I miss any?",
        type: "textarea",
        icon: Target,
      },
      {
        id: "best-trades",
        label: "Top 3 Best Trades",
        placeholder: "1. [Symbol, Date] - What made this trade successful?\n\n2.\n\n3.",
        type: "textarea",
        icon: TrendingUp,
      },
      {
        id: "worst-trades",
        label: "Top 3 Worst Trades",
        placeholder: "1. [Symbol, Date] - What went wrong?\n\n2.\n\n3.",
        type: "textarea",
        icon: AlertTriangle,
      },
      {
        id: "patterns",
        label: "Patterns & Observations",
        placeholder: "What patterns am I noticing in my trading? Any recurring mistakes? Any consistent winners?",
        type: "textarea",
        icon: Brain,
      },
      {
        id: "strategy-adjustments",
        label: "Strategy Adjustments",
        placeholder: "Based on this week's performance, what changes should I make to my strategy?",
        type: "textarea",
        icon: Lightbulb,
      },
      {
        id: "next-week-goals",
        label: "Goals for Next Week",
        placeholder: "1. \n2. \n3. ",
        type: "textarea",
        icon: CheckCircle2,
      },
      {
        id: "market-outlook",
        label: "Market Outlook",
        placeholder: "What's the outlook for next week? Key events? Levels to watch?",
        type: "textarea",
        icon: TrendingUp,
      },
    ],
  },
  // MONTHLY TEMPLATES
  {
    id: "monthly-review",
    name: "Monthly Performance Review",
    description: "Deep dive into your monthly performance and long-term progress",
    icon: CalendarDays,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    category: "monthly",
    prompts: [
      {
        id: "monthly-stats",
        label: "Monthly Statistics",
        placeholder: "Total P&L:\nTotal Trades:\nWin Rate:\nProfit Factor:\nBest Week:\nWorst Week:\nMax Drawdown:",
        type: "textarea",
        icon: BarChart3,
      },
      {
        id: "monthly-goals-review",
        label: "Monthly Goals Review",
        placeholder: "What were my goals for this month?\n\nWhich goals did I achieve?\n\nWhich goals did I miss and why?",
        type: "textarea",
        icon: Target,
      },
      {
        id: "best-setups",
        label: "Best Performing Setups",
        placeholder: "Which setups performed best this month? What made them successful?",
        type: "textarea",
        icon: TrendingUp,
      },
      {
        id: "worst-setups",
        label: "Underperforming Setups",
        placeholder: "Which setups didn't work? Should I adjust or remove them?",
        type: "textarea",
        icon: AlertTriangle,
      },
      {
        id: "emotional-patterns",
        label: "Emotional Patterns",
        placeholder: "What emotional patterns did I notice this month? How did my psychology affect my trading?",
        type: "textarea",
        icon: Brain,
      },
      {
        id: "biggest-lessons",
        label: "Biggest Lessons",
        placeholder: "What are the top 3 lessons I learned this month?\n\n1.\n\n2.\n\n3.",
        type: "textarea",
        icon: Lightbulb,
      },
      {
        id: "process-improvements",
        label: "Process Improvements",
        placeholder: "What changes should I make to my trading process? Any new rules to add?",
        type: "textarea",
        icon: Sparkles,
      },
      {
        id: "next-month-goals",
        label: "Goals for Next Month",
        placeholder: "Set 3-5 specific, measurable goals for next month:\n\n1.\n\n2.\n\n3.",
        type: "textarea",
        icon: CheckCircle2,
      },
      {
        id: "accountability",
        label: "Accountability Commitment",
        placeholder: "What will I do differently next month? How will I hold myself accountable?",
        type: "textarea",
        icon: Target,
      },
    ],
  },
];

function TemplateCard({
  template,
  onUse,
}: {
  template: Template;
  onUse: (template: Template) => void;
}) {
  return (
    <Card className="group hover:shadow-md transition-all cursor-pointer" onClick={() => onUse(template)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg w-fit", template.bgColor)}>
            <template.icon className={cn("h-5 w-5", template.iconColor)} />
          </div>
          <Badge variant="outline" className="text-xs">
            {template.category === "daily" ? "Daily" : template.category === "weekly" ? "Weekly" : "Monthly"}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {template.prompts.length} prompts
          </span>
          <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
            Use Template
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateViewer({
  template,
  onBack,
  onCopy,
}: {
  template: Template;
  onBack: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, string>>({});

  const handleCopy = () => {
    // Build the formatted text
    let text = `# ${template.name}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n\n`;

    template.prompts.forEach((prompt) => {
      text += `## ${prompt.label}\n`;
      text += values[prompt.id] || prompt.placeholder;
      text += "\n\n";
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Template copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
    onCopy();
  };

  const handleValueChange = (promptId: string, value: string) => {
    setValues((prev) => ({ ...prev, [promptId]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back to Templates
          </Button>
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", template.bgColor)}>
              <template.icon className={cn("h-5 w-5", template.iconColor)} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{template.name}</h2>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
          </div>
        </div>
        <Button onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>

      {/* Prompts */}
      <div className="grid gap-6">
        {template.prompts.map((prompt) => (
          <Card key={prompt.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {prompt.icon && <prompt.icon className="h-4 w-4 text-muted-foreground" />}
                <CardTitle className="text-base">{prompt.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-md border bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={prompt.placeholder}
                value={values[prompt.id] || ""}
                onChange={(e) => handleValueChange(prompt.id, e.target.value)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          Fill out the prompts above, then copy to your journal or notes app.
        </p>
        <Button onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy All
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null);
  const [activeTab, setActiveTab] = React.useState<"all" | "daily" | "weekly" | "monthly">("all");

  const filteredTemplates = activeTab === "all"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeTab);

  if (selectedTemplate) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <TemplateViewer
          template={selectedTemplate}
          onBack={() => setSelectedTemplate(null)}
          onCopy={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Journal Templates</h1>
        <p className="text-muted-foreground">
          Pre-built templates to structure your trading journal and improve consistency.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
              <Sun className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">Daily Templates</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-sm text-muted-foreground">Weekly Template</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
              <CalendarDays className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-sm text-muted-foreground">Monthly Template</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
              <Sparkles className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{TEMPLATES.reduce((acc, t) => acc + t.prompts.length, 0)}</p>
              <p className="text-sm text-muted-foreground">Total Prompts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Template Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onUse={setSelectedTemplate}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Tips Section */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Tips for Effective Journaling
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Be Consistent</h4>
              <p className="text-sm text-muted-foreground">
                Journal every trading day, even when you don't trade. Document why you sat out.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Be Honest</h4>
              <p className="text-sm text-muted-foreground">
                Don't sugarcoat mistakes. The more honest you are, the faster you'll improve.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Focus on Process</h4>
              <p className="text-sm text-muted-foreground">
                Judge your trades by execution, not just P&L. A good trade can lose money.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Review Regularly</h4>
              <p className="text-sm text-muted-foreground">
                Weekly and monthly reviews help you spot patterns you'd miss day-to-day.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
