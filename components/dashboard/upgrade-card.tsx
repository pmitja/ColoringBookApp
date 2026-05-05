import Image from "next/image";

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
    <Card className="relative overflow-hidden border-border/80 bg-accent/30 md:max-xl:rounded-none md:max-xl:border-none md:max-xl:shadow-none">
      <Image
        src="/illustrations/landing-book.svg"
        alt=""
        width={72}
        height={72}
        className="pointer-events-none absolute right-3 top-3 opacity-40 animate-floaty-slow"
      />
      <CardHeader className="relative space-y-2 md:max-xl:px-4">
        <CardTitle className="font-heading text-base font-semibold text-foreground">
          Upgrade to Higher Plan
        </CardTitle>
        <CardDescription className="max-w-[90%] text-sm leading-snug text-foreground/80">
          Upgrade your tier to a higher plan for more features and priority processing.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative md:max-xl:px-4">
        <Button size="sm" className="w-full rounded-full">
          Upgrade
        </Button>
      </CardContent>
    </Card>
  );
}
