import * as v from "valibot";

const emailSchema = v.pipe(v.string(), v.trim(), v.email(), v.toLowerCase());
const passwordSchema = v.pipe(v.string(), v.trim(), v.minLength(8), v.maxLength(512));

const loginSchema = v.object({
  email: emailSchema,
  password: passwordSchema,
});

const bootstrapSchema = v.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80)),
  bootstrapSecret: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(512)),
});

const userRoleSchema = v.picklist(["ADMIN", "DOWNLOADER", "VIEWER"]);
const titleKindSchema = v.picklist(["MOVIE", "SHOW"]);
const createdFromSchema = v.picklist(["LOCAL_SCAN", "TMDB", "CLOUD", "DOWNLOAD_SEARCH", "MANUAL"]);
const matchStatusSchema = v.picklist(["MATCHED", "UNMATCHED", "NEEDS_REVIEW"]);
const externalProviderSchema = v.picklist(["TMDB", "PROWLARR", "CLOUD_PROVIDER"]);
const tmdbKindSchema = v.picklist(["MOVIE", "SHOW"]);

const createUserSchema = v.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80)),
  role: userRoleSchema,
});

const updateUserRoleSchema = v.object({
  userId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  role: userRoleSchema,
});

const userIdSchema = v.object({
  userId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
});

const changePasswordSchema = v.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

const optionalEpisodeIdSchema = v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128))));

const playerSubjectSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  episodeId: optionalEpisodeIdSchema,
});

const saveProgressSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  episodeId: optionalEpisodeIdSchema,
  progressSeconds: v.pipe(v.number(), v.integer(), v.minValue(0)),
  durationSeconds: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))),
});

const saveLastSourceSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  episodeId: optionalEpisodeIdSchema,
  sourceType: v.picklist(["LOCAL", "DOWNLOAD", "CLOUD"]),
  sourceId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
});

const titleIdSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
});

const titleSearchSchema = v.object({
  query: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(120))),
  kind: v.optional(titleKindSchema),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(50))),
});

const externalIdInputSchema = v.object({
  provider: externalProviderSchema,
  value: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
});

const openOrCreateTitleSchema = v.object({
  kind: titleKindSchema,
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(180)),
  year: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1870), v.maxValue(2200)))),
  overview: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(4000)))),
  posterPath: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(512)))),
  backdropPath: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(512)))),
  createdFrom: v.optional(createdFromSchema),
  externalId: v.optional(externalIdInputSchema),
});

const rematchTitleSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  matchStatus: matchStatusSchema,
  name: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(180))),
  year: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1870), v.maxValue(2200)))),
  overview: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(4000)))),
  posterPath: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(512)))),
  backdropPath: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(512)))),
  externalId: v.optional(externalIdInputSchema),
});

const createEpisodeSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  seasonNumber: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(200)),
  episodeNumber: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1000)),
  name: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(180)))),
  overview: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(4000)))),
});

const tmdbSearchSchema = v.object({
  kind: tmdbKindSchema,
  query: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(180)),
  page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500))),
});

const tmdbDetailsSchema = v.object({
  kind: tmdbKindSchema,
  tmdbId: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const tmdbTrendingSchema = v.object({
  kind: tmdbKindSchema,
  page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(500))),
});

const tmdbOpenTitleSchema = v.object({
  kind: tmdbKindSchema,
  tmdbId: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const tmdbRematchTitleSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  kind: tmdbKindSchema,
  tmdbId: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const cloudProviderTemplateSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80)),
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)),
  enabled: v.boolean(),
  rank: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1000)),
  externalProvider: externalProviderSchema,
  movieUrlTemplate: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(1000)),
  episodeUrlTemplate: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(1000)),
});

const updateCloudProvidersSchema = v.object({
  providers: v.pipe(v.array(cloudProviderTemplateSchema), v.maxLength(50)),
});

const resolveCloudSourceSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  episodeId: optionalEpisodeIdSchema,
  providerId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80)),
});

const prowlarrSearchSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  episodeId: optionalEpisodeIdSchema,
  query: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(220)),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100))),
});

const titleCandidateListSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  episodeId: optionalEpisodeIdSchema,
});

const addMagnetDownloadSchema = v.object({
  titleId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  episodeId: optionalEpisodeIdSchema,
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(300)),
  magnetUri: v.pipe(v.string(), v.trim(), v.startsWith("magnet:"), v.maxLength(8000)),
  review: v.optional(v.boolean()),
});

const startCandidateDownloadSchema = v.object({
  candidateId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  review: v.optional(v.boolean()),
});

const downloadJobIdSchema = v.object({
  jobId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
});

const deleteDownloadJobSchema = v.object({
  jobId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  deleteFiles: v.optional(v.boolean()),
});

