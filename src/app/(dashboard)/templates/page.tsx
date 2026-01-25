"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Sun,
  Moon,
  Calendar,
  CalendarDays,
  FileText,
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
  Save,
  Loader2,
  ArrowLeft,
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
  Textarea,
  cn,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  category: "daily" | "weekly" | "monthly";
  prompts: TemplatePrompt[];
  // Which journal field this template primarily fills
  targetField: "pre_market_notes" | "post_market_notes";
}

interface TemplatePrompt {
  id: string;
  label: string;
  placeholder: string;
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
    targetField: "pre_market_notes",
    prompts: [
      {
        id: "mindset",
        label: "Mindset Check-In",
        placeholder: "How am I feeling today? Am I well-rested? Any distractions or stress I need to acknowledge?",
        icon: Brain,
      },
      {
        id: "market-conditions",
        label: "Market Conditions",
        placeholder: "What's the overall market sentiment? Any major news or events today? Key economic data releases?",
        icon: TrendingUp,
      },
      {
        id: "key-levels",
        label: "Key Levels to Watch",
        placeholder: "Support levels:\nResistance levels:\nPivot points:",
        icon: Target,
      },
      {
        id: "trading-plan",
        label: "Today's Trading Plan",
        placeholder: "What setups am I looking for? Which instruments will I focus on? What's my max risk for today?",
        icon: FileText,
      },
      {
        id: "rules-reminder",
        label: "Rules Reminder",
        placeholder: "• No revenge trading\n• Stick to my stop losses\n• Maximum 3 trades today\n• Take breaks between trades",
        icon: AlertTriangle,
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
    targetField: "post_market_notes",
    prompts: [
      {
        id: "session-summary",
        label: "Session Summary",
        placeholder: "How many trades did I take? What was my P&L? Did I follow my plan?",
        icon: BarChart3,
      },
      {
        id: "what-worked",
        label: "What Worked Well",
        placeholder: "Which trades were executed perfectly? What did I do right? Any patterns I should repeat?",
        icon: CheckCircle2,
      },
      {
        id: "what-didnt-work",
        label: "What Didn't Work",
        placeholder: "Which trades went wrong? What mistakes did I make? What would I do differently?",
        icon: AlertTriangle,
      },
      {
        id: "emotions",
        label: "Emotional State",
        placeholder: "How did I feel during trading? Did emotions affect my decisions? Any FOMO, fear, or greed moments?",
        icon: Brain,
      },
      {
        id: "lessons",
        label: "Key Lessons Learned",
        placeholder: "What's the most important thing I learned today? How can I improve tomorrow?",
        icon: Lightbulb,
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
    targetField: "post_market_notes",
    prompts: [
      {
        id: "week-stats",
        label: "Weekly Statistics",
        placeholder: "Total P&L:\nTotal Trades:\nWin Rate:\nBest Trade:\nWorst Trade:",
        icon: BarChart3,
      },
      {
        id: "goal-review",
        label: "Goal Achievement Review",
        placeholder: "What goals did I set for this week? Which ones did I achieve? Why did I miss any?",
        icon: Target,
      },
      {
        id: "best-trades",
        label: "Top 3 Best Trades",
        placeholder: "1. [Symbol, Date] - What made this trade successful?\n2.\n3.",
        icon: TrendingUp,
      },
      {
        id: "patterns",
        label: "Patterns & Observations",
        placeholder: "What patterns am I noticing in my trading? Any recurring mistakes? Any consistent winners?",
        icon: Brain,
      },
      {
        id: "next-week-goals",
        label: "Goals for Next Week",
        placeholder: "1.\n2.\n3.",
        icon: CheckCircle2,
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
    targetField: "post_market_notes",
    prompts: [
      {
        id: "monthly-stats",
        label: "Monthly Statistics",
        placeholder: "Total P&L:\nTotal Trades:\nWin Rate:\nProfit Factor:\nMax Drawdown:",
        icon: BarChart3,
      },
      {
        id: "best-setups",
        label: "Best Performing Setups",
        placeholder: "Which setups performed best this month? What made them successful?",
        icon: TrendingUp,
      },
      {
        id: "biggest-lessons",
        label: "Biggest Lessons",
        placeholder: "What are the top 3 lessons I learned this month?\n1.\n2.\n3.",
        icon: Lightbulb,
      },
      {
        id: "process-improvements",
        label: "Process Improvements",
        placeholder: "What changes should I make to my trading process? Any new rules to add?",
        icon: Sparkles,
      },
      {
        id: "next-month-goals",
        label: "Goals for Next Month",
        placeholder: "Set 3-5 specific, measurable goals:\n1.\n2.\n3.",
        icon: CheckCircle2,
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

function TemplateEditor({
  template,
  onBack,
}: {
  template: Template;
  onBack: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleValueChange = (promptId: string, value: string) => {
    setValues((prev) => ({ ...prev, [promptId]: value }));
    setSaved(false);
  };

  const buildFormattedContent = () => {
    let content = "";
    template.prompts.forEach((prompt, index) => {
      const value = values[prompt.id]?.trim();
      if (value) {
        content += `### ${prompt.label}\n${value}\n\n`;
      }
    });
    return content.trim();
  };

  const handleSaveToJournal = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast("You must be logged in to save");
        return;
      }

      const today = format(new Date(), "yyyy-MM-dd");
      const content = buildFormattedContent();

      if (!content) {
        toast("Please fill out at least one section");
        return;
      }

      // Check if journal entry exists for today
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase
        .from("daily_journals") as any)
        .select("id, pre_market_notes, post_market_notes")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      const updateField = template.targetField;
      const existingContent = existing?.[updateField] || "";
      const newContent = existingContent
        ? `${existingContent}\n\n---\n\n${content}`
        : content;

      if (existing) {
        // Update existing journal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase
          .from("daily_journals") as any)
          .update({ [updateField]: newContent })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new journal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase
          .from("daily_journals") as any)
          .insert({
            user_id: user.id,
            date: today,
            [updateField]: newContent,
          });

        if (error) throw error;
      }

      setSaved(true);
      toast("Saved to today's journal!");

      // Redirect to journal after short delay
      setTimeout(() => {
        router.push("/journal");
      }, 1500);

    } catch (error) {
      console.error("Error saving to journal:", error);
      toast("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const filledCount = Object.values(values).filter(v => v?.trim()).length;
  const progress = Math.round((filledCount / template.prompts.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", template.bgColor)}>
              <template.icon className={cn("h-5 w-5", template.iconColor)} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{template.name}</h2>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleSaveToJournal}
          disabled={isSaving || filledCount === 0}
          className={cn(saved && "bg-green-600 hover:bg-green-700")}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save to Journal
            </>
          )}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{filledCount} of {template.prompts.length} sections</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Prompts */}
      <div className="grid gap-4">
        {template.prompts.map((prompt, index) => {
          const hasContent = values[prompt.id]?.trim();
          return (
            <Card key={prompt.id} className={cn(hasContent && "border-primary/50")}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                    hasContent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {hasContent ? <Check className="h-3 w-3" /> : index + 1}
                  </div>
                  {prompt.icon && <prompt.icon className="h-4 w-4 text-muted-foreground" />}
                  <CardTitle className="text-base">{prompt.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[100px] resize-y"
                  placeholder={prompt.placeholder}
                  value={values[prompt.id] || ""}
                  onChange={(e) => handleValueChange(prompt.id, e.target.value)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-between items-center pt-4 border-t sticky bottom-0 bg-background py-4">
        <p className="text-sm text-muted-foreground">
          {template.targetField === "pre_market_notes"
            ? "This will be saved to your Pre-Market notes"
            : "This will be saved to your Post-Market notes"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveToJournal}
            disabled={isSaving || filledCount === 0}
            className={cn(saved && "bg-green-600 hover:bg-green-700")}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save to Journal
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null);
  const [activeTab, setActiveTab] = React.useState<"all" | "daily" | "weekly" | "monthly">("all");

  const filteredTemplates = activeTab === "all"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeTab);

  if (selectedTemplate) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <TemplateEditor
          template={selectedTemplate}
          onBack={() => setSelectedTemplate(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Journal Templates</h1>
          <p className="text-muted-foreground">
            Guided prompts to help you write better journal entries
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/journal")}>
          <FileText className="mr-2 h-4 w-4" />
          Go to Journal
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
              <Sun className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{TEMPLATES.filter(t => t.category === "daily").length}</p>
              <p className="text-sm text-muted-foreground">Daily</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{TEMPLATES.filter(t => t.category === "weekly").length}</p>
              <p className="text-sm text-muted-foreground">Weekly</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
              <CalendarDays className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{TEMPLATES.filter(t => t.category === "monthly").length}</p>
              <p className="text-sm text-muted-foreground">Monthly</p>
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
              <p className="text-sm text-muted-foreground">Prompts</p>
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

      {/* How It Works */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            How Templates Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium">Choose a Template</h4>
                <p className="text-sm text-muted-foreground">
                  Pick a template that matches what you want to document
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium">Fill Out Prompts</h4>
                <p className="text-sm text-muted-foreground">
                  Answer each guided question thoughtfully
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium">Save to Journal</h4>
                <p className="text-sm text-muted-foreground">
                  Your responses are automatically saved to today's journal entry
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
