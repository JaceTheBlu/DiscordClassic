/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// uBlock-style counter: how many distinct files Block mode kept Discord from downloading.
// Each item counts once per session (Discord asks again on every render), totals add up across sessions.

import * as DataStore from "@api/DataStore";

export type StatKey = "hideAvatarDecorations" | "hideNameplates" | "hideClanTags" | "urlBlocking";

export const STAT_LABELS: Record<StatKey, string> = {
    hideAvatarDecorations: "Avatar decorations",
    hideNameplates: "Nameplates",
    hideClanTags: "Server tags",
    urlBlocking: "Blocked by URL",
};

// Rough average download per item in KB. Estimates, not measurements: the report's
// "media" section has real sizes when Discord exposes them, use those to correct these.
const ESTIMATED_KB: Record<StatKey, number> = {
    hideAvatarDecorations: 60,
    hideNameplates: 150,
    hideClanTags: 2,
    urlBlocking: 60,
};

const STORE_KEY = "DiscordClassic_blockStats";
const KEYS = Object.keys(STAT_LABELS) as StatKey[];

const session = new Map<StatKey, Set<string>>(KEYS.map(k => [k, new Set()]));
let totals: Partial<Record<StatKey, number>> = {};
let saveTimer: ReturnType<typeof setTimeout> | undefined;

// Patches run before the plugin starts, so counts recorded before the load are merged, not overwritten.
export async function loadStats() {
    const stored = await DataStore.get<Partial<Record<StatKey, number>>>(STORE_KEY) ?? {};
    for (const k of KEYS) totals[k] = (stored[k] ?? 0) + (totals[k] ?? 0);
}

function idOf(item: unknown): string | undefined {
    if (item == null || item === "") return;
    if (typeof item !== "object") return String(item);
    const { asset } = (item as { asset?: unknown; });
    if (typeof asset === "string") return asset;
    try {
        return JSON.stringify(item);
    } catch {
        return;
    }
}

export function recordBlocked(key: StatKey, item: unknown) {
    const id = idOf(item);
    const seen = session.get(key)!;
    if (id === undefined || seen.has(id)) return;
    seen.add(id);
    totals[key] = (totals[key] ?? 0) + 1;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => DataStore.set(STORE_KEY, totals), 5000);
}

export function resetStats() {
    for (const seen of session.values()) seen.clear();
    totals = {};
    clearTimeout(saveTimer);
    DataStore.del(STORE_KEY);
}

export function getStats() {
    const rows = KEYS.map(key => ({
        key,
        label: STAT_LABELS[key],
        session: session.get(key)!.size,
        total: totals[key] ?? 0,
        estimatedKbPerItem: ESTIMATED_KB[key],
    }));
    const kb = (pick: "session" | "total") => rows.reduce((sum, r) => sum + r[pick] * r.estimatedKbPerItem, 0);
    return { rows, sessionKb: kb("session"), totalKb: kb("total") };
}

export function formatKb(kb: number) {
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}
