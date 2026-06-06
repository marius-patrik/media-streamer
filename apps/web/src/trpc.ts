import type { AppRouter } from "@tailstreamer/api/router";
import { QueryClient } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

export const queryClient = new QueryClient();
export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: "/trpc",
    }),
  ],
});
