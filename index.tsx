/*
 * DiscordClassic, a Vencord userplugin
 * Hides Discord marketing and recent additions to get a "classic" UI back.
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

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
});

type RuleKey = keyof typeof settings.store;

// UNVERIFIED placeholders: Discord changes its markup every build.
// Validate each selector in DevTools (see docs/selectors.md) before trusting it.
// Only target stable attributes (data-list-item-id, href, aria-label), never hashed classes.
const RULES: Record<RuleKey, string> = {
    hideNitroTab: `[data-list-item-id$="___nitro"]`,
    hideShop: `[data-list-item-id$="___shop"]`,
    hideGiftButton: `[aria-label="Send a gift"]`,
    hideQuests: `[data-list-item-id$="___quests"]`,
    hideAvatarDecorations: `[class*="avatarDecoration"]`,
};

export default definePlugin({
    name: "DiscordClassic",
    description: "Hides Discord marketing and recent additions for a classic UI",
    // TODO: replace 0n with your Discord user ID. Move to Devs in src/utils/constants.ts for the upstream PR.
    authors: [{ name: "JaceTheBlu", id: 0n }],
    settings,
    start: applyStyle,
    stop: removeStyle,
});
