/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// "Filter" mode: stops matching media URLs from being downloaded at all.
// Works in the renderer by intercepting src assignments on img/video/source elements,
// which is where React writes them. CSS backgrounds are not covered.
// A main-process webRequest filter was ruled out: Electron allows one onBeforeRequest
// listener per session, so registering ours could silently replace Discord's.

type SrcElement = HTMLImageElement | HTMLVideoElement | HTMLSourceElement;

const PROTOS = [HTMLImageElement.prototype, HTMLVideoElement.prototype, HTMLSourceElement.prototype];
const originalSetAttribute = Element.prototype.setAttribute;
const originalSrc = new Map<object, PropertyDescriptor>();

let patterns: RegExp[] = [];
let blockedCount = 0;

const isBlocked = (url: unknown) => typeof url === "string" && patterns.some(p => p.test(url));

function patchedSetAttribute(this: Element, name: string, value: string) {
    const isMedia = this instanceof HTMLImageElement || this instanceof HTMLVideoElement || this instanceof HTMLSourceElement;
    if (name === "src" && isMedia && isBlocked(value)) {
        blockedCount++;
        return;
    }
    return originalSetAttribute.call(this, name, value);
}

export function setFilterPatterns(next: RegExp[]) {
    patterns = next;
    if (patterns.length) installFilter();
    else uninstallFilter();
}

export function getBlockedCount() {
    return blockedCount;
}

function installFilter() {
    if (Element.prototype.setAttribute === patchedSetAttribute) return;
    Element.prototype.setAttribute = patchedSetAttribute;

    for (const proto of PROTOS) {
        const desc = Object.getOwnPropertyDescriptor(proto, "src");
        if (!desc?.set) continue;
        originalSrc.set(proto, desc);
        Object.defineProperty(proto, "src", {
            ...desc,
            set(this: SrcElement, value: string) {
                if (isBlocked(value)) {
                    blockedCount++;
                    return;
                }
                desc.set!.call(this, value);
            },
        });
    }
}

function uninstallFilter() {
    if (Element.prototype.setAttribute === patchedSetAttribute) Element.prototype.setAttribute = originalSetAttribute;
    for (const [proto, desc] of originalSrc) Object.defineProperty(proto, "src", desc);
    originalSrc.clear();
}
