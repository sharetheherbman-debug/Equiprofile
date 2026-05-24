import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PlanAwareLayout from "@/components/PlanAwareLayout";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Check,
  CreditCard,
  Calendar,
  AlertCircle,
  Sparkles,
  Crown,
  Building2,
  GraduationCap,
  School,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DEFAULT_PRICING, penceToGBP } from "@shared/pricing";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

const YEARLY_SAVINGS_PERCENTAGE = Math.round(
  ((DEFAULT_PRICING.individual.monthly.amount * 12 -
    DEFAULT_PRICING.individual.yearly.amount) /
    (DEFAULT_PRICING.individual.monthly.amount * 12)) *
    100,
);

export default function BillingPage() {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const billingAccessLocked =
    user?.subscriptionStatus === "expired" ||
    user?.subscriptionStatus === "overdue" ||
    user?.subscriptionStatus === "cancelled" ||
    (user?.subscriptionStatus === "trial" &&
      !!user?.trialEndsAt &&
      new Date(user.trialEndsAt).getTime() <= Date.now());

  const { data: pricing } = trpc.billing.getPricing.useQuery();
  const { data: subscriptionStatus, refetch: refetchStatus } =
    trpc.billing.getStatus.useQuery();

  // Check if the user belongs to a school organization (student/teacher under a school)
  const { data: orgData } = trpc.school.getMyOrganization.useQuery(undefined, {
    enabled: !!user && !billingAccessLocked,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const isSchoolLinked = !!orgData && orgData.myRole !== "school_owner";
  const schoolOrgName = orgData?.name;

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onError: (error) => {
      toast.error("Checkout failed", { description: error.message });
    },
  });
  const createPortal = trpc.billing.createPortal.useMutation({
    onError: (error) => {
      toast.error("Portal failed", { description: error.message });
    },
  });

  // Handle checkout success/cancelled URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Subscription activated!", {
        description:
          "Welcome to EquiProfile. Your subscription is now active.",
      });
      // Refetch subscription status to reflect the new state
      refetchStatus();
      // Clean up URL parameters
      window.history.replaceState({}, "", "/billing");
    } else if (params.get("canceled") === "true") {
      toast.error("Checkout cancelled", {
        description: "No charges were made. You can try again anytime.",
      });
      window.history.replaceState({}, "", "/billing");
    }
  }, [refetchStatus]);

  const trialDaysLeft = user?.trialEndsAt
    ? Math.ceil(
        (new Date(user.trialEndsAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const isTrialActive =
    user?.subscriptionStatus === "trial" && trialDaysLeft > 0;
  const isSubscriptionActive = user?.subscriptionStatus === "active";
  const isTrialExpired =
    user?.subscriptionStatus === "trial" && trialDaysLeft <= 0;

  const handleSubscribe = async (plan: "pro" | "stable") => {
    try {
      const result = await createCheckout.mutateAsync({
        plan,
        interval: billingPeriod,
      });
      if (result.url) window.location.href = result.url;
    } catch {
      // error handled by mutation onError
    }
  };

  const handleManageSubscription = async () => {
    try {
      const result = await createPortal.mutateAsync();
      if (result.url) window.location.href = result.url;
    } catch {
      // error handled by mutation onError
    }
  };

  const formatPrice = (amountInPence: number | undefined): string => {
    if (!amountInPence || amountInPence <= 0)
      return penceToGBP(DEFAULT_PRICING.individual.monthly.amount);
    return penceToGBP(amountInPence);
  };

  const getProPrice = () => {
    const amount =
      billingPeriod === "monthly"
        ? (pricing?.pro?.monthly?.amount ??
          DEFAULT_PRICING.individual.monthly.amount)
        : (pricing?.pro?.yearly?.amount ??
          DEFAULT_PRICING.individual.yearly.amount);
    return formatPrice(amount);
  };

  const getStablePrice = () => {
    const amount =
      billingPeriod === "monthly"
        ? (pricing?.stable?.monthly?.amount ??
          DEFAULT_PRICING.stable.monthly.amount)
        : (pricing?.stable?.yearly?.amount ??
          DEFAULT_PRICING.stable.yearly.amount);
    return formatPrice(amount);
  };

  const isCurrentPlan = (plan: string) => {
    if (!subscriptionStatus) return false;
    // planTier is included in the response from billing.getStatus (tRPC inferred type)
    const planTier = (subscriptionStatus as { planTier?: string }).planTier ?? "pro";
    if (plan === "trial") return subscriptionStatus.status === "trial";
    if (plan === "student") return planTier === "student";
    if (plan === "pro")
      return (
        planTier === "pro" &&
        (subscriptionStatus.plan === "monthly" || subscriptionStatus.plan === "yearly")
      );
    if (plan === "stable")
      return (
        planTier === "stable" ||
        (subscriptionStatus.plan as string) === "stable_monthly" ||
        (subscriptionStatus.plan as string) === "stable_yearly"
      );
    return false;
  };

  const trialFeatures: readonly string[] = pricing?.trial?.features ?? [
    "7-day free trial",
    "1 horse only",
    "ALL features enabled",
    "Basic health records",
    "Training session logging",
    "Email support",
  ];

  const proFeatures: readonly string[] = pricing?.pro?.features ?? [
    "Up to 5 horses",
    "Complete health tracking",
    "Advanced training logs",
    "Competition results",
    "AI weather analysis (50/day)",
    "Email reminders",
    "Export to CSV/PDF",
  ];

  const stableFeatures: readonly string[] = pricing?.stable?.features ?? [
    "Everything in Pro, plus:",
    "Up to 20 horses",
    "Up to 5 users",
    "Role-based permissions",
    "Stable management",
    "Unlimited AI weather",
    "Advanced analytics",
    "Priority email support",
    "WhatsApp support",
  ];

  const studentFeatures: readonly string[] = [
    "1 virtual or assigned horse",
    "Daily care task tracking",
    "Training log & progress",
    "Study hub access",
    "AI tutor support",
    "Achievement badges",
    "Progress reports",
  ];

  const freeFeatures: readonly string[] = pricing?.trial?.features ?? [
    "7-day free trial",
    "1 horse only",
    "ALL features enabled",
    "Basic health records",
    "Training session logging",
    "Email support",
  ];

  return (
    <PlanAwareLayout>
      <PageTransition>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <PageHeader title="Billing & Subscription" />
            <p className="text-muted-foreground">
              Manage your subscription and billing information
            </p>
          </div>

          {/* Stripe disabled state */}
          {pricing && !pricing.enabled && (
            <Alert className="mb-8">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Billing is not configured. Contact your administrator.
              </AlertDescription>
            </Alert>
          )}

          {/* School-managed subscription notice */}
          {isSchoolLinked && (
            <Card className="mb-8 border-[#2e86ab]/30 bg-[#2e86ab]/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="w-5 h-5 text-[#2e86ab]" />
                  School-Managed Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your account is managed by{" "}
                  <strong className="text-foreground">{schoolOrgName || "your school"}</strong>.
                  Your subscription, billing, and seat allocation are handled by your school administrator.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  If you have questions about your access or plan, please contact your school administrator directly.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Current Status Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isTrialActive && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">Free Trial</Badge>
                      <span className="text-sm text-muted-foreground">
                        {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"}{" "}
                        remaining
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your trial ends on{" "}
                      <strong>
                        {user?.trialEndsAt
                          ? new Date(user.trialEndsAt).toLocaleDateString()
                          : "N/A"}
                      </strong>
                      . Subscribe to continue using all features.
                    </p>
                  </div>
                )}

                {isTrialExpired && (
                  <div>
                    <Badge variant="destructive" className="mb-2">
                      Trial Ended
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Your trial has ended. Please subscribe to regain access to
                      all features.
                    </p>
                  </div>
                )}

                {isSubscriptionActive && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="bg-green-600">
                        Active
                      </Badge>
                      <span className="text-sm text-muted-foreground capitalize">
                        {user?.subscriptionPlan || "Monthly"} Plan
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Next billing date:{" "}
                        <strong>
                          {user?.subscriptionEndsAt
                            ? new Date(
                                user.subscriptionEndsAt,
                              ).toLocaleDateString()
                            : "N/A"}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {isSubscriptionActive && (
                <div className="mt-6">
                  <Button
                    onClick={handleManageSubscription}
                    variant="outline"
                    disabled={createPortal.isPending}
                  >
                    {createPortal.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Update payment method, view invoices, or cancel subscription
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Period Toggle — hidden for school-linked users */}
          {!isSubscriptionActive && !isSchoolLinked && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Choose Your Plan</h2>
                <div className="inline-flex items-center gap-2 bg-muted rounded-full p-1 self-start sm:self-auto">
                  <button
                    onClick={() => setBillingPeriod("monthly")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      billingPeriod === "monthly"
                        ? "bg-background shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod("yearly")}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      billingPeriod === "yearly"
                        ? "bg-background shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yearly
                    <span className="ml-1.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                      Save {YEARLY_SAVINGS_PERCENTAGE}%
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 max-w-6xl mx-auto">
                {/* Free Trial */}
                <Card className={`border-2 flex flex-col ${isCurrentPlan("trial") ? "border-primary" : "border-muted"}`}>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Free Trial
                        {isCurrentPlan("trial") && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Try all features with 1 horse
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <div className="mb-5">
                      <div className="text-3xl font-bold">Free</div>
                      <div className="text-muted-foreground text-sm">
                        for 7 days
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {freeFeatures.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan("trial") ? (
                      <Button variant="secondary" className="w-full mt-auto" disabled>
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full mt-auto"
                        disabled
                      >
                        Trial Only
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Student Plan */}
                <Card className={`border-2 flex flex-col ${isCurrentPlan("student") ? "border-primary" : "border-muted"}`}>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Student
                        {isCurrentPlan("student") && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      For equestrian learners
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <div className="mb-5">
                      <div className="text-3xl font-bold">
                        £{billingPeriod === "monthly" ? penceToGBP(DEFAULT_PRICING.student.monthly.amount) : penceToGBP(DEFAULT_PRICING.student.yearly.amount)}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        per {billingPeriod === "monthly" ? "month" : "year"}
                        {billingPeriod === "yearly" && (
                          <span className="ml-2 text-xs text-green-600">
                            (£{(DEFAULT_PRICING.student.yearly.amount / 100 / 12).toFixed(2)}/mo)
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {studentFeatures.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan("student") ? (
                      <Button variant="secondary" className="w-full mt-auto" disabled>
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full mt-auto"
                        onClick={() => window.location.href = "/students"}
                      >
                        Learn More
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className="border-2 border-primary relative flex flex-col">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3">
                      Most Popular
                    </Badge>
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {pricing?.pro?.name ?? "Pro"}
                        {isCurrentPlan("pro") && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      For individual horse owners — up to 5 horses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <div className="mb-5">
                      <div className="text-3xl font-bold">£{getProPrice()}</div>
                      <div className="text-muted-foreground text-sm">
                        per {billingPeriod === "monthly" ? "month" : "year"}
                        {billingPeriod === "yearly" && (
                          <span className="ml-2 text-xs text-green-600">
                            (£
                            {(
                              (pricing?.pro?.yearly?.amount ??
                                DEFAULT_PRICING.individual.yearly.amount) /
                              100 /
                              12
                            ).toFixed(2)}
                            /mo)
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {proFeatures.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan("pro") ? (
                      <Button
                        className="w-full mt-auto"
                        disabled
                        variant="secondary"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe("pro")}
                        className="w-full mt-auto bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white border-0"
                        disabled={createCheckout.isPending}
                      >
                        {createCheckout.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Choose Pro"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Stable Plan */}
                <Card
                  className={`border-2 flex flex-col ${isCurrentPlan("stable") ? "border-primary" : "border-muted"}`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {pricing?.stable?.name ?? "Stable"}
                        {isCurrentPlan("stable") && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      For stables managing multiple horses, staff, and owners
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <div className="mb-5">
                      <div className="text-3xl font-bold">
                        £{getStablePrice()}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        per {billingPeriod === "monthly" ? "month" : "year"}
                        {billingPeriod === "yearly" && (
                          <span className="ml-2 text-xs text-green-600">
                            (£
                            {(
                              (pricing?.stable?.yearly?.amount ??
                                DEFAULT_PRICING.stable.yearly.amount) /
                              100 /
                              12
                            ).toFixed(2)}
                            /mo)
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                      {stableFeatures.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrentPlan("stable") ? (
                      <Button variant="secondary" className="w-full mt-auto" disabled>
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe("stable")}
                        className="w-full mt-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0"
                        disabled={createCheckout.isPending}
                      >
                        {createCheckout.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Choose Stable"
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>All plans include a secure checkout powered by Stripe.</p>
                <p className="mt-2">Cancel anytime. No questions asked.</p>
              </div>
            </>
          )}

          {/* Active subscriber: show manage options */}
          {isSubscriptionActive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plan Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    To upgrade or change your plan, use{" "}
                    <strong>Manage Subscription</strong> above or contact{" "}
                    <a
                      href="mailto:hello@equiprofile.online"
                      className="underline"
                    >
                      hello@equiprofile.online
                    </a>
                    .
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </PageTransition>
    </PlanAwareLayout>
  );
}
