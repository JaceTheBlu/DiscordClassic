/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { copyWithToast } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";

import { buildReport } from "./diagnostics";
import { setFilterPatterns } from "./filter";
import { getStats, loadStats, recordBlocked, StatKey } from "./stats";
import { BlockedDashboard, HandledElsewhere, ModePicker, Section } from "./ui";

const STYLE_ID = "vc-discord-classic";

export function apply() {
    const enabled = (Object.keys(RULES) as RuleKey[]).filter(key => settings.store[key]);

    let el = document.getElementById(STYLE_ID);
    if (!el) {
        el = document.createElement("style");
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = enabled.map(key => `${RULES[key]} { display: none !important; }`).join("\n");

    setFilterPatterns(isBlocking() && settings.store.urlBlocking
        ? enabled.flatMap(key => FILTERS[key] ?? [])
        : []);
}

// "filter" is the stored value of Block mode, kept for existing installs.
const isBlocking = () => settings.store.mode === "filter";

function stop() {
    document.getElementById(STYLE_ID)?.remove();
    setFilterPatterns([]);
}

// Hidden elements stay in the DOM, so the scan sees them even while rules are active.
function copySelectorReport() {
    const report = {
        ...buildReport(RULES, settings.store, plugin.patches!.map(p => String(p.find))),
        blocked: getStats(),
    };
    copyWithToast(JSON.stringify(report, null, 2), "DiscordClassic: selector report copied");
}

// Toggles are drawn by their Section (with All / None), so Vencord's own row is hidden.
// Section calls apply() itself: toggles take effect live without a restart.
const toggle = (displayName: string, description: string, defaultValue = false) => ({
    type: OptionType.BOOLEAN as const,
    displayName,
    description,
    default: defaultValue,
    hidden: true,
});

const section = (title: string, text: string, keys: string[] = []) => ({
    type: OptionType.COMPONENT as const,
    component: () => <Section title={title} text={text} keys={keys} />,
});

export const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        displayName: "Removal mode",
        description: "Hide or Block, picked with the cards below.",
        // Shown as ModePicker cards instead of a dropdown.
        hidden: true,
        options: [
            { label: "Hide", value: "hide", default: true },
            { label: "Block", value: "filter" },
        ],
        onChange: apply,
    },
    modePicker: {
        type: OptionType.COMPONENT,
        component: ModePicker,
    },
    blockedDashboard: {
        type: OptionType.COMPONENT,
        component: BlockedDashboard,
    },
    urlBlocking: {
        type: OptionType.BOOLEAN,
        displayName: "Experimental: block by URL",
        description: "In Block mode, also blocks media by URL for options Discord's code cannot be patched for yet. Hooks browser functions, which may look suspicious to Discord's anti-bot checks. Leave off if you get captchas.",
        default: false,
        hidden: () => !isBlocking(),
        onChange: apply,
    },

    sectionMarketing: section("Marketing", "Nitro, Shop and gift upsells.", ["hideNitroTab", "hideShop", "hideGiftButton"]),
    hideNitroTab: toggle("Nitro tab", "Removes the Nitro entry at the top of the direct messages list.", true),
    hideShop: toggle("Shop tab", "Removes the Shop entry at the top of the direct messages list.", true),
    hideGiftButton: toggle("Gift button", "Removes the gift icon from the message input bar.", true),

    sectionRecent: section("Recent additions", "Features added to Discord lately.", ["hideQuests"]),
    hideQuests: toggle("Quests", "Removes the Quests entry from the direct messages list and the quest icon in member activities."),

    sectionCosmetics: section("Other users' cosmetics", "Paid decorations other people show on their profile and name.", [
        "hideAvatarDecorations", "hideNameplates", "hideClanTags", "hideProfileFrames", "hideProfileEffects", "freezeAnimations",
    ]),
    hideAvatarDecorations: toggle("Avatar decorations (blockable)", "Removes the animated frames drawn around avatars. The avatar itself stays."),
    hideNameplates: toggle("Nameplates (blockable)", "Removes the image or animation drawn behind some usernames in the member list. Blocking covers the member list only."),
    freezeAnimations: {
        type: OptionType.BOOLEAN,
        displayName: "Freeze animations",
        description: "Shows animated avatars, banners, avatar decorations and nameplates as still images. Needs a restart. Do not combine with the AlwaysAnimate plugin.",
        default: false,
        restartNeeded: true,
        hidden: true,
    },
    hideClanTags: toggle("Server tags (blockable)", "Removes the small server badge shown next to usernames (e.g. CHB, SEP)."),
    hideProfileFrames: toggle("Profile frames", "Removes the decorative border drawn around some profiles (e.g. candles, dripping wax)."),
    hideProfileEffects: toggle("Profile effects", "Removes the animated overlay drawn over some profiles (glow, sparkles)."),

    sectionElsewhere: section("Handled elsewhere", "Already removable without this plugin."),
    handledElsewhere: {
        type: OptionType.COMPONENT,
        component: HandledElsewhere,
    },
});

