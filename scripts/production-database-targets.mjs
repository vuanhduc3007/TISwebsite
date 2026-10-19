// Exact production database names approved for the current VPS and Vibe Host
// deployments. Keep disposable and test databases out of this list.
export const APPROVED_PRODUCTION_DATABASES = Object.freeze(["solar_shop", "tissolar_mysql"]);

export function isApprovedProductionDatabase(database) {
  return APPROVED_PRODUCTION_DATABASES.includes(database?.trim());
}
