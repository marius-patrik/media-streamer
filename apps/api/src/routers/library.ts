import { runLibraryScan } from "../libraryScan";
import { roleProcedure, router } from "../trpc";

export const libraryRouter = router({
  scan: roleProcedure("ADMIN").mutation(({ ctx }) => runLibraryScan(ctx.env)),
});
