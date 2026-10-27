/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Settings page components: mode picker, blocked counter dashboard, section headings, shortcuts.

import "./style.css";

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { Button } from "@components/Button";
import { FormSwitch } from "@components/FormSwitch";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { openPluginModal } from "@components/settings";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { SettingsRouter, useEffect, useState } from "@webpack/common";

import { apply, settings } from ".";
import { formatKb, getStats, resetStats } from "./stats";

const cl = classNameFactory("vc-dclassic-");

const MODES = [
    { value: "hide", title: "Hide", text: "Discord still downloads everything, then the plugin hides it." },
    // "filter" is the stored value of Block mode, kept for existing installs.
    { value: "filter", title: "Block", text: "Like an ad blocker: Discord never fetches what you removed. Options marked (blockable) are blocked, the rest is hidden." },
] as const;

export function ModePicker() {
    const { mode } = settings.use(["mode"]);
    return (
        <div className={cl("modes")} role="radiogroup" aria-label="Removal mode">
            {MODES.map(m => (
                <button
                    key={m.value}
                    role="radio"
                    aria-checked={mode === m.value}
                    className={classes(cl("mode"), mode === m.value && cl("mode-active"))}
                    onClick={() => { settings.store.mode = m.value; apply(); }}
                >
                    <span className={cl("mode-title")}>{m.title}</span>
                    <span className={cl("mode-text")}>{m.text}</span>
                </button>
            ))}
        </div>
    );
}

type Period = "session" | "total";

// uBlock-style dashboard. Bars share one hue: the labels carry identity, the length carries the count.
export function BlockedDashboard() {
    const { mode } = settings.use(["mode"]);
    const [stats, setStats] = useState(getStats);
    const [period, setPeriod] = useState<Period>("session");
    useEffect(() => {
        const id = setInterval(() => setStats(getStats()), 1000);
        return () => clearInterval(id);
    }, []);

    const rows = stats.rows.filter(r => r.key !== "urlBlocking" || r.total);
    const count = rows.reduce((sum, r) => sum + r[period], 0);
    const kb = period === "session" ? stats.sessionKb : stats.totalKb;
    const max = Math.max(1, ...rows.map(r => r[period]));

    return (
        <div className={cl("card")}>
            <div className={cl("card-head")}>
                <HeadingSecondary>Blocked</HeadingSecondary>
                <div className={cl("segmented")} role="tablist">
                    {(["session", "total"] as const).map(p => (
                        <button key={p} role="tab" aria-selected={period === p} className={classes(cl("segment"), period === p && cl("segment-active"))} onClick={() => setPeriod(p)}>
                            {p === "session" ? "This session" : "Since install"}
                        </button>
                    ))}
                </div>
            </div>

            <div className={cl("tiles")}>
                <div className={cl("tile")}>
                    <span className={cl("tile-value")}>{count.toLocaleString()}</span>
                    <span className={cl("tile-label")}>files not downloaded</span>
                </div>
                <div className={cl("tile")}>
                    <span className={cl("tile-value")}>~{formatKb(kb)}</span>
                    <span className={cl("tile-label")}>data saved (estimate)</span>
                </div>
            </div>

            <div className={cl("bars")}>
                {rows.map(r => (
                    <div key={r.key} className={cl("bar-row")} title={`${r.label}: ${r[period]} files, about ${formatKb(r[period] * r.estimatedKbPerItem)} (${r.estimatedKbPerItem} KB each, estimated)`}>
                        <span className={cl("bar-label")}>{r.label}</span>
                        <div className={cl("bar-track")}>
                            {r[period] > 0 && <div className={cl("bar-fill")} style={{ width: `${(r[period] / max) * 100}%` }} />}
                        </div>
                        <span className={cl("bar-value")}>{r[period]}</span>
                    </div>
                ))}
            </div>

            <div className={cl("card-foot")}>
                <Paragraph className={cl("muted")}>
                    {mode === "filter"
                        ? "Each file counts once per session. Data uses average file sizes, hover a bar for details."
                        : "Counting starts in Block mode: in Hide mode Discord downloads everything."}
                </Paragraph>
                <Button size="small" variant="secondary" onClick={() => { resetStats(); setStats(getStats()); }}>
                    Reset
                </Button>
            </div>
        </div>
    );
}

type SettingKey = keyof typeof settings.store;

// Settings UI has no sections, so this component draws one: heading, summary, All / None,
// and the section's own toggles (hidden from Vencord's list so they can be refreshed together).
export function Section({ title, text, keys }: { title: string; text: string; keys: string[]; }) {
    const store = settings.use(keys as SettingKey[]);
    const [restart, setRestart] = useState(false);

    const defs = keys.map(key => ({ key: key as SettingKey, def: settings.def[key as SettingKey] as { displayName?: string; description: string; restartNeeded?: boolean; } }));
    // Restart-only options stay out of All / None, so a bulk change never asks for a restart.
    const bulk = defs.filter(d => !d.def.restartNeeded);
    const setAll = (value: boolean) => {
        for (const { key } of bulk) (settings.store as Record<string, unknown>)[key] = value;
        apply();
    };
    const allOn = bulk.every(({ key }) => store[key]);
    const allOff = bulk.every(({ key }) => !store[key]);

    return (
        <div className={cl("section")}>
            <div className={cl("section-head")}>
                <div>
                    <HeadingSecondary>{title}</HeadingSecondary>
                    <Paragraph className={cl("muted")}>{text}</Paragraph>
                </div>
                {bulk.length > 1 && (
                    <div className={cl("segmented")}>
                        <button className={classes(cl("segment"), allOn && cl("segment-active"))} onClick={() => setAll(true)}>All</button>
                        <button className={classes(cl("segment"), allOff && cl("segment-active"))} onClick={() => setAll(false)}>None</button>
                    </div>
                )}
            </div>
            {defs.map(({ key, def }) => (
                <FormSwitch
                    key={key}
                    title={def.displayName ?? key}
                    description={def.description}
                    value={Boolean(store[key])}
                    onChange={value => {
                        (settings.store as Record<string, unknown>)[key] = value;
                        if (def.restartNeeded) setRestart(true);
                        else apply();
                    }}
                />
            ))}
            {restart && <Paragraph className={cl("restart")}>Restart Discord to apply this change.</Paragraph>}
        </div>
    );
}

// Things Discord or another Vencord plugin already removes: link to them instead of duplicating.
export function HandledElsewhere() {
    const themesOn = isPluginEnabled("NoProfileThemes");
    return (
        <div className={cl("links")}>
            <div className={cl("link-row")}>
                <div>
                    <div className={cl("link-title")}>Profile themes {themesOn && <span className={cl("badge")}>Enabled</span>}</div>
                    <Paragraph className={cl("muted")}>Gradient profile backgrounds, removed by Vencord's NoProfileThemes plugin.</Paragraph>
                </div>
                <Button size="small" variant="secondary" onClick={() => openPluginModal(plugins.NoProfileThemes)}>Open plugin</Button>
            </div>
            <div className={cl("link-row")}>
                <div>
                    <div className={cl("link-title")}>Name styles and message bar buttons</div>
                    <Paragraph className={cl("muted")}>Fonts and glow on names, GIF, sticker, emoji and apps buttons: Discord's own Accessibility settings.</Paragraph>
                </div>
                <Button size="small" variant="secondary" onClick={() => SettingsRouter.openUserSettings("accessibility_panel")}>Open Accessibility</Button>
            </div>
        </div>
    );
}
