"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Loader2,
  Save,
  X,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
  cn,
  toast,
} from "@/components/ui";
import {
  DEFAULT_FUTURES_INSTRUMENTS,
  ALL_EMOTIONS,
  ALL_MISTAKES,
  EMOTION_LABELS,
  MISTAKE_LABELS,
  SESSION_LABELS,
  APP_DEFAULTS,
} from "@/lib/constants";
import { EmotionTag, MistakeTag, Session, TradeStatus, Side } from "@/types/trade";
import { Trade } from "@/types/database";

// Zod schema for trade form validation
const tradeFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  side: z.enum(["long", "short"]),
  entry_date: z.coerce.date(),
  entry_time: z.string().optional(),
  entry_price: z.coerce.number().positive("Entry price must be positive"),
  entry_contracts: z.coerce.number().int().positive("Contracts must be at least 1"),
  exit_date: z.coerce.date().optional().nullable(),
  exit_time: z.string().optional(),
  exit_price: z.coerce.number().positive().optional().nullable(),
  exit_contracts: z.coerce.number().int().positive().optional().nullable(),
  stop_loss: z.coerce.number().positive().optional().nullable(),
  take_profit: z.coerce.number().positive().optional().nullable(),
  commission: z.coerce.number().min(0).optional().nullable(),
  fees: z.coerce.number().min(0).optional().nullable(),
  setup_id: z.string().optional().nullable(),
  session: z.string().optional().nullable(),
  emotions: z.array(z.string()).default([]),
  mistakes: z.array(z.string()).default([]),
  entry_rating: z.coerce.number().min(1).max(5).optional().nullable(),
  exit_rating: z.coerce.number().min(1).max(5).optional().nullable(),
  management_rating: z.coerce.number().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
  lessons: z.string().optional().nullable(),
  status: z.enum(["open", "closed", "cancelled"]).default("open"),
});

type TradeFormValues = z.output<typeof tradeFormSchema>;

interface TradeFormProps {
  trade?: Trade;
  setups?: { id: string; name: string; color?: string | null }[];
  onSubmit?: (data: TradeFormValues) => Promise<void>;
  isLoading?: boolean;
}

// Star Rating component
function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={cn(
            "p-0.5 transition-colors",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              (hovered !== null ? star <= hovered : star <= (value || 0))
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
      {value && (
        <button
          type="button"
          className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      )}
    </div>
  );
}

