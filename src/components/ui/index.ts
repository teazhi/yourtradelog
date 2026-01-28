// Re-export all UI components from shadcn-packaged
// This allows us to import from "@/components/ui" consistently

export * from "shadcn-packaged/ui/accordion";
export * from "shadcn-packaged/ui/alert";
export * from "shadcn-packaged/ui/alert-dialog";
export * from "shadcn-packaged/ui/avatar";
export * from "shadcn-packaged/ui/badge";
export * from "shadcn-packaged/ui/breadcrumb";
export * from "shadcn-packaged/ui/button";
export * from "shadcn-packaged/ui/calendar";
export * from "shadcn-packaged/ui/card";
export * from "shadcn-packaged/ui/carousel";
export * from "shadcn-packaged/ui/chart";
export * from "shadcn-packaged/ui/checkbox";
export * from "shadcn-packaged/ui/collapsible";
export * from "shadcn-packaged/ui/command";
export * from "shadcn-packaged/ui/context-menu";
export * from "shadcn-packaged/ui/dialog";
export * from "shadcn-packaged/ui/drawer";
export * from "shadcn-packaged/ui/dropdown-menu";
export * from "shadcn-packaged/ui/form";
export * from "shadcn-packaged/ui/hover-card";
export * from "shadcn-packaged/ui/input";
export * from "shadcn-packaged/ui/label";
export * from "shadcn-packaged/ui/menubar";
export * from "shadcn-packaged/ui/navigation-menu";
export * from "shadcn-packaged/ui/pagination";
export * from "shadcn-packaged/ui/popover";
export * from "shadcn-packaged/ui/progress";
export * from "shadcn-packaged/ui/radio-group";
export * from "shadcn-packaged/ui/resizable";
export * from "shadcn-packaged/ui/scroll-area";
export * from "shadcn-packaged/ui/select";
export * from "shadcn-packaged/ui/separator";
export * from "shadcn-packaged/ui/sheet";
export * from "shadcn-packaged/ui/sidebar";
export * from "shadcn-packaged/ui/skeleton";
export * from "shadcn-packaged/ui/slider";
export * from "shadcn-packaged/ui/sonner";
export * from "shadcn-packaged/ui/switch";
export * from "shadcn-packaged/ui/table";
export * from "shadcn-packaged/ui/tabs";
export * from "shadcn-packaged/ui/textarea";
export * from "shadcn-packaged/ui/toggle";
export * from "shadcn-packaged/ui/toggle-group";
export * from "shadcn-packaged/ui/tooltip";
export * from "shadcn-packaged/ui/spinner";

// Re-export hooks
export { useIsMobile } from "shadcn-packaged/hooks/use-mobile";
export { useSidebar, SidebarProvider } from "shadcn-packaged/ui/sidebar";

// Re-export utils
export { cn } from "shadcn-packaged/lib/utils";

// Re-export toast from sonner for convenience
export { toast } from "sonner";

// Custom components
export { Confetti, CelebrationModal, CelebrationBurst } from "./confetti";
export {
  CustomDialog,
  CustomDialogContent,
  CustomDialogDescription,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "./custom-dialog";
