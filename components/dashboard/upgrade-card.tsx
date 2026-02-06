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
    <Card className="border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-white/5 md:max-xl:rounded-none md:max-xl:border-none md:max-xl:shadow-none">
      <CardHeader className="space-y-2 md:max-xl:px-4">
        <CardTitle className="text-base font-semibold">
          Upgrade to Pro
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Unlock unlimited books, priority processing, and pro templates.
        </CardDescription>
      </CardHeader>
      <CardContent className="md:max-xl:px-4">
        <Button size="sm" className="w-full rounded-xl">
          Upgrade
        </Button>
      </CardContent>
    </Card>
  );
}