// Emotion chip selector
function EmotionSelector({
  selected,
  onChange,
  disabled = false,
}: {
  selected: string[];
  onChange: (emotions: string[]) => void;
  disabled?: boolean;
}) {
  const toggleEmotion = (emotion: string) => {
    if (selected.includes(emotion)) {
      onChange(selected.filter((e) => e !== emotion));
    } else {
      onChange([...selected, emotion]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_EMOTIONS.map((emotion) => {
        const isSelected = selected.includes(emotion);
        return (
          <Badge
            key={emotion}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors",
              isSelected && "bg-primary text-primary-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && toggleEmotion(emotion)}
          >
            {EMOTION_LABELS[emotion as EmotionTag]}
          </Badge>
        );
      })}
    </div>
  );
}

// Mistake chip selector
function MistakeSelector({
  selected,
  onChange,
  disabled = false,
}: {
  selected: string[];
  onChange: (mistakes: string[]) => void;
  disabled?: boolean;
}) {
  const toggleMistake = (mistake: string) => {
    if (selected.includes(mistake)) {
      onChange(selected.filter((m) => m !== mistake));
    } else {
      onChange([...selected, mistake]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_MISTAKES.map((mistake) => {
        const isSelected = selected.includes(mistake);
        return (
          <Badge
            key={mistake}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors",
              isSelected && "bg-orange-500 text-white border-orange-500",
              !isSelected && "text-orange-600 border-orange-300 hover:bg-orange-50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && toggleMistake(mistake)}
          >
            {MISTAKE_LABELS[mistake as MistakeTag]}
          </Badge>
        );
      })}
    </div>
  );
}

export function TradeForm({
  trade,
  setups = [],
  onSubmit,
  isLoading = false,
}: TradeFormProps) {
  const router = useRouter();
  const isEditing = !!trade;

  // Parse trade dates if editing
  const defaultValues: Partial<TradeFormValues> = trade
    ? {
        symbol: trade.symbol,
        side: trade.side as "long" | "short",
        entry_date: new Date(trade.entry_date),
        entry_time: format(new Date(trade.entry_date), "HH:mm"),
        entry_price: trade.entry_price,
        entry_contracts: trade.entry_contracts,
        exit_date: trade.exit_date ? new Date(trade.exit_date) : null,
        exit_time: trade.exit_date
          ? format(new Date(trade.exit_date), "HH:mm")
          : "",
        exit_price: trade.exit_price,
        exit_contracts: trade.exit_contracts,
        stop_loss: trade.stop_loss,
        take_profit: trade.take_profit,
        commission: trade.commission,
        fees: trade.fees,
        setup_id: trade.setup_id,
        session: trade.session,
        emotions: trade.emotions || [],
        mistakes: trade.mistakes || [],
        entry_rating: trade.entry_rating,
        exit_rating: trade.exit_rating,
        management_rating: trade.management_rating,
        notes: trade.notes,
        lessons: trade.lessons,
        status: trade.status,
      }
    : {
        symbol: "",
        side: "long",
        entry_date: new Date(),
        entry_time: format(new Date(), "HH:mm"),
        entry_price: 0,
        entry_contracts: 1,
        commission: APP_DEFAULTS.defaultCommission,
        fees: 0,
        emotions: [],
        mistakes: [],
        status: "open",
      };

  const form = useForm<TradeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(tradeFormSchema) as any,
    defaultValues,
  });

  const watchSide = form.watch("side");
  const watchStatus = form.watch("status");
  const watchExitDate = form.watch("exit_date");

  // Auto-calculate if trade should be closed
  React.useEffect(() => {
    if (watchExitDate && form.getValues("exit_price")) {
      form.setValue("status", "closed");
    }
  }, [watchExitDate, form]);

  const handleSubmit = async (data: TradeFormValues) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        // No submit handler provided - redirect to trades
        toast("Trade saved successfully");
        router.push("/trades");
      }
    } catch {
      toast("Failed to save trade. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Basic Trade Info */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Details</CardTitle>
            <CardDescription>
              Enter the basic information about your trade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Symbol and Side */}
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select instrument" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEFAULT_FUTURES_INSTRUMENTS.map((instrument) => (
                          <SelectItem
                            key={instrument.symbol}
                            value={instrument.symbol}
                          >
                            <span className="font-medium">
                              {instrument.symbol}
                            </span>
                            <span className="ml-2 text-muted-foreground">
                              {instrument.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Side *</FormLabel>
                    <FormControl>
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={(value) => value && field.onChange(value)}
                        className="justify-start"
                      >
                        <ToggleGroupItem
                          value="long"
                          aria-label="Long"
                          className={cn(
                            "data-[state=on]:bg-green-100 data-[state=on]:text-green-700 dark:data-[state=on]:bg-green-900 dark:data-[state=on]:text-green-300"
                          )}
                        >
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Long
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="short"
                          aria-label="Short"
                          className={cn(
                            "data-[state=on]:bg-red-100 data-[state=on]:text-red-700 dark:data-[state=on]:bg-red-900 dark:data-[state=on]:text-red-300"
                          )}
                        >
                          <ArrowDownRight className="mr-2 h-4 w-4" />
                          Short
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Entry Details */}
            <div>
              <h4 className="mb-4 font-medium">Entry</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="entry_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMM d, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entry_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entry_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entry_contracts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contracts *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="1"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Exit Details */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Exit</h4>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Trade is closed
                      </span>
                      <Switch
                        checked={field.value === "closed"}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? "closed" : "open")
                        }
                      />
                    </div>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="exit_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMM d, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exit_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exit_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exit_contracts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contracts</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Same as entry"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Risk Management */}
            <div>
              <h4 className="mb-4 font-medium">Risk Management</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="stop_loss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stop Loss</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="take_profit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Take Profit</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="4.50"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>Per contract round-trip</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Fees</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup and Session */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Context</CardTitle>
            <CardDescription>
              Categorize your trade for better analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="setup_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a setup" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {setups.length > 0 ? (
                          setups.map((setup) => (
                            <SelectItem key={setup.id} value={setup.id}>
                              {setup.name}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="breakout">Breakout</SelectItem>
                            <SelectItem value="reversal">Reversal</SelectItem>
                            <SelectItem value="trend">
                              Trend Following
                            </SelectItem>
                            <SelectItem value="range">Range Trade</SelectItem>
                            <SelectItem value="scalp">Scalp</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="session"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SESSION_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="emotions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emotions</FormLabel>
                  <FormDescription>
                    Select all emotions you felt during this trade
                  </FormDescription>
                  <FormControl>
                    <EmotionSelector
                      selected={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mistakes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mistakes</FormLabel>
                  <FormDescription>
                    Identify any mistakes made during this trade
                  </FormDescription>
                  <FormControl>
                    <MistakeSelector
                      selected={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Quality Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Assessment</CardTitle>
            <CardDescription>
              Rate the quality of your trade execution
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="entry_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Quality</FormLabel>
                    <FormControl>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      How well did you execute your entry?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exit_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exit Quality</FormLabel>
                    <FormControl>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      How well did you manage your exit?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="management_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Management</FormLabel>
                    <FormControl>
                      <StarRating
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription>
                      How well did you manage the trade overall?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes & Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>Notes & Lessons</CardTitle>
            <CardDescription>
              Add observations, thoughts, and lessons learned from this trade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What happened during this trade? What was your thought process?"
                      className="min-h-[100px] resize-y"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lessons"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lessons Learned</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did you learn from this trade? What would you do differently next time?"
                      className="min-h-[100px] resize-y"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Capture key takeaways to improve your future trading
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Update Trade" : "Save Trade"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
