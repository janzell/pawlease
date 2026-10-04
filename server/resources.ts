import {
  ACTIVITY_KINDS,
  BOOKING_TYPES,
  PRO_KINDS,
} from "../shared/types.ts";

// Declarative description of each household-scoped table so CRUD routes and
// validation are shared instead of hand-written per resource.

type FieldSpec =
  | { type: "text"; max?: number; required?: boolean }
  | { type: "number"; min?: number; max?: number }
  | { type: "bool" }
  | { type: "enum"; values: readonly string[] }
  | { type: "date" } // YYYY-MM-DD or ""
  | { type: "time" } // HH:MM or ""
  | { type: "datetime"; required?: boolean } // YYYY-MM-DDTHH:MM or ""
  | { type: "ref"; table: "pets" | "professionals" }
  | { type: "member" };

export interface ResourceSpec {
  table: string;
  fields: Record<string, FieldSpec>;
  order: string;
  /** Stamp created_by with the acting user. */
  createdBy?: boolean;
  /** Bump updated_at on update. */
  touch?: boolean;
  limit?: number;
}

export const RESOURCES: Record<string, ResourceSpec> = {
  pets: {
    table: "pets",
    order: "name COLLATE NOCASE",
    fields: {
      name: { type: "text", required: true, max: 60 },
      breed: { type: "text", max: 80 },
      sex: { type: "enum", values: ["", "male", "female"] },
      birthday: { type: "date" },
      weight_kg: { type: "number", min: 0, max: 200 },
      color: { type: "text", max: 60 },
      microchip: { type: "text", max: 40 },
      food: { type: "text", max: 500 },
      allergies: { type: "text", max: 500 },
      medications: { type: "text", max: 500 },
      notes: { type: "text", max: 2000 },
      avatar: { type: "text", max: 16 },
    },
  },
  professionals: {
    table: "professionals",
    order: "is_primary DESC, name COLLATE NOCASE",
    fields: {
      kind: { type: "enum", values: PRO_KINDS },
      name: { type: "text", required: true, max: 100 },
      business: { type: "text", max: 100 },
      phone: { type: "text", max: 40 },
      email: { type: "text", max: 120 },
      address: { type: "text", max: 200 },
      website: { type: "text", max: 200 },
      notes: { type: "text", max: 2000 },
      is_primary: { type: "bool" },
    },
  },
  tasks: {
    table: "tasks",
    order: "done_at IS NOT NULL, due_date = '', due_date, due_time = '', due_time, id",
    createdBy: true,
    fields: {
      pet_id: { type: "ref", table: "pets" },
      title: { type: "text", required: true, max: 120 },
      notes: { type: "text", max: 2000 },
      due_date: { type: "date" },
      due_time: { type: "time" },
      repeat: { type: "enum", values: ["none", "daily", "weekly", "monthly"] },
      assignee_id: { type: "member" },
    },
  },
  notes: {
    table: "notes",
    order: "pinned DESC, updated_at DESC",
    createdBy: true,
    touch: true,
    fields: {
      pet_id: { type: "ref", table: "pets" },
      title: { type: "text", max: 120 },
      body: { type: "text", max: 10000 },
      pinned: { type: "bool" },
    },
  },
  bookings: {
    table: "bookings",
    order: "starts_at",
    createdBy: true,
    fields: {
      pet_id: { type: "ref", table: "pets" },
      professional_id: { type: "ref", table: "professionals" },
      type: { type: "enum", values: BOOKING_TYPES },
      title: { type: "text", required: true, max: 120 },
      starts_at: { type: "datetime", required: true },
      ends_at: { type: "datetime" },
      location: { type: "text", max: 200 },
      notes: { type: "text", max: 2000 },
      status: { type: "enum", values: ["upcoming", "completed", "cancelled"] },
    },
  },
  activities: {
    table: "activities",
    order: "created_at DESC, id DESC",
    createdBy: true,
    limit: 200,
    fields: {
      pet_id: { type: "ref", table: "pets" },
      kind: { type: "enum", values: ACTIVITY_KINDS },
      detail: { type: "text", max: 200 },
      value: { type: "number", min: 0, max: 100000 },
    },
  },
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export type RefChecker = (kind: "pets" | "professionals" | "member", id: number) => boolean;

/**
 * Validates a request body against a spec. With `partial`, only provided keys
 * are checked (PATCH); otherwise required fields must be present (POST).
 * Unknown keys are dropped so callers can't write household_id etc.
 */
export function validate(
  spec: ResourceSpec,
  body: unknown,
  partial: boolean,
  refExists: RefChecker,
): Record<string, string | number | null> {
  if (!body || typeof body !== "object") throw new HttpError(400, "Expected a JSON body");
  const input = body as Record<string, unknown>;
  const out: Record<string, string | number | null> = {};

  for (const [key, f] of Object.entries(spec.fields)) {
    const present = key in input && input[key] !== undefined;
    if (!present) {
      if (!partial && "required" in f && f.required) throw new HttpError(400, `${key} is required`);
      continue;
    }
    const v = input[key];
    switch (f.type) {
      case "text": {
        if (typeof v !== "string") throw new HttpError(400, `${key} must be text`);
        const s = v.trim();
        if (f.required && !s) throw new HttpError(400, `${key} is required`);
        if (f.max && s.length > f.max) throw new HttpError(400, `${key} is too long`);
        out[key] = s;
        break;
      }
      case "number": {
        if (v === null || v === "") {
          out[key] = null;
          break;
        }
        const n = typeof v === "number" ? v : Number(v);
        if (!Number.isFinite(n)) throw new HttpError(400, `${key} must be a number`);
        if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max))
          throw new HttpError(400, `${key} is out of range`);
        out[key] = n;
        break;
      }
      case "bool":
        out[key] = v ? 1 : 0;
        break;
      case "enum":
        if (typeof v !== "string" || !f.values.includes(v)) throw new HttpError(400, `${key} is invalid`);
        out[key] = v;
        break;
      case "date":
      case "time":
      case "datetime": {
        const re = f.type === "date" ? DATE_RE : f.type === "time" ? TIME_RE : DATETIME_RE;
        if (typeof v !== "string" || (v !== "" && !re.test(v))) throw new HttpError(400, `${key} is invalid`);
        if (f.type === "datetime" && f.required && !v) throw new HttpError(400, `${key} is required`);
        out[key] = v;
        break;
      }
      case "ref":
      case "member": {
        if (v === null || v === "") {
          out[key] = null;
          break;
        }
        const id = Number(v);
        const kind = f.type === "member" ? "member" : f.table;
        if (!Number.isInteger(id) || !refExists(kind, id)) throw new HttpError(400, `${key} not found`);
        out[key] = id;
        break;
      }
    }
  }
  return out;
}
