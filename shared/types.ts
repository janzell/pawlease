// Types shared by the API server and the web client.

export type Role = "owner" | "member";

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Household {
  id: number;
  name: string;
  invite_code: string;
  role: Role;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  role: Role;
  joined_at: string;
}

export interface Pet {
  id: number;
  name: string;
  breed: string;
  sex: "" | "male" | "female";
  birthday: string; // YYYY-MM-DD
  weight_kg: number | null;
  color: string;
  microchip: string;
  food: string;
  allergies: string;
  medications: string;
  notes: string;
  avatar: string; // emoji
  created_at: string;
}

export type Repeat = "none" | "daily" | "weekly" | "monthly";

export interface Task {
  id: number;
  pet_id: number | null;
  title: string;
  notes: string;
  due_date: string; // YYYY-MM-DD or ""
  due_time: string; // HH:MM or ""
  repeat: Repeat;
  assignee_id: number | null;
  done_at: string | null;
  done_by: number | null;
  created_by: number;
  created_at: string;
}

export interface Note {
  id: number;
  pet_id: number | null;
  title: string;
  body: string;
  pinned: 0 | 1;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export const BOOKING_TYPES = ["vet", "grooming", "walking", "daycare", "boarding", "training", "other"] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];
export type BookingStatus = "upcoming" | "completed" | "cancelled";

export interface Booking {
  id: number;
  pet_id: number | null;
  professional_id: number | null;
  type: BookingType;
  title: string;
  starts_at: string; // local "YYYY-MM-DDTHH:MM"
  ends_at: string;
  location: string;
  notes: string;
  status: BookingStatus;
  created_by: number;
  created_at: string;
}

export const PRO_KINDS = ["vet", "groomer", "walker", "sitter", "trainer", "daycare", "boarding", "other"] as const;
export type ProKind = (typeof PRO_KINDS)[number];

export interface Professional {
  id: number;
  kind: ProKind;
  name: string;
  business: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  notes: string;
  is_primary: 0 | 1;
  created_at: string;
}

export const ACTIVITY_KINDS = ["walk", "feed", "water", "meds", "potty", "treat", "bath", "weight", "other"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface Activity {
  id: number;
  pet_id: number | null;
  kind: ActivityKind;
  detail: string;
  value: number | null;
  created_by: number;
  created_at: string;
}

export interface Me {
  user: User;
  household: Household;
  households: Household[];
  members: Member[];
}

export interface HouseholdData {
  pets: Pet[];
  tasks: Task[];
  notes: Note[];
  bookings: Booking[];
  professionals: Professional[];
  activities: Activity[];
}
