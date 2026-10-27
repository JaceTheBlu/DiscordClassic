/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { HeadingSecondary } from "@components/Heading";
import { copyWithToast } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";

import { buildReport } from "./diagnostics";
import { setFilterPatterns } from "./filter";

const STYLE_ID = "vc-discord-classic";

function apply() {
    const enabled = (Object.keys(RULES) as RuleKey[]).filter(key => settings.store[key]);

    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = enabled.map(key => `${RULES[key]} { display: none !important; }`).join("\n");

    setFilterPatterns(settings.store.mode === "filter"
        ? enabled.flatMap(key => FILTERS[key] ?? [])
        : []);
}

function stop() {
    document.getElementById(STYLE_ID)?.remove();
    setFilterPatterns([]);
}

// Hidden elements stay in the DOM, so the scan sees them even while rules are active.
function copySelectorReport() {
    const report = buildReport(RULES, settings.store);
    copyWithToast(JSON.stringify(report, null, 2), "DiscordClassic: selector report copied");
}

// Every option re-applies on change, so toggles take effect live without a restart.
const toggle = (displayName: string, description: string, defaultValue = false) => ({
    type: OptionType.BOOLEAN as const,
    displayName,
    description,
    default: defaultValue,
    onChange: apply,
});

// Settings UI has no sections, so a heading component stands in for one.
const section = (title: string) => ({
    type: OptionType.COMPONENT as const,
    component: () => <HeadingSecondary style={{ marginTop: 16 }}>{title}</HeadingSecondary>,
});

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        displayName: "Removal mode",
        description: "Hide: the element is still downloaded, then hidden. Filter: cosmetic images and animations are not downloaded at all (less bandwidth and CPU), then hidden. Filter only affects options marked (filterable).",
        options: [
            { label: "Hide", value: "hide", default: true },
            { label: "Filter", value: "filter" },
        ],
        onChange: apply,
    },

    sectionMarketing: section("Marketing"),
    hideNitroTab: toggle("Nitro tab", "Removes the Nitro entry at the top of the direct messages list.", true),
    hideShop: toggle("Shop tab", "Removes the Shop entry at the top of the direct messages list.", true),
    hideGiftButton: toggle("Gift button", "Removes the gift icon from the message input bar.", true),

    sectionRecent: section("Recent additions"),
    hideQuests: toggle("Quests", "Removes the Quests entry from the direct messages list."),

    sectionCosmetics: section("Other users' cosmetics"),
    hideAvatarDecorations: toggle("Avatar decorations (filterable)", "Removes the animated frames drawn around avatars. The avatar itself stays."),
    hideClanTags: toggle("Server tags", "Removes the small server badge shown next to usernames (e.g. CHB, SEP)."),
});

// Validation status of each selector lives in docs/selectors.md: Discord changes its markup every build.
// Prefer stable attributes (data-list-item-id, href, aria-label). When none exists, match the
// readable class prefix with [class*=...], never the full hashed class.
const RULES = {
    hideNitroTab: "[data-list-item-id$='___nitro']",
    hideShop: "[data-list-item-id$='___shop']",
    hideGiftButton: "[aria-label='Send a gift']",
    hideQuests: "[data-list-item-id$='___quests']",
    // Only the image: the matching svg container also wraps the avatar itself.
    hideAvatarDecorations: "img[class*='avatarDecoration']",
    hideClanTags: "[class*='clanTag']",
} satisfies Partial<Record<keyof typeof settings.store, string>>;

type RuleKey = keyof typeof RULES;

// Media URL patterns blocked in Filter mode. Empty until confirmed from a selector report
// (its "media" section lists the CDN paths seen on screen). Never add a guessed pattern.
const FILTERS: Partial<Record<RuleKey, RegExp[]>> = {
    hideAvatarDecorations: [],
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
    start: apply,
    stop,
});
