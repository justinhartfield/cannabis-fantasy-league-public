import { trpc } from "@/lib/trpc";
import { ADMIN_PASS_STORAGE_KEY, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const ADMIN_PASS_HEADER = "x-admin-pass";
const queryClient = new QueryClient();

function getStoredAdminPassword() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ADMIN_PASS_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  const loginUrl = getLoginUrl();
  if (loginUrl) {
    window.location.href = loginUrl;
  } else {
    // OAuth not configured, redirect to login page
    window.location.href = "/login";
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

/**
 * TRPCProvider component that wraps the app with tRPC client
 * This needs to be inside ClerkProvider to access Clerk's useAuth hook
 */
function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        async headers() {
          const token = await getToken();
          const headers: Record<string, string> = {};
          if (token) {
            headers.authorization = `Bearer ${token}`;
          }

          const adminPass = getStoredAdminPassword();
          if (adminPass) {
            headers[ADMIN_PASS_HEADER] = adminPass;
          }

          return headers;
        },
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    ],
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </ClerkProvider>
);