export type LoginInput = v.InferOutput<typeof loginSchema>;
export type BootstrapInput = v.InferOutput<typeof bootstrapSchema>;
export type CreateUserInput = v.InferOutput<typeof createUserSchema>;
export type UpdateUserRoleInput = v.InferOutput<typeof updateUserRoleSchema>;
export type UserIdInput = v.InferOutput<typeof userIdSchema>;
export type ChangePasswordInput = v.InferOutput<typeof changePasswordSchema>;
export type PlayerSubjectInput = v.InferOutput<typeof playerSubjectSchema>;
export type SaveProgressInput = v.InferOutput<typeof saveProgressSchema>;
export type SaveLastSourceInput = v.InferOutput<typeof saveLastSourceSchema>;
export type TitleSearchInput = v.InferOutput<typeof titleSearchSchema>;
export type OpenOrCreateTitleInput = v.InferOutput<typeof openOrCreateTitleSchema>;
export type RematchTitleInput = v.InferOutput<typeof rematchTitleSchema>;
export type CreateEpisodeInput = v.InferOutput<typeof createEpisodeSchema>;
export type TmdbSearchInput = v.InferOutput<typeof tmdbSearchSchema>;
export type TmdbDetailsInput = v.InferOutput<typeof tmdbDetailsSchema>;
export type TmdbTrendingInput = v.InferOutput<typeof tmdbTrendingSchema>;
export type TmdbOpenTitleInput = v.InferOutput<typeof tmdbOpenTitleSchema>;
export type TmdbRematchTitleInput = v.InferOutput<typeof tmdbRematchTitleSchema>;
export type CloudProviderTemplateInput = v.InferOutput<typeof cloudProviderTemplateSchema>;
export type UpdateCloudProvidersInput = v.InferOutput<typeof updateCloudProvidersSchema>;
export type ResolveCloudSourceInput = v.InferOutput<typeof resolveCloudSourceSchema>;
export type ProwlarrSearchInput = v.InferOutput<typeof prowlarrSearchSchema>;
export type TitleCandidateListInput = v.InferOutput<typeof titleCandidateListSchema>;
export type AddMagnetDownloadInput = v.InferOutput<typeof addMagnetDownloadSchema>;
export type StartCandidateDownloadInput = v.InferOutput<typeof startCandidateDownloadSchema>;
export type DownloadJobIdInput = v.InferOutput<typeof downloadJobIdSchema>;
export type DeleteDownloadJobInput = v.InferOutput<typeof deleteDownloadJobSchema>;

export const loginInputParser = {
  parse(input: unknown) {
    return v.parse(loginSchema, input);
  },
};

export const bootstrapInputParser = {
  parse(input: unknown) {
    return v.parse(bootstrapSchema, input);
  },
};

export const createUserInputParser = {
  parse(input: unknown) {
    return v.parse(createUserSchema, input);
  },
};

export const updateUserRoleInputParser = {
  parse(input: unknown) {
    return v.parse(updateUserRoleSchema, input);
  },
};

export const userIdInputParser = {
  parse(input: unknown) {
    return v.parse(userIdSchema, input);
  },
};

export const changePasswordInputParser = {
  parse(input: unknown) {
    return v.parse(changePasswordSchema, input);
  },
};

export const playerSubjectInputParser = {
  parse(input: unknown) {
    return v.parse(playerSubjectSchema, input);
  },
};

export const saveProgressInputParser = {
  parse(input: unknown) {
    return v.parse(saveProgressSchema, input);
  },
};

export const saveLastSourceInputParser = {
  parse(input: unknown) {
    return v.parse(saveLastSourceSchema, input);
  },
};

export const titleIdInputParser = {
  parse(input: unknown) {
    return v.parse(titleIdSchema, input);
  },
};

export const titleSearchInputParser = {
  parse(input: unknown) {
    return v.parse(titleSearchSchema, input);
  },
};

export const openOrCreateTitleInputParser = {
  parse(input: unknown) {
    return v.parse(openOrCreateTitleSchema, input);
  },
};

export const rematchTitleInputParser = {
  parse(input: unknown) {
    return v.parse(rematchTitleSchema, input);
  },
};

export const createEpisodeInputParser = {
  parse(input: unknown) {
    return v.parse(createEpisodeSchema, input);
  },
};

export const tmdbSearchInputParser = {
  parse(input: unknown) {
    return v.parse(tmdbSearchSchema, input);
  },
};

export const tmdbDetailsInputParser = {
  parse(input: unknown) {
    return v.parse(tmdbDetailsSchema, input);
  },
};

export const tmdbTrendingInputParser = {
  parse(input: unknown) {
    return v.parse(tmdbTrendingSchema, input);
  },
};

export const tmdbOpenTitleInputParser = {
  parse(input: unknown) {
    return v.parse(tmdbOpenTitleSchema, input);
  },
};

export const tmdbRematchTitleInputParser = {
  parse(input: unknown) {
    return v.parse(tmdbRematchTitleSchema, input);
  },
};

export const updateCloudProvidersInputParser = {
  parse(input: unknown) {
    return v.parse(updateCloudProvidersSchema, input);
  },
};

export const resolveCloudSourceInputParser = {
  parse(input: unknown) {
    return v.parse(resolveCloudSourceSchema, input);
  },
};

export const prowlarrSearchInputParser = {
  parse(input: unknown) {
    return v.parse(prowlarrSearchSchema, input);
  },
};

export const titleCandidateListInputParser = {
  parse(input: unknown) {
    return v.parse(titleCandidateListSchema, input);
  },
};

export const addMagnetDownloadInputParser = {
  parse(input: unknown) {
    return v.parse(addMagnetDownloadSchema, input);
  },
};

export const startCandidateDownloadInputParser = {
  parse(input: unknown) {
    return v.parse(startCandidateDownloadSchema, input);
  },
};

export const downloadJobIdInputParser = {
  parse(input: unknown) {
    return v.parse(downloadJobIdSchema, input);
  },
};

export const deleteDownloadJobInputParser = {
  parse(input: unknown) {
    return v.parse(deleteDownloadJobSchema, input);
  },
};
