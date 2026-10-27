/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Builds a JSON report of the current DOM to help write and validate selectors.
// Discovery only: the report lists what exists, it does not pick selectors by itself.

// Class fragments worth looking for. Hashed suffixes are dropped from the report.
const KEYWORDS = [
    "nameplate",
    "clan",
    "guildTag",
    "decoration",
    "effect",
    "quest",
    "nitro",
    "premium",
    "shop",
    "gift",
    "orb",
] as const;

const STABLE_ATTRS = ["data-list-item-id", "aria-label", "href", "role", "data-tab-id"];
const MAX_SAMPLES = 8;

interface ElementInfo {
    tag: string;
    classes: string[];
    attrs: Record<string, string>;
    // Closest ancestor that carries a stable attribute, to anchor a selector on.
    anchor?: { tag: string; attrs: Record<string, string>; depth: number; };
}

// "nameplated__91a9d" -> "nameplated"
const stripHash = (cls: string) => cls.replace(/_{1,2}[a-z0-9]{4,6}$/i, "");

function stableAttrs(el: Element) {
    const attrs: Record<string, string> = {};
    for (const name of STABLE_ATTRS) {
        const value = el.getAttribute(name);
        if (value) attrs[name] = value.slice(0, 120);
    }
    return attrs;
}

function describe(el: Element): ElementInfo {
    const info: ElementInfo = {
        tag: el.tagName.toLowerCase(),
        classes: [...el.classList].map(stripHash),
        attrs: stableAttrs(el),
    };

    let parent = el.parentElement;
    for (let depth = 1; parent && depth <= 10; depth++, parent = parent.parentElement) {
        const attrs = stableAttrs(parent);
        if (Object.keys(attrs).length) {
            info.anchor = { tag: parent.tagName.toLowerCase(), attrs, depth };
            break;
        }
    }
    return info;
}

function countMatches(selector: string) {
    try {
        const matches = document.querySelectorAll(selector);
        return { count: matches.length, sample: matches[0] ? describe(matches[0]) : null };
    } catch (e) {
        return { error: String(e) };
    }
}

function scanKeywords() {
    const result: Record<string, { total: number; samples: ElementInfo[]; }> = {};

    for (const keyword of KEYWORDS) {
        const elements = document.querySelectorAll(`[class*="${keyword}" i]`);
        const seen = new Set<string>();
        const samples: ElementInfo[] = [];

        for (const el of elements) {
            const info = describe(el);
            // One sample per distinct shape, so a list of 1000 members stays readable.
            const key = info.tag + info.classes.join(".");
            if (seen.has(key)) continue;
            seen.add(key);
            samples.push(info);
            if (samples.length >= MAX_SAMPLES) break;
        }

        if (elements.length) result[keyword] = { total: elements.length, samples };
    }
    return result;
}

export function buildReport(rules: Record<string, string>, enabled: Record<string, boolean>) {
    return {
        date: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: location.pathname,
        rules: Object.fromEntries(
            Object.entries(rules).map(([key, selector]) => [
                key,
                { selector, enabled: enabled[key], ...countMatches(selector) },
            ])
        ),
        keywords: scanKeywords(),
    };
}
