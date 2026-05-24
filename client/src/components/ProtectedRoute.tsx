import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  stableOnly?: boolean;
  studentOnly?: boolean;
  teacherOnly?: boolean;
}

/**
 * Protected route wrapper
 *
 * Ensures user is authenticated before rendering children.
 * Redirects to login if not authenticated.
 * Optionally can require admin role, stable plan, or student plan.
 */
export function ProtectedRoute({
  children,
  requireAdmin = false,
  stableOnly = false,
  studentOnly = false,
  teacherOnly = false,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated, error } = useAuth();
  const [location, setLocation] = useLocation();

  const isStablePlan = (() => {
    if (!user?.preferences) return false;
    try {
      const prefs = JSON.parse(user.preferences);
      return prefs.planTier === "stable" || !!prefs.bothDashboardsUnlocked;
    } catch {
      return false;
    }
  })();

  const isStudentPlan = (() => {
    if (!user?.preferences) return false;
    try {
      const prefs = JSON.parse(user.preferences);
      return prefs.planTier === "student" || prefs.selectedExperience === "student";
    } catch {
      return false;
    }
  })();

  const isTeacherPlan = (() => {
    if (!user?.preferences) return false;
    try {
      const prefs = JSON.parse(user.preferences);
      return prefs.planTier === "teacher" || prefs.selectedExperience === "teacher";
    } catch {
      return false;
    }
  })();

  const isAdmin = user?.role === "admin";
  const trialEndsAt = user?.trialEndsAt
    ? new Date(user.trialEndsAt)
    : user?.createdAt
      ? new Date(new Date(user.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;
  const accessExpired =
    !isAdmin &&
    user?.subscriptionStatus === "trial" &&
    !!trialEndsAt &&
    trialEndsAt.getTime() <= Date.now();
  const subscriptionLocked =
    !isAdmin &&
    (user?.subscriptionStatus === "expired" ||
      user?.subscriptionStatus === "overdue" ||
      (user?.subscriptionStatus === "cancelled" &&
        !!user?.subscriptionEndsAt &&
        new Date(user.subscriptionEndsAt).getTime() <= Date.now()));
  const isBillingRecoveryRoute =
    location.startsWith("/billing") || location.startsWith("/pricing");
  const shouldShowPaywall =
    isAuthenticated &&
    (accessExpired || subscriptionLocked) &&
    !isBillingRecoveryRoute;

  useEffect(() => {
    if (loading) return;

    // If there's a network/fetch error but we had a previous user in cache,
    // don't redirect — the user may still have a valid session and just had
    // a momentary network issue. Only redirect if we definitively have no auth.
    if (!isAuthenticated && !error) {
      const oauthUrl = getLoginUrl();
      const returnUrl = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      const loginUrl = oauthUrl
        ? `${oauthUrl}&returnUrl=${returnUrl}`
        : `/login?returnUrl=${returnUrl}`;
      window.location.href = loginUrl;
      return;
    }

    // If there's a network error but no cached user, redirect to login
    if (!isAuthenticated && error) {
      // Check if we have cached user info — if so, don't redirect yet
      const cachedUser = localStorage.getItem("equiprofile-user-info");
      if (!cachedUser) {
        const loginUrl = `/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        window.location.href = loginUrl;
        return;
      }
      // If we have cached user but server returned error, wait for retry
      return;
    }

    if (requireAdmin && !isAdmin) {
      // Redirect to dashboard if user is not admin
      setLocation("/dashboard");
    }

    if (stableOnly && !isStablePlan && !isAdmin) {
      toast.error("This feature requires the Stable plan. Upgrade to access.");
      setLocation("/billing");
    }

    if (studentOnly && !isStudentPlan && !isAdmin) {
      toast.error("This feature requires the Student plan.");
      setLocation("/dashboard");
    }

    if (teacherOnly && !isTeacherPlan && !isAdmin) {
      toast.error("This feature requires the Teacher plan.");
      setLocation("/dashboard");
    }
  }, [
    loading,
    isAuthenticated,
    error,
    requireAdmin,
    stableOnly,
    studentOnly,
    teacherOnly,
    isStablePlan,
    isStudentPlan,
    isTeacherPlan,
    isAdmin,
    user,
    setLocation,
  ]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render until authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (shouldShowPaywall) {
    const title = accessExpired
      ? "Your free trial has ended"
      : "Your subscription needs attention";
    const description = accessExpired
      ? "Subscribe to restore dashboard access and keep using your existing EquiProfile data."
      : "Renew or update your payment method to regain access to protected dashboard tools.";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border bg-card shadow-xl p-6 sm:p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-7 w-7 text-primary" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
            <AlertCircle className="h-3.5 w-3.5" />
            Access paused
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {title}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground">
            {description}
          </p>
          <div className="mt-6 grid gap-3 rounded-xl border bg-muted/35 p-4 text-left text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>Your account data is preserved while billing is resolved.</span>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>Billing, account settings, and admin preview remain available.</span>
            </div>
          </div>
          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={() => setLocation("/billing")}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              View Plans & Restore Access
            </button>
            <button
              type="button"
              onClick={() => setLocation("/contact")}
              className="inline-flex h-11 items-center justify-center rounded-lg border bg-background px-5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if admin required but user is not admin
  if (requireAdmin && !isAdmin) {
    return null;
  }

  // Don't render if stable plan required but user is not on stable plan (admin bypasses)
  if (stableOnly && !isStablePlan && !isAdmin) {
    return null;
  }

  // Don't render if student plan required but user is not on student plan (admin bypasses)
  if (studentOnly && !isStudentPlan && !isAdmin) {
    return null;
  }

  // Don't render if teacher plan required but user is not on teacher plan (admin bypasses)
  if (teacherOnly && !isTeacherPlan && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Stable plan route - requires Stable subscription tier.
 * Redirects to /billing with toast if user is on a lower plan.
 */
export function StableRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute stableOnly>{children}</ProtectedRoute>;
}

/**
 * Student plan route - requires Student subscription tier.
 * Admin can always access.
 */
export function StudentRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute studentOnly>{children}</ProtectedRoute>;
}

/**
 * Teacher plan route - requires Teacher subscription tier.
 * Admin can always access.
 */
export function TeacherRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute teacherOnly>{children}</ProtectedRoute>;
}

export default ProtectedRoute;
