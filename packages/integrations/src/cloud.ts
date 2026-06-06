export type CloudProviderTemplate = {
  id: string;
  name: string;
  enabled: boolean;
  rank: number;
  externalProvider: "TMDB" | "PROWLARR" | "CLOUD_PROVIDER";
  movieUrlTemplate: string;
  episodeUrlTemplate: string;
};

export type CloudTemplateInput = {
  externalId: string;
  season?: number | null;
  episode?: number | null;
};

const approvedPlaceholders = new Set(["externalId", "season", "episode"]);
const placeholderPattern = /\{([A-Za-z0-9_]+)\}/g;

export const defaultCloudProviderTemplates: CloudProviderTemplate[] = [
  {
    id: "custom-embed",
    name: "Custom Embed",
    enabled: false,
    rank: 0,
    externalProvider: "TMDB",
    movieUrlTemplate: "https://example.com/movie/{externalId}",
    episodeUrlTemplate: "https://example.com/tv/{externalId}/{season}/{episode}",
  },
];

export class CloudTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudTemplateError";
  }
}

export function renderCloudProviderUrl(provider: CloudProviderTemplate, input: CloudTemplateInput) {
  if ((input.season == null) !== (input.episode == null)) {
    throw new CloudTemplateError("Season and episode must be provided together");
  }
  const template =
    input.season != null && input.episode != null ? provider.episodeUrlTemplate : provider.movieUrlTemplate;
  return renderTemplateUrl(template, input);
}

export function validateCloudProviderTemplate(provider: CloudProviderTemplate) {
  renderTemplateUrl(provider.movieUrlTemplate, { externalId: "1" });
  renderTemplateUrl(provider.episodeUrlTemplate, { externalId: "1", season: 1, episode: 2 });
  return provider;
}

function renderTemplateUrl(template: string, input: CloudTemplateInput) {
  const rendered = template.replaceAll(placeholderPattern, (_match, placeholder: string) => {
    if (!approvedPlaceholders.has(placeholder)) throw new CloudTemplateError(`Unsupported placeholder: ${placeholder}`);
    const value = valueForPlaceholder(placeholder, input);
    if (value == null) throw new CloudTemplateError(`Missing value for placeholder: ${placeholder}`);
    return encodeURIComponent(value);
  });

  if (placeholderPattern.test(rendered)) throw new CloudTemplateError("Unresolved template placeholder");
  const url = parseHttpUrl(rendered);
  return url.toString();
}

function valueForPlaceholder(placeholder: string, input: CloudTemplateInput) {
  if (placeholder === "externalId") return input.externalId;
  if (placeholder === "season") return input.season == null ? null : String(input.season);
  if (placeholder === "episode") return input.episode == null ? null : String(input.episode);
  return null;
}

function parseHttpUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CloudTemplateError("Template must render to a valid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new CloudTemplateError("Template URL must use http or https");
  }
  return url;
}
