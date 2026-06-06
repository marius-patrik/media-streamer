import { router } from "../trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { cloudRouter } from "./cloud";
import { downloadsRouter } from "./downloads";
import { libraryRouter } from "./library";
import { metadataRouter } from "./metadata";
import { playerRouter } from "./player";
import { titlesRouter } from "./titles";
import { usersRouter } from "./users";

export const appRouter = router({
  admin: adminRouter,
  auth: authRouter,
  cloud: cloudRouter,
  downloads: downloadsRouter,
  library: libraryRouter,
  metadata: metadataRouter,
  player: playerRouter,
  titles: titlesRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
