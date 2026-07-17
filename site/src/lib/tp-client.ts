"use client";

/** Typed fetch helpers + shared client types for the trip planner. */

export interface TripDto {
  id: string; name: string; origin: string | null; startDate: string | null; endDate: string | null;
  adults: number; children: number; partyType: string; currency: string; budgetTotal: number | null;
  pace: "relaxed" | "balanced" | "packed"; interests: string[]; dayStart: string; dayEnd: string;
  notes: string | null; status: string; version: number; updatedAt: string;
}
export interface DayDto { id: string; date: string | null; dayIndex: number; destinationId: string | null; title: string | null }
export interface DestinationDto { id: string; name: string; lat: number | null; lng: number | null }
export interface ItemDto {
  id: string; dayId: string | null; placeId: string | null; name: string; category: string; address: string | null;
  lat: number | null; lng: number | null; startTime: string | null; endTime: string | null; durationMin: number | null;
  cost: number | null; currency: string | null; reservationStatus: string; notes: string | null; locked: boolean;
  completed: boolean; priority: "must" | "normal" | "low"; slot: string | null; sortOrder: number; source: string; packageId: string | null;
}
export interface MemberDto { id: string; role: string; profileId: string; displayName: string; email: string | null }
export interface ProposalDto {
  id: string; summary: string; status: string;
  changes: { adds: Record<string, unknown>[]; removes: { itemId: string; reason?: string }[]; moves: { itemId: string; toDayIndex: number }[]; updates: { itemId: string; patch: Record<string, unknown> }[] };
  impact: unknown; createdAt: string;
}
export interface TripBundle {
  trip: TripDto; role: "owner" | "editor" | "viewer"; days: DayDto[]; destinations: DestinationDto[];
  items: ItemDto[]; members: MemberDto[]; pendingProposals: ProposalDto[];
  activity: { id: string; action: string; target: string | null; at: string; actor: string }[];
  me: { id: string; displayName: string };
}
export interface PlaceDto {
  placeId: string; name: string; category: string; address: string; lat: number; lng: number;
  rating?: number; priceLevel?: number; openNow?: boolean; summary?: string; source: string; packageId?: string; inclusions?: string[];
}
export interface SegmentDto { fromItemId: string; toItemId: string; distanceKm: number; durationMin: number; mode: string; live: boolean }

export class ApiError extends Error {
  status: number;
  code: string;
  issues?: { path: string; message: string }[];
  constructor(status: number, code: string, message: string, issues?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { ...(init?.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "network", "Network error — check your connection.");
  }
  const body = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; error?: string; message?: string; issues?: { path: string; message: string }[] } | null;
  if (!res.ok || !body?.ok) {
    throw new ApiError(res.status, body?.error ?? "error", body?.message ?? "Request failed.", body?.issues);
  }
  return body.data as T;
}

export const jpost = <T>(path: string, data: unknown, method = "POST") =>
  api<T>(path, { method, body: JSON.stringify(data) });
