import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Publishable Key for Clerk!");
}

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // If using dev auth and it failed, clear the stale token to break the redirect loop
  const devToken = localStorage.getItem("dev_auth_token");
  if (devToken) {
    localStorage.removeItem("dev_auth_token");
  }

  // Avoid redirect loop: don't redirect if already on the login page
  if (window.location.pathname === "/") return;

  window.location.href = getLoginUrl();
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
    console.error("[API Mutation Error]", error);
  }
});

function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  
  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        async fetch(input, init) {
          let token: string | null = null;
          try {
            token = await getToken();
          } catch (e) {
            // Clerk might not be loaded or throws in dev auth mode
          }
          const devToken = typeof window !== "undefined" ? localStorage.getItem("dev_auth_token") : null;
          
          return globalThis.fetch(input, {
            ...(init ?? {}),
            headers: {
              ...(init?.headers ?? {}),
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(devToken ? { "x-dev-auth-token": devToken } : {}),
            },
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
  <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </ClerkProvider>
);
