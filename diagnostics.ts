/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { search, wreq } from "@webpack";
import { getFactoryPatchedBy } from "@webpack/patcher";

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
    // "orb" alone also matches "colorBrand" and "indicatorBottom".
    "orbs",
    "banner",
    "upsell",
    "coachmark",
    // Profile frames (border drawn around a profile popout), a collectible next to profile effects.
    "frame",
] as const;

// Visible texts of popups with no known class: the report lists the classes of their ancestors.
const TEXTS = [
    "Give their style a spin",
] as const;
const TEXT_ANCESTORS = 8;

const STABLE_ATTRS = ["data-list-item-id", "aria-label", "href", "role", "data-tab-id"];
const MAX_SAMPLES = 8;
const TREE_DEPTH = 3;
const TREE_WIDTH = 6;

interface ElementInfo {
    tag: string;
    classes: string[];
    attrs: Record<string, string>;
    src?: string;
    // Closest ancestor that carries a stable attribute, to anchor a selector on.
    anchor?: { tag: string; attrs: Record<string, string>; depth: number; };
    // Descendants, for cases where the visible part has no telling class (e.g. a nameplate background).
    children?: TreeNode[];
}

interface TreeNode {
    tag: string;
    classes: string[];
    // Media URL without query string, to find CDN paths worth blocking at the network level.
    src?: string;
    children?: TreeNode[];
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
        src: mediaSrc(el),
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

function mediaSrc(el: Element) {
    const src = el.getAttribute("src") ?? el.getAttribute("href") ?? el.getAttribute("xlink:href");
    return src && /^https?:/.test(src) ? src.split("?")[0] : undefined;
}

function tree(el: Element, depth: number): TreeNode[] | undefined {
    if (depth === 0 || !el.children.length) return undefined;
    return [...el.children].slice(0, TREE_WIDTH).map(child => ({
        tag: child.tagName.toLowerCase(),
        classes: [...child.classList].map(stripHash),
        src: mediaSrc(child),
        children: tree(child, depth - 1),
    }));
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
            const info: ElementInfo = { ...describe(el), children: tree(el, TREE_DEPTH) };
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

function scanTexts() {
    const result: Record<string, ElementInfo[][]> = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = TEXTS.find(t => node!.textContent?.includes(t));
        if (!text) continue;
        const chain: ElementInfo[] = [];
        for (let el = node.parentElement; el && chain.length < TEXT_ANCESTORS; el = el.parentElement) chain.push(describe(el));
        (result[text] ??= []).push(chain);
    }
    return result;
}

function mediaGroup(src: string) {
    let url: URL;
    try {
        url = new URL(src);
    } catch {
        return;
    }
    if (!url.protocol.startsWith("http")) return;
    const [first = "", second = ""] = url.pathname.split("/").filter(Boolean);
    return { key: `${url.host}/${first}/${/^\d+$/.test(second) ? "<id>" : second}`, example: url.origin + url.pathname };
}

// Groups every media URL on the page by host and first two path segments,
// e.g. "cdn.discordapp.com/avatar-decoration-presets/<id>", to find Filter mode patterns.
// avgKb comes from the browser's resource timings, used to correct the counter's size estimates.
// It stays absent when the CDN hides sizes from cross-origin timing.
function scanMedia() {
    const groups: Record<string, { count: number; example: string; avgKb?: number; sized?: number; }> = {};
    for (const el of document.querySelectorAll("img[src], video[src], source[src]")) {
        const group = mediaGroup((el as HTMLImageElement).src);
        if (!group) continue;
        groups[group.key] ??= { count: 0, example: group.example };
        groups[group.key].count++;
    }

    const sizes: Record<string, number[]> = {};
    for (const entry of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
        const group = mediaGroup(entry.name);
        if (group && groups[group.key] && entry.encodedBodySize > 0) (sizes[group.key] ??= []).push(entry.encodedBodySize);
    }
    for (const [key, list] of Object.entries(sizes)) {
        groups[key].avgKb = Math.round(list.reduce((a, b) => a + b, 0) / list.length / 102.4) / 10;
        groups[key].sized = list.length;
    }

    return Object.fromEntries(Object.entries(groups).sort((a, b) => b[1].count - a[1].count));
}

// Distinct button labels, to find chat bar and toolbar buttons by aria-label.
function scanButtonLabels() {
    const labels = new Set<string>();
    for (const el of document.querySelectorAll("button[aria-label], [role='button'][aria-label]")) {
        labels.add(el.getAttribute("aria-label")!.slice(0, 80));
        if (labels.size >= 150) break;
    }
    return [...labels];
}

// Code around CDN paths in Discord's webpack modules, to write Block mode patches from real code.
const CODE_NEEDLES = ["clan-badges", "collectibles-shop", "nameplate", "quests/@me", "profileEffectId", "profile_effects"];

function scanCode() {
    const result: Record<string, { module: string; snippets: string[]; }[]> = {};
    for (const needle of CODE_NEEDLES) {
        const modules = Object.entries(search(needle)).slice(0, 5);
        result[needle] = modules.map(([id, factory]) => {
            const src = factory.toString();
            const snippets: string[] = [];
            for (let i = src.indexOf(needle); i !== -1 && snippets.length < 3; i = src.indexOf(needle, i + 1))
                snippets.push(src.slice(Math.max(0, i - 200), i + 200));
            return { module: id, snippets };
        });
    }
    return result;
}

// Whether each patch "find" still hits exactly one module, and which modules carry our patches.
function checkPatches(finds: string[]) {
    return {
        finds: Object.fromEntries(finds.map(find => [find, Object.keys(search(find)).length])),
        // Factories expose their original source to search(), so ask the patcher instead.
        patchedModules: Object.keys(wreq.m).filter(id => getFactoryPatchedBy(id)?.has("DiscordClassic")),
    };
}

export function buildReport(rules: Record<string, string>, enabled: Record<string, unknown>, finds: string[]) {
    return {
        date: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: location.pathname,
        rules: Object.fromEntries(
            Object.entries(rules).map(([key, selector]) => [
                key,
                { selector, enabled: Boolean(enabled[key]), ...countMatches(selector) },
            ])
        ),
        keywords: scanKeywords(),
        texts: scanTexts(),
        media: scanMedia(),
        buttons: scanButtonLabels(),
        code: scanCode(),
        patches: checkPatches(finds),
    };
}