// Validation status of each selector lives in docs/selectors.md: Discord changes its markup every build.
// Prefer stable attributes (data-list-item-id, href, aria-label). When none exists, match the
// readable class prefix with [class*=...], never the full hashed class.
const RULES = {
    hideNitroTab: "[data-list-item-id$='___nitro']",
    hideShop: "[data-list-item-id$='___shop']",
    hideGiftButton: "[aria-label='Send a gift']",
    hideQuests: "[data-list-item-id$='___quests'], svg[class*='questsIcon']",
    // Only the image: the matching svg container also wraps the avatar itself.
    hideAvatarDecorations: "img[class*='avatarDecoration']",
    // The "nameplated" class sits on the whole row: only its first child holds the background.
    hideNameplates: "[class*='nameplated'] > [class*='container']:first-child",
    // DM list and member list use different class names for the same chip.
    hideClanTags: "[class*='clanTag'], span[class*='guildTag']",
    // Layer stack drawn over the profile popout, labelled role="img".
    hideProfileFrames: "[class*='profileFrameContainer']",
    // Overlay layer of the profile popout (role="img"), holds img.effect.
    hideProfileEffects: "[class*='profileEffects']",
} satisfies Partial<Record<keyof typeof settings.store, string>>;

type RuleKey = keyof typeof RULES;

// Media URL patterns for experimental URL blocking, only from URLs seen in a selector report
// ("media" section and "src" fields). Never add a guessed pattern.
// Decorations, nameplates and Shop previews share one CDN prefix: filtering one blocks them all.
const COLLECTIBLES = /^https:\/\/cdn\.discordapp\.com\/media\/v1\/collectibles-shop\//;

const FILTERS: Partial<Record<RuleKey, RegExp[]>> = {
    hideAvatarDecorations: [COLLECTIBLES],
    hideNameplates: [COLLECTIBLES],
    hideClanTags: [/^https:\/\/cdn\.discordapp\.com\/clan-badges\//],
    hideProfileFrames: [COLLECTIBLES],
};

const plugin = definePlugin({
    name: "DiscordClassic",
    description: "Hides Discord marketing and recent additions for a classic UI",
    // TODO: replace 0n with your Discord user ID. Move to Devs in src/utils/constants.ts for the upstream PR.
    authors: [{ name: "JaceTheBlu", id: 0n }],
    settings,
    // Match strings come from Vencord plugins that track Discord's current code (see docs/selectors.md).
    patches: [
        {
            // Block mode: no decoration URL means no download. Same insertion point as Vencord's Decor plugin.
            find: "getAvatarDecorationURL:",
            replacement: {
                match: /(?<=function \i\(\i\){)(?=let{avatarDecoration)/,
                // The first argument holds the decoration, its asset names the file (as in Decor).
                replace: "if($self.blocks(\"hideAvatarDecorations\",arguments[0]?.avatarDecoration))return;",
            },
        },
        {
            // Block mode: the badge URL builder returns nothing (code seen in a report, discord/1.0.9265).
            find: "/clan-badges/",
            replacement: {
                // Inserted after Discord's own null check, so only real badges get counted.
                match: /(?<=let{CDN_HOST:\i}=window\.GLOBAL_ENV;if\(null==\i\)return;)(?=let \i=\i\.\i\[\i\];return`https:\/\/\$\{\i\}\/clan-badges\/)/,
                replace: "if($self.blocks(\"hideClanTags\",[...arguments].join()))return;",
            },
        },
        {
            // Block mode: member list rows get no nameplate, so nothing is fetched (code seen in a report, discord/1.0.9265).
            // Two modules contain this find: the row component and the list rendering it. Only the list matches.
            find: "onClickPremiumGuildIcon:",
            all: true,
            noWarn: true,
            replacement: {
                match: /(?<=,nameplate:)(\i)(?=,onClick:)/g,
                replace: "$self.blocks(\"hideNameplates\",$1)?void 0:$1",
            },
        },
        // Freeze animations: inverse of Vencord's AlwaysAnimate patches.
        {
            // Avatars, banners and decorations
            find: "canAnimate:",
            all: true,
            noWarn: true,
            predicate: () => settings.store.freezeAnimations,
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                // Leave destructuring patterns ("{canAnimate:x}=props") alone.
                replace: (m, rest) => /}=.+/.test(rest) ? m : `canAnimate:!1${rest}`,
            },
        },
        {
            // Nameplates
            find: ".MINI_PREVIEW,[",
            predicate: () => settings.store.freezeAnimations,
            replacement: {
                match: /animate:\i,loop:/,
                replace: "animate:!1,loop:!1,_loop:",
            },
        },
    ],
    toolboxActions: {
        "Copy selector report": copySelectorReport,
    },
    copySelectorReport,
    // Called by the block patches on every render. item identifies the file for the counter.
    blocks(key: StatKey & RuleKey, item?: unknown) {
        if (!isBlocking() || !settings.store[key]) return false;
        recordBlocked(key, item);
        return true;
    },
    start() {
        loadStats();
        apply();
    },
    stop,
});

export default plugin;
