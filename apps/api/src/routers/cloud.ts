import { prisma } from "@tailstreamer/db";
import {
  type CloudProviderTemplate,
  CloudTemplateError,
  defaultCloudProviderTemplates,
  renderCloudProviderUrl,
  validateCloudProviderTemplate,
} from "@tailstreamer/integrations";
import { TRPCError } from "@trpc/server";
import { readJsonSetting, writeJsonSetting } from "../settings";
import { authedProcedure, roleProcedure, router } from "../trpc";
import {
  type ResolveCloudSourceInput,
  resolveCloudSourceInputParser,
  updateCloudProvidersInputParser,
} from "../validation";

const cloudProvidersSettingKey = "cloud.providers";

export const cloudRouter = router({
  listProviders: authedProcedure.query(() => readCloudProviderTemplates()),

  updateProviderTemplates: roleProcedure("ADMIN")
    .input(updateCloudProvidersInputParser)
    .mutation(async ({ input }) => {
      const providers = input.providers.map((provider) => validateProvider(provider));
      ensureUniqueProviderIds(providers);
      await writeJsonSetting(prisma, cloudProvidersSettingKey, providers);
      return providers;
    }),

  resolveCloudSource: authedProcedure.input(resolveCloudSourceInputParser).mutation(async ({ input }) => {
    const providers = await readCloudProviderTemplates();
    const provider = providers.find((candidate) => candidate.id === input.providerId);
    if (!provider || !provider.enabled) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Cloud provider is not enabled" });
    }

    const subject = await resolveSubject(input);
    const externalId = await findExternalId(subject.titleId, subject.episodeId, provider.externalProvider);
    if (!externalId) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Required external ID is missing" });
    }

    const url = renderProviderUrl(provider, {
      externalId: externalId.value,
      season: subject.seasonNumber,
      episode: subject.episodeNumber,
    });
    const source = await prisma.cloudSource.upsert({
      where: { id: stableCloudSourceId(subject.titleId, subject.episodeId, provider.id) },
      create: {
        id: stableCloudSourceId(subject.titleId, subject.episodeId, provider.id),
        titleId: subject.titleId,
        episodeId: subject.episodeId,
        provider: provider.id,
        url,
        enabled: true,
      },
      update: { url, enabled: true },
      select: { id: true, titleId: true, episodeId: true, provider: true, url: true, enabled: true },
    });
    return source;
  }),
});

async function readCloudProviderTemplates() {
  const providers = await readJsonSetting<CloudProviderTemplate[]>(
    prisma,
    cloudProvidersSettingKey,
    defaultCloudProviderTemplates,
  );
  return providers.map((provider) => validateProvider(provider)).sort((left, right) => left.rank - right.rank);
}

function validateProvider(provider: CloudProviderTemplate) {
  try {
    return validateCloudProviderTemplate(provider);
  } catch (error) {
    if (error instanceof CloudTemplateError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

function renderProviderUrl(
  provider: CloudProviderTemplate,
  input: { externalId: string; season: number | null; episode: number | null },
) {
  try {
    return renderCloudProviderUrl(provider, input);
  } catch (error) {
    if (error instanceof CloudTemplateError) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw error;
  }
}

function ensureUniqueProviderIds(providers: CloudProviderTemplate[]) {
  const seen = new Set<string>();
  for (const provider of providers) {
    if (seen.has(provider.id)) throw new TRPCError({ code: "CONFLICT", message: "Duplicate cloud provider ID" });
    seen.add(provider.id);
  }
}

async function resolveSubject(input: ResolveCloudSourceInput) {
  if (!input.episodeId) {
    const title = await prisma.title.findUnique({ where: { id: input.titleId }, select: { id: true } });
    if (!title) throw new TRPCError({ code: "NOT_FOUND", message: "Title not found" });
    return { titleId: input.titleId, episodeId: null, seasonNumber: null, episodeNumber: null };
  }

  const episode = await prisma.episode.findFirst({
    where: { id: input.episodeId, titleId: input.titleId },
    select: { id: true, titleId: true, seasonNumber: true, episodeNumber: true },
  });
  if (!episode) throw new TRPCError({ code: "NOT_FOUND", message: "Episode not found" });
  return {
    titleId: episode.titleId,
    episodeId: episode.id,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
  };
}

async function findExternalId(
  titleId: string,
  episodeId: string | null,
  provider: CloudProviderTemplate["externalProvider"],
) {
  if (episodeId) {
    const episodeExternalId = await prisma.externalId.findFirst({
      where: { episodeId, provider },
      select: { value: true },
    });
    if (episodeExternalId) return episodeExternalId;
  }
  return prisma.externalId.findFirst({
    where: { titleId, episodeId: null, provider },
    select: { value: true },
  });
}

function stableCloudSourceId(titleId: string, episodeId: string | null, providerId: string) {
  return `cloud_${titleId}_${episodeId ?? "title"}_${providerId}`.replaceAll(/[^A-Za-z0-9_-]/g, "_");
}
