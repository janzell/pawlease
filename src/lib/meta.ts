import {
  Bath,
  Bone,
  Building2,
  Droplets,
  Footprints,
  GraduationCap,
  HeartPulse,
  Home,
  Pill,
  Scale,
  Scissors,
  Sparkles,
  Stethoscope,
  Sun,
  TreePine,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { ActivityKind, BookingType, ProKind } from "../../shared/types.ts";

type Tone = "brand" | "sage" | "sky" | "plum" | "sun" | "danger";

export const toneStyle = (tone: Tone) => ({
  background: `var(--${tone}-soft)`,
  color: `var(--${tone === "brand" ? "brand-strong" : tone})`,
});

export const ACTIVITY_META: Record<ActivityKind, { label: string; verb: string; icon: LucideIcon; tone: Tone }> = {
  walk: { label: "Walk", verb: "walked", icon: Footprints, tone: "sage" },
  feed: { label: "Fed", verb: "fed", icon: UtensilsCrossed, tone: "brand" },
  water: { label: "Water", verb: "refilled water for", icon: Droplets, tone: "sky" },
  meds: { label: "Meds", verb: "gave meds to", icon: Pill, tone: "plum" },
  potty: { label: "Potty", verb: "took out", icon: TreePine, tone: "sun" },
  treat: { label: "Treat", verb: "gave a treat to", icon: Bone, tone: "brand" },
  bath: { label: "Bath", verb: "bathed", icon: Bath, tone: "sky" },
  weight: { label: "Weight", verb: "weighed", icon: Scale, tone: "sage" },
  other: { label: "Other", verb: "logged for", icon: Sparkles, tone: "sun" },
};

export const BOOKING_META: Record<BookingType, { label: string; icon: LucideIcon; tone: Tone }> = {
  vet: { label: "Vet visit", icon: Stethoscope, tone: "danger" },
  grooming: { label: "Grooming", icon: Scissors, tone: "plum" },
  walking: { label: "Dog walk", icon: Footprints, tone: "sage" },
  daycare: { label: "Daycare", icon: Sun, tone: "sun" },
  boarding: { label: "Boarding", icon: Home, tone: "sky" },
  training: { label: "Training", icon: GraduationCap, tone: "brand" },
  other: { label: "Other", icon: Sparkles, tone: "sun" },
};

export const PRO_META: Record<ProKind, { label: string; plural: string; icon: LucideIcon; tone: Tone; booking: BookingType }> = {
  vet: { label: "Vet", plural: "Vets", icon: HeartPulse, tone: "danger", booking: "vet" },
  groomer: { label: "Groomer", plural: "Groomers", icon: Scissors, tone: "plum", booking: "grooming" },
  walker: { label: "Dog walker", plural: "Dog walkers", icon: Footprints, tone: "sage", booking: "walking" },
  sitter: { label: "Pet sitter", plural: "Pet sitters", icon: Home, tone: "sky", booking: "boarding" },
  trainer: { label: "Trainer", plural: "Trainers", icon: GraduationCap, tone: "brand", booking: "training" },
  daycare: { label: "Daycare", plural: "Daycares", icon: Sun, tone: "sun", booking: "daycare" },
  boarding: { label: "Boarding / kennel", plural: "Boarding", icon: Building2, tone: "sky", booking: "boarding" },
  other: { label: "Other", plural: "Other", icon: Sparkles, tone: "sun", booking: "other" },
};

export const PET_AVATARS = ["🐶", "🐕", "🦮", "🐕‍🦺", "🐩", "🌭", "🐺", "🦊", "🐾", "🦴"];
