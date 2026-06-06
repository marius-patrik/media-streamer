export const titleKinds = ["MOVIE", "SHOW"] as const;
export const userRoles = ["ADMIN", "DOWNLOADER", "VIEWER"] as const;

export type TitleKind = (typeof titleKinds)[number];
export type UserRole = (typeof userRoles)[number];
