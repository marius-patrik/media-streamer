import type { UserRole } from "@tailstreamer/domain";

const roleRank: Record<UserRole, number> = {
  VIEWER: 1,
  DOWNLOADER: 2,
  ADMIN: 3,
};

export function hasRole(userRole: UserRole, minimumRole: UserRole) {
  return roleRank[userRole] >= roleRank[minimumRole];
}
