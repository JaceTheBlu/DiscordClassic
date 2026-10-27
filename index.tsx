/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { copyWithToast } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";

import { buildReport } from "./diagnostics";

const STYLE_ID = "vc-discord-classic";

function applyStyle() {
    const css = (Object.keys(RULES) as RuleKey[])
        .filter(key => settings.store[key])
        .map(key => `${RULES[key]} { display: none !important; }`)
        .join("\n");

    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = css;
}

// Hidden elements stay in the DOM, so the scan sees them even while rules are active.
function copySelectorReport() {
    const report = buildReport(RULES, settings.store);
    copyWithToast(JSON.stringify(report, null, 2), "DiscordClassic: selector report copied");
}

function removeStyle() {
    document.getElementById(STYLE_ID)?.remove();
}

// Every option re-renders the style on change, so toggles apply live without a restart.
const toggle = (description: string, defaultValue = false) => ({
    type: OptionType.BOOLEAN as const,
    description,
    default: defaultValue,
    onChange: applyStyle,
});

const settings = definePluginSettings({
    // Marketing
    hideNitroTab: toggle("Hide the Nitro tab in the DM list", true),
    hideShop: toggle("Hide the Shop tab in the DM list", true),
    hideGiftButton: toggle("Hide the gift button in the chat bar", true),
    // Recent additions
    hideQuests: toggle("Hide Quests"),
    // Other users' cosmetics
    hideAvatarDecorations: toggle("Hide avatar decorations"),
    hideClanTags: toggle("Hide server tags next to usernames"),
});

type RuleKey = keyof typeof settings.store;

// Validation status of each selector lives in docs/selectors.md: Discord changes its markup every build.
// Prefer stable attributes (data-list-item-id, href, aria-label). When none exists, match the
// readable class prefix with [class*=...], never the full hashed class.
const RULES: Record<RuleKey, string> = {
    hideNitroTab: "[data-list-item-id$='___nitro']",
    hideShop: "[data-list-item-id$='___shop']",
    hideGiftButton: "[aria-label='Send a gift']",
    hideQuests: "[data-list-item-id$='___quests']",
    // Only the image: the matching svg container also wraps the avatar itself.
    hideAvatarDecorations: "img[class*='avatarDecoration']",
    hideClanTags: "[class*='clanTag']",
};

export default definePlugin({
    name: "DiscordClassic",
    description: "Hides Discord marketing and recent additions for a classic UI",
    // TODO: replace 0n with your Discord user ID. Move to Devs in src/utils/constants.ts for the upstream PR.
    authors: [{ name: "JaceTheBlu", id: 0n }],
    settings,
    toolboxActions: {
        "Copy selector report": copySelectorReport,
    },
    copySelectorReport,
    start: applyStyle,
    stop: removeStyle,
});
