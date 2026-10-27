/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { openPluginModal } from "@components/settings";
import { copyWithToast } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { SettingsRouter, useEffect, useState } from "@webpack/common";

import { buildReport } from "./diagnostics";
import { setFilterPatterns } from "./filter";
import { formatKb, getStats, loadStats, recordBlocked, resetStats, StatKey } from "./stats";

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

// Live counter like uBlock's badge. Sizes are averages, so the data figure is an estimate.
function BlockedCounter() {
    const [stats, setStats] = useState(getStats);
    useEffect(() => {
        const id = setInterval(() => setStats(getStats()), 1000);
        return () => clearInterval(id);
    }, []);

    const sessionCount = stats.rows.reduce((sum, r) => sum + r.session, 0);
    const totalCount = stats.rows.reduce((sum, r) => sum + r.total, 0);

    return (
        <div>
            <HeadingSecondary>Blocked</HeadingSecondary>
            <Paragraph>
                This session: {sessionCount} files, about {formatKb(stats.sessionKb)} not downloaded.
                Since install: {totalCount} files, about {formatKb(stats.totalKb)}.
            </Paragraph>
            {stats.rows.filter(r => r.total).map(r => (
                <Paragraph key={r.key}>{r.label}: {r.session} this session, {r.total} total</Paragraph>
            ))}
            <Paragraph>Counts distinct files in Block mode only. Data is estimated from average file sizes.</Paragraph>
            <Button size="small" variant="secondary" style={{ marginTop: 8 }} onClick={() => { resetStats(); setStats(getStats()); }}>
                Reset counter
            </Button>
        </div>
    );
}

// Things Discord or another Vencord plugin already removes: link to them instead of duplicating.
function HandledElsewhere() {
    const themesOn = isPluginEnabled("NoProfileThemes");
    return (
        <div>
            <Paragraph>
                Profile themes (gradient profile backgrounds): Vencord's NoProfileThemes plugin{themesOn ? " is enabled." : " removes them."}
            </Paragraph>
            <Button size="small" variant="secondary" style={{ margin: "4px 0 12px" }} onClick={() => openPluginModal(plugins.NoProfileThemes)}>
                Open NoProfileThemes
            </Button>
            <Paragraph>
                Display name styles (fonts and glow on names) and the GIF, sticker, emoji and apps buttons of the message bar: Discord's own Accessibility settings.
            </Paragraph>
            <Button size="small" variant="secondary" style={{ marginTop: 4 }} onClick={() => SettingsRouter.openUserSettings("accessibility_panel")}>
                Open Accessibility settings
            </Button>
        </div>
    );
}

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        displayName: "Removal mode",
        description: "Hide: elements are still downloaded, then hidden. Block: like an ad blocker, Discord never fetches what you removed (less bandwidth and CPU). Block applies to options marked (blockable), the rest is hidden.",
        options: [
            { label: "Hide", value: "hide", default: true },
            { label: "Block", value: "filter" },
        ],
        onChange: apply,
    },
    blockedCounter: {
        type: OptionType.COMPONENT,
        component: BlockedCounter,
    },
    urlBlocking: {
        type: OptionType.BOOLEAN,
        displayName: "Experimental: block by URL",
        description: "In Block mode, also blocks media by URL for options Discord's code cannot be patched for yet. Hooks browser functions, which may look suspicious to Discord's anti-bot checks. Leave off if you get captchas.",
        default: false,
        onChange: apply,
    },

    sectionMarketing: section("Marketing"),
    hideNitroTab: toggle("Nitro tab", "Removes the Nitro entry at the top of the direct messages list.", true),
    hideShop: toggle("Shop tab", "Removes the Shop entry at the top of the direct messages list.", true),
    hideGiftButton: toggle("Gift button", "Removes the gift icon from the message input bar.", true),

    sectionRecent: section("Recent additions"),
    hideQuests: toggle("Quests", "Removes the Quests entry from the direct messages list and the quest icon in member activities."),

    sectionCosmetics: section("Other users' cosmetics"),
    hideAvatarDecorations: toggle("Avatar decorations (blockable)", "Removes the animated frames drawn around avatars. The avatar itself stays."),
    hideNameplates: toggle("Nameplates (blockable)", "Removes the image or animation drawn behind some usernames in the member list. Blocking covers the member list only."),
    freezeAnimations: {
        type: OptionType.BOOLEAN,
        displayName: "Freeze animations",
        description: "Shows animated avatars, banners, avatar decorations and nameplates as still images. Needs a restart. Do not combine with the AlwaysAnimate plugin.",
        default: false,
        restartNeeded: true,
    },
    hideClanTags: toggle("Server tags (blockable)", "Removes the small server badge shown next to usernames (e.g. CHB, SEP)."),

    sectionElsewhere: section("Handled elsewhere"),
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
