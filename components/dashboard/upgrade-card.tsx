import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function UpgradeCard() {
  return (
    <Card className="border-border/80 bg-card/95 rounded-3xl dark:border-slate-700 dark:bg-slate-800 md:max-xl:rounded-none md:max-xl:border-none md:max-xl:shadow-none">
      <CardHeader className="space-y-2 md:max-xl:px-4">
        <CardTitle className="text-base font-semibold text-foreground dark:text-slate-50">
          Upgrade to Higher Plan
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground dark:text-slate-400">
          Upgrade your tier to a higher plan for more features and priority processing.
        </CardDescription>
      </CardHeader>
      <CardContent className="md:max-xl:px-4">
        <Button size="sm" className="w-full rounded-full">
          Upgrade
        </Button>
      </CardContent>
    </Card>
  );
}
