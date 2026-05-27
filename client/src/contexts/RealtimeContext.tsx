/**
 * Singleton SSE context — one EventSource per authenticated session.
 * All useRealtime() and useRealtimeModule() calls share this single connection.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/_core/hooks/useAuth";

type EventHandler = (data: any) => void;

interface RealtimeContextValue {
  isConnected: boolean;
  subscribe: (eventType: string, handler: EventHandler) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  subscribe: () => () => {},
});

const RECONNECT_BASE_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

// All event types the client can receive from the server
const ALL_EVENT_TYPES = [
  "connected",
  "horses:created",
  "horses:updated",
  "horses:deleted",
  "documents:uploaded",
  "documents:deleted",
  "tasks:created",
  "tasks:updated",
  "tasks:deleted",
  "tasks:completed",
  "health:created",
  "health:updated",
  "health:deleted",
  "health:appointment:created",
  "health:appointment:updated",
  "breeding:created",
  "breeding:updated",
  "breeding:deleted",
  "foal:created",
  "foal:updated",
  "finance:income:created",
  "finance:expense:created",
  "finance:invoice:created",
  "finance:invoice:updated",
  "sales:lead:created",
  "sales:lead:updated",
  "nutrition:log:created",
  "nutrition:plan:updated",
  "team:member:added",
  "team:member:removed",
  "report:generated",
  "file:uploaded",
  "file:deleted",
  "pedigree:created",
  "pedigree:updated",
  "pedigree:deleted",
  "nutritionPlans:created",
  "nutritionPlans:updated",
  "nutritionPlans:deleted",
  "dewormings:created",
  "dewormings:updated",
  "dewormings:deleted",
  "vaccinations:created",
  "vaccinations:updated",
  "vaccinations:deleted",
  "treatments:created",
  "treatments:updated",
  "treatments:deleted",
  "xrays:created",
  "xrays:updated",
  "xrays:deleted",
  "feedCosts:created",
  "feedCosts:updated",
  "feedCosts:deleted",
  "nutritionLogs:created",
  "nutritionLogs:updated",
  "nutritionLogs:deleted",
  "tags:created",
  "tags:updated",
  "tags:deleted",
  "hoofcare:created",
  "hoofcare:updated",
  "hoofcare:deleted",
  "dentalCare:created",
  "dentalCare:updated",
  "dentalCare:deleted",
  "appointments:created",
  "appointments:updated",
  "appointments:deleted",
  "messages:created",
  "messages:updated",
  "generation:updated",
];

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  // Prevent double-connect in StrictMode
  const connectingRef = useRef(false);
  const { isAuthenticated } = useAuth();

  const subscribe = useCallback(
    (eventType: string, handler: EventHandler): (() => void) => {
      if (!handlersRef.current.has(eventType)) {
        handlersRef.current.set(eventType, new Set());
      }
      handlersRef.current.get(eventType)!.add(handler);

      return () => {
        const handlers = handlersRef.current.get(eventType);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            handlersRef.current.delete(eventType);
          }
        }
      };
    },
    [],
  );

  useEffect(() => {
    // Only connect when the user is authenticated
    if (!isAuthenticated) {
      // Clean up any existing connection when user logs out
      if (reconnectTimeoutRef.current !== undefined) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      connectingRef.current = false;
      return;
    }

    if (connectingRef.current || eventSourceRef.current) return;
    connectingRef.current = true;

    function connect() {
      if (eventSourceRef.current) return;

      const es = new EventSource("/api/realtime/events", {
        withCredentials: true,
      });

      es.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();
        eventSourceRef.current = null;

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          connectingRef.current = false;
          return;
        }

        const attempt = reconnectAttemptsRef.current;
        reconnectAttemptsRef.current++;
        const delay = Math.min(
          RECONNECT_BASE_DELAY * Math.pow(2, attempt),
          120000,
        );
        reconnectTimeoutRef.current = window.setTimeout(async () => {
          try {
            const res = await fetch("/api/trpc/auth.me", {
              credentials: "include",
            });
            if (res.status === 401) {
              // Not authenticated — stop reconnecting silently
              connectingRef.current = false;
              return;
            }
          } catch {
            // network error — proceed with reconnect
          }
          connect();
        }, delay);
      };

      ALL_EVENT_TYPES.forEach((eventType) => {
        es.addEventListener(eventType, (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            const handlers = handlersRef.current.get(eventType);
            if (handlers) {
              handlers.forEach((h) => {
                try {
                  h(data);
                } catch (err) {
                  console.error(`[SSE] Handler error for ${eventType}:`, err);
                }
              });
            }
          } catch (err) {
            console.error(`[SSE] Parse error for ${eventType}:`, err);
          }
        });
      });

      eventSourceRef.current = es;
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current !== undefined) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      connectingRef.current = false;
    };
  }, [isAuthenticated]);

  return (
    <RealtimeContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextValue {
  return useContext(RealtimeContext);
}
