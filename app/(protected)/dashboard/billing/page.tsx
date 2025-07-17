import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardHeader } from "@/components/dashboard/header";
import { Icons } from "@/components/shared/icons";

export const metadata = constructMetadata({
  title: "Billing – Coloring Book Creator",
  description: "Manage your credits and billing information.",
});

export default async function BillingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Mock data - in real app, fetch from database
  const creditsUsed = (user as any)?.creditsUsed || 0;
  const creditsAllocated = (user as any)?.creditsAllocated || 3;
  const creditsRemaining = creditsAllocated - creditsUsed;
  const progressPercentage = (creditsUsed / creditsAllocated) * 100;

  return (
    <>
      <DashboardHeader
        heading="Credits & Billing"
        text="Manage your coloring book credits and billing information."
      />

      <div className="space-y-8">
        {/* Current Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Usage</span>
              <Badge variant={creditsRemaining > 0 ? "default" : "destructive"}>
                {creditsRemaining} credits left
              </Badge>
            </CardTitle>
            <CardDescription>
              Track your coloring book creation usage for this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Credits Used</span>
                <span>
                  {creditsUsed} of {creditsAllocated}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-600">
                  {creditsUsed}
                </p>
                <p className="text-sm text-muted-foreground">Used This Month</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-600">
                  {creditsRemaining}
                </p>
                <p className="text-sm text-muted-foreground">Remaining</p>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                {creditsRemaining > 0
                  ? `You can create ${creditsRemaining} more coloring books this month`
                  : "Credits will reset next month, or upgrade for unlimited access"}
              </p>

              {creditsRemaining === 0 && (
                <Button className="gap-2">
                  <Icons.billing className="h-4 w-4" />
                  Buy More Credits
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>
              Get unlimited coloring book creations and priority processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Free Plan */}
              <div className="space-y-4 rounded-lg border p-6">
                <div className="space-y-2">
                  <h3 className="font-semibold">Free Plan</h3>
                  <p className="text-2xl font-bold">
                    $0<span className="text-sm font-normal">/month</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Perfect for trying out the service
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />3 coloring
                    books per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    High-quality downloads
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Standard processing time
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.close className="h-4 w-4 text-gray-400" />
                    Priority support
                  </li>
                </ul>
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              </div>

              {/* Premium Plan */}
              <div className="relative space-y-4 rounded-lg border-2 border-primary p-6">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Premium Plan</h3>
                  <p className="text-2xl font-bold">
                    $9.99<span className="text-sm font-normal">/month</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For families who love creating
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Unlimited coloring books
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    High-quality downloads
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Priority processing (2x faster)
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Multiple export formats
                  </li>
                </ul>
                <Button className="w-full gap-2">
                  <Icons.billing className="h-4 w-4" />
                  Upgrade to Premium
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Packs */}
        <Card>
          <CardHeader>
            <CardTitle>One-Time Credit Packs</CardTitle>
            <CardDescription>
              Need just a few more coloring books? Buy credits without a
              subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-3 rounded-lg border p-4 text-center">
                <h4 className="font-semibold">5 Credits</h4>
                <p className="text-xl font-bold">$4.99</p>
                <p className="text-sm text-muted-foreground">
                  $1.00 per coloring book
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Buy Credits
                </Button>
              </div>
              <div className="space-y-3 rounded-lg border border-primary bg-primary/5 p-4 text-center">
                <h4 className="font-semibold">15 Credits</h4>
                <p className="text-xl font-bold">$12.99</p>
                <p className="text-sm text-muted-foreground">
                  $0.87 per coloring book
                </p>
                <Badge className="mb-2">Best Value</Badge>
                <Button size="sm" className="w-full">
                  Buy Credits
                </Button>
              </div>
              <div className="space-y-3 rounded-lg border p-4 text-center">
                <h4 className="font-semibold">30 Credits</h4>
                <p className="text-xl font-bold">$24.99</p>
                <p className="text-sm text-muted-foreground">
                  $0.83 per coloring book
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Buy Credits
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <Alert className="!pl-14">
          <Icons.warning />
          <AlertTitle>Demo Mode</AlertTitle>
          <AlertDescription className="text-balance">
            This is a demo app using Stripe test mode. You can use test card
            numbers from the{" "}
            <a
              href="https://stripe.com/docs/testing#cards"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-8"
            >
              Stripe documentation
            </a>{" "}
            to test the payment flow.
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}
