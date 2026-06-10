import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { AppRouter } from './server/routers';
import "dotenv/config";

async function main() {
  const client = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/api/trpc',
        transformer: superjson,
        async fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            headers: {
              ...(init?.headers ?? {}),
              // We simulate the token missing or being invalid here
            },
          });
        },
      }),
    ],
  });

  try {
    const res = await client.builds.submitRepository.mutate({
      repoUrl: "https://github.com/my/repo"
    });
    console.log("Success:", res);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);
