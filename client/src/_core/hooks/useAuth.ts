// Copyright (c) 2025-2026 Amarktai Network. All rights reserved.
import { TRPCClientError } from "@trpc/client";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/** Clear all client-side auth state from storage */
function clearLocalAuthState() {
  localStorage.removeItem("equiprofile-user-info");
  sessionStorage.removeItem("equiprofile-user-info");
  // Clear AI chat session so a subsequent login doesn't see the previous user's conversation
  sessionStorage.removeItem("equiprofile_ai_chat_session");
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    // Retry up to 3 times on transient network errors, but never on auth or
    // rate-limit errors — retrying those would flood the server and worsen the
    // "too many requests" lock-out that users sometimes encounter after logout.
    retry: (failureCount, error) => {
      if (error instanceof TRPCClientError) {
        const code = (error as any)?.data?.code;
        if (
          code === "TOO_MANY_REQUESTS" ||
          code === "UNAUTHORIZED" ||
          code === "FORBIDDEN"
        )
          return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    // Keep staleTime moderate so frequent re-fetches don't cause unnecessary
    // flicker or race conditions. 60s is enough to detect logout quickly
    // while avoiding excessive network requests.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    // Keep cached data while refetching in background to prevent flash
    // of unauthenticated state during network requests
    placeholderData: (prev: any) => prev,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Immediately clear TRPC cache for the "me" query
      utils.auth.me.setData(undefined, null);
      // Clear all client-side auth storage
      clearLocalAuthState();
      // Hard navigate to login — this fully unloads React state and all cached queries.
      // No utils.invalidate() call here: we're navigating away immediately, so any
      // background refetch it would schedule would be wasted and could race with
      // the cookie-clearing Set-Cookie header the server just sent.
      window.location.href = "/login";
    },
    onError: () => {
      // Even on error, ensure client state is cleared before redirecting
      clearLocalAuthState();
      utils.auth.me.setData(undefined, null);
      window.location.href = "/login";
    },
  });

  const logout = useCallback(async () => {
    // Eagerly clear local state before the request completes
    clearLocalAuthState();
    utils.auth.me.setData(undefined, null);
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      // Clear state and redirect regardless of error type.
      // The onError handler in useMutation also navigates to /login, but we
      // catch here too so callers that don't await logout() don't see an
      // unhandled promise rejection.
      clearLocalAuthState();
      utils.auth.me.setData(undefined, null);
      window.location.href = "/login";
    }
    // No finally block needed: onSuccess/onError both hard-navigate to /login,
    // which fully reloads the page and clears all in-memory state.
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  // Persist user info to localStorage for offline/quick reads (side effect).
  // Cleared explicitly on logout via clearLocalAuthState(); also cleared here
  // when the server returns null/undefined (session expired or revoked).
  useEffect(() => {
    if (meQuery.data) {
      localStorage.setItem(
        "equiprofile-user-info",
        JSON.stringify(meQuery.data),
      );
    } else if (meQuery.data === null) {
      // Server explicitly returned null — session is gone; clear cached identity
      clearLocalAuthState();
    }
  }, [meQuery.data]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
