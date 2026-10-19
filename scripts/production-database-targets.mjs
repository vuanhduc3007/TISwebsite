// Exact production database names approved for the current VPS and Vibe Host
// deployments. Keep disposable and test databases out of this list.
export const APPROVED_PRODUCTION_DATABASES = Object.freeze([
  "solar_shop",
  "tissolar_mysql",
  "cong_ty_co_phan_thuong_mai_va_dich_vu_ti"
]);

export function isApprovedProductionDatabase(database) {
  return APPROVED_PRODUCTION_DATABASES.includes(database?.trim());
}
