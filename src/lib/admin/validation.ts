export class AdminValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminValidationError";
  }
}

export function requiredText(value: FormDataEntryValue | null, label: string, maxLength = 255) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new AdminValidationError(`${label} là bắt buộc.`);
  if (text.length > maxLength) throw new AdminValidationError(`${label} không được vượt quá ${maxLength} ký tự.`);
  return text;
}

export function optionalText(value: FormDataEntryValue | null, label: string, maxLength = 2_000) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > maxLength) throw new AdminValidationError(`${label} không được vượt quá ${maxLength} ký tự.`);
  return text || null;
}

export function integerValue(value: FormDataEntryValue | null, label: string, options: { min?: number; max?: number } = {}) {
  const raw = typeof value === "string" ? value.trim() : "";
  const parsed = Number(raw);
  if (!raw || !Number.isSafeInteger(parsed)) throw new AdminValidationError(`${label} phải là số nguyên hợp lệ.`);
  if (options.min !== undefined && parsed < options.min) throw new AdminValidationError(`${label} phải từ ${options.min}.`);
  if (options.max !== undefined && parsed > options.max) throw new AdminValidationError(`${label} không được vượt quá ${options.max}.`);
  return parsed;
}

export function optionalInteger(value: FormDataEntryValue | null, label: string, options: { min?: number; max?: number } = {}) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  return integerValue(raw, label, options);
}

export function enumValue<T extends string>(value: FormDataEntryValue | null, label: string, allowed: readonly T[]): T {
  const raw = typeof value === "string" ? value : "";
  if (!allowed.includes(raw as T)) throw new AdminValidationError(`${label} không hợp lệ.`);
  return raw as T;
}

export function slugValue(value: FormDataEntryValue | null) {
  const slug = requiredText(value, "Slug", 191).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new AdminValidationError("Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.");
  }
  return slug;
}

export function emailValue(value: FormDataEntryValue | null) {
  const email = requiredText(value, "Email", 191).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminValidationError("Email không hợp lệ.");
  return email;
}

export function dateValue(value: FormDataEntryValue | null, label: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!match || !date
    || date.getUTCFullYear() !== Number(match[1])
    || date.getUTCMonth() !== Number(match[2]) - 1
    || date.getUTCDate() !== Number(match[3])) {
    throw new AdminValidationError(`${label} không hợp lệ.`);
  }
  return raw;
}

export type SpecificationInput = { label: string; value: string };

export function specificationsValue(value: FormDataEntryValue | null): SpecificationInput[] {
  if (typeof value !== "string" || !value.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new AdminValidationError("Thông số kỹ thuật không hợp lệ.");
  }
  if (!Array.isArray(parsed) || parsed.length > 100) throw new AdminValidationError("Tối đa 100 thông số kỹ thuật.");
  return parsed.map((item) => {
    if (!item || typeof item !== "object") throw new AdminValidationError("Thông số kỹ thuật không hợp lệ.");
    const label = String((item as Record<string, unknown>).label ?? "").trim();
    const specValue = String((item as Record<string, unknown>).value ?? "").trim();
    if (!label || !specValue || label.length > 120 || specValue.length > 500) {
      throw new AdminValidationError("Mỗi thông số phải có nhãn và giá trị hợp lệ.");
    }
    return { label, value: specValue };
  });
}

export function friendlyDatabaseError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "ER_DUP_ENTRY") return "Slug hoặc email đã tồn tại.";
  if (code === "ER_ROW_IS_REFERENCED_2") return "Không thể xóa vì dữ liệu đang được sử dụng.";
  return "Không thể lưu thay đổi. Vui lòng thử lại.";
}
