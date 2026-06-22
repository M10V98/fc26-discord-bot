const {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
    ModalBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const builder = require("../Services/playerBuilder");

const ARCHETYPES = [
    "Shot Stopper", "Sweeper Keeper", "Progressor", "Boss", "Engine",
    "Marauder", "Recycler", "Maestro", "Creator", "Spark", "Magician",
    "Finisher", "Target"
];

const COLORS = {
    overview: 0x00bde7,
    stats: 0xffb000,
    playstyles: 0xffd000,
    facilities: 0x25d0a6
};

function id(sessionId, action) {
    return `pb:${sessionId}:${action}`;
}

function optionLabel(value) {
    return String(value).slice(0, 100);
}

function ownerGuard(interaction, state) {
    if (!state) {
        return interaction.reply({
            content: "This Player Builder session expired. Run `/playerbuilder` again or import its PCW1 code.",
            flags: MessageFlags.Ephemeral
        });
    }
    if (String(interaction.user.id) !== String(state.ownerId)) {
        return interaction.reply({
            content: "Only the person who opened this builder can change it. Use `/playerbuilder` to create your own.",
            flags: MessageFlags.Ephemeral
        });
    }
    return null;
}

async function context(state) {
    const [archetype, playstyles, facilities, archetypes] = await Promise.all([
        builder.getArchetype(state.a),
        builder.getPlaystyles(),
        builder.getFacilities(),
        builder.getArchetypes()
    ]);
    return { archetype, playstyles, facilities, archetypes };
}

function statRows(archetype, state, facilities, groupName) {
    const body = builder.bodyModifiers(archetype, state);
    const facility = builder.facilityModifiers(facilities, state);
    const caps = builder.levelCaps(archetype, state.l);
    const group = archetype.attributeGroups.find(row => row.name === groupName);
    return (group?.attributes || []).map(attribute => {
        const row = state.at.find(item => item.g === group.name && item.n === attribute.name);
        const value = builder.displayedValue(row, body, facility);
        const modifier = value - Number(row.v);
        return `${attribute.isKey ? "⚡ " : ""}**${attribute.name}: ${value}**${modifier ? ` (${modifier > 0 ? "+" : ""}${modifier})` : ""} · cap ${caps[attribute.name] ?? 99}`;
    });
}

function accelerationType(state, archetype, facilities) {
    const body = builder.bodyModifiers(archetype, state);
    const facility = builder.facilityModifiers(facilities, state);
    const value = name => {
        const row = state.at.find(item => item.n === name);
        return builder.displayedValue(row, body, facility);
    };
    const agility = value("Agility");
    const strength = value("Strength");
    const acceleration = value("Acceleration");
    if (state.h <= 182 && agility >= 65 && acceleration >= 80 && agility - strength >= 10) return "Explosive";
    if (strength >= 65 && strength - agility >= 4) return "Lengthy";
    return "Controlled";
}

function buildEmbed(state, ctx) {
    const { archetype, playstyles, facilities } = ctx;
    const budget = builder.levelBudget(archetype, state.l);
    const spent = builder.spentAp(archetype, state);
    const specializations = builder.activeSpecializations(archetype, state);
    const signatures = new Map(playstyles.map(row => [row.id, row]));
    const unlocked = builder.signatureUnlocks(archetype, state);
    const signatureLines = [...archetype.allPlusPlaystyleIds].map(playstyleId => {
        const style = signatures.get(playstyleId);
        const level = archetype.playstyleUnlockLevels?.[playstyleId];
        const via = Object.entries(archetype.specPlusUnlocks || {})
            .filter(([, values]) => values.includes(playstyleId))
            .map(([name]) => name);
        const available = builder.availableSignaturePlaystyles(archetype, playstyles, state)
            .some(row => row.id === playstyleId);
        return `${available ? "🔓" : "🔒"} ${style?.name || playstyleId}${level ? ` · Lvl ${level}` : ""}${via.length ? ` · ${via.join("/")}` : ""}`;
    });
    const embed = new EmbedBuilder()
        .setColor(COLORS[state.view] || COLORS.overview)
        .setTitle(`${state.name || state.a} · Player Builder`)
        .setDescription(`[Self-contained FC 26 ruleset · source reference](${"https://proclubsworld.com/tools/player-builder"})`)
        .addFields(
            { name: "Build", value: `**${state.a}** · Level **${state.l}**\n${state.h} cm · ${state.w} kg · ${accelerationType(state, archetype, facilities)}`, inline: true },
            { name: "AP", value: `**${spent} / ${budget}** spent\n${Math.max(0, budget - spent)} remaining`, inline: true },
            { name: "Specializations", value: specializations.length ? specializations.join("\n") : "None active", inline: true }
        );

    if (state.view === "overview") {
        const ratings = builder.groupRatings(archetype, state, facilities)
            .filter(row => row.name !== "Other");
        embed.addFields({
            name: "Attribute Groups",
            value: ratings.map(row => `**${row.name}** ${row.value}`).join(" · ").slice(0, 1024)
        }, {
            name: "Signature PlayStyles",
            value: signatureLines.join("\n").slice(0, 1024) || "None"
        });
    }

    if (state.view === "stats") {
        embed.addFields({
            name: state.group,
            value: statRows(archetype, state, facilities, state.group).join("\n") || "No attributes"
        }, {
            name: "Selected Attribute",
            value: `**${state.attribute}** · use −/+ below. AP costs follow the website curve.`
        });
    }

    if (state.view === "playstyles") {
        const regular = state.ps.map(playstyleId => signatures.get(playstyleId)?.name || playstyleId);
        const selectedSignatures = state.sg.map(playstyleId => signatures.get(playstyleId)?.name || playstyleId);
        embed.addFields(
            { name: `Signature (${state.sg.length}/${builder.signatureSlotCount(state.l)})`, value: selectedSignatures.join("\n") || "None selected", inline: true },
            { name: `Regular (${state.ps.length}/${builder.regularSlotCount(state.l)})`, value: regular.join("\n") || "None selected", inline: true },
            { name: "Archetype Signature Pool", value: signatureLines.join("\n").slice(0, 1024) || "None" }
        );
    }

    if (state.view === "facilities") {
        const level = facilities.levels.find(row => Number(row.level) === Number(state.cl)) || facilities.levels[0];
        const equipped = state.fa.map(row => `${row.n} · ${row.l ?? row.s}★`);
        const spentBudget = state.fa.reduce((sum, selected) => {
            const facility = level?.facilities.find(row => row.name === selected.n);
            return sum + Number(facility?.starLevels.find(row => Number(row.star) === Number(selected.l ?? selected.s))?.cost || 0);
        }, 0);
        embed.addFields(
            { name: "Club Facilities", value: `Club level **${state.cl}** · **${spentBudget.toFixed(1)}M / ${Number(level?.totalBudget || 0).toFixed(1)}M**`, inline: false },
            { name: "Equipped", value: equipped.join("\n") || "No facilities equipped", inline: true },
            { name: "Selected", value: state.facility || "Choose a facility below", inline: true }
        );
    }

    return embed.setFooter({ text: "Interactive session expires after 45 minutes" });
}

function archetypeRow(sessionId, state, archetypes) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(id(sessionId, "archetype"))
            .setPlaceholder("Choose an archetype")
            .addOptions(archetypes.map(name => ({
                label: optionLabel(name),
                value: name,
                default: name === state.a
            })))
    );
}

function navigationRow(sessionId, state) {
    return new ActionRowBuilder().addComponents(
        ...[
            ["overview", "Overview", ButtonStyle.Primary],
            ["stats", "Stats", ButtonStyle.Secondary],
            ["playstyles", "PlayStyles", ButtonStyle.Secondary],
            ["facilities", "Facilities", ButtonStyle.Secondary]
        ].map(([view, label, style]) =>
            new ButtonBuilder()
                .setCustomId(id(sessionId, `view-${view}`))
                .setLabel(label)
                .setStyle(state.view === view ? ButtonStyle.Primary : style)
        ),
        new ButtonBuilder()
            .setCustomId(id(sessionId, "export"))
            .setLabel("Share Code")
            .setStyle(ButtonStyle.Success)
    );
}

function statsRows(sessionId, state, archetype) {
    const group = archetype.attributeGroups.find(row => row.name === state.group) || archetype.attributeGroups[0];
    if (!group.attributes.some(row => row.name === state.attribute)) state.attribute = group.attributes[0].name;
    return [
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(id(sessionId, "group"))
                .setPlaceholder("Attribute group")
                .addOptions(archetype.attributeGroups.map(row => ({ label: row.name, value: row.name, default: row.name === group.name })))
        ),
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(id(sessionId, "attribute"))
                .setPlaceholder("Attribute")
                .addOptions(group.attributes.map(row => ({ label: row.name, value: row.name, default: row.name === state.attribute })))
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(id(sessionId, "minus")).setLabel("−1").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(id(sessionId, "plus")).setLabel("+1").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(id(sessionId, "settings")).setLabel("Level & Physique").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(id(sessionId, "reset")).setLabel("Reset Build").setStyle(ButtonStyle.Danger)
        )
    ];
}

function playstyleRows(sessionId, state, ctx) {
    const lookup = new Map(ctx.playstyles.map(row => [row.id, row]));
    const signatures = builder.availableSignaturePlaystyles(
        ctx.archetype,
        ctx.playstyles,
        state
    );
    const allRegular = builder.availableRegularPlaystyles(ctx.playstyles, state)
        .filter(row => !state.sg.includes(row.id));
    const categories = [...new Set(
        ctx.playstyles.map(row => row.category).filter(Boolean)
    )];
    if (!categories.includes(state.playstyleCategory)) {
        state.playstyleCategory = categories[0] || "Scoring";
    }
    const regular = allRegular
        .filter(row => row.category === state.playstyleCategory)
        .slice(0, 25);
    const source = state.playstyleMode === "signature" ? signatures : regular;
    const selected = state.playstyleMode === "signature" ? state.sg : state.ps;
    const sourceIds = new Set(source.map(row => row.id));
    const selectedHere = selected.filter(playstyleId => sourceIds.has(playstyleId));
    const otherRegularCount = state.playstyleMode === "regular"
        ? state.ps.filter(playstyleId => !sourceIds.has(playstyleId)).length
        : 0;
    const selectionLimit = state.playstyleMode === "signature"
        ? builder.signatureSlotCount(state.l)
        : Math.max(
            selectedHere.length,
            builder.regularSlotCount(state.l) - otherRegularCount
        );
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(id(sessionId, "mode-signature")).setLabel("Signature").setStyle(state.playstyleMode === "signature" ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(id(sessionId, "mode-regular")).setLabel("Regular").setStyle(state.playstyleMode === "regular" ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(id(sessionId, "settings")).setLabel("Level & Physique").setStyle(ButtonStyle.Secondary)
        )
    ];
    if (state.playstyleMode === "regular") {
        rows.unshift(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(id(sessionId, "playstyle-category"))
                    .setPlaceholder("PlayStyle category")
                    .addOptions(categories.map(category => ({
                        label: optionLabel(category),
                        value: category,
                        default: category === state.playstyleCategory
                    })))
            )
        );
    }
    if (source.length && selectionLimit > 0) {
        rows.unshift(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(id(sessionId, "playstyle"))
                    .setPlaceholder(`Choose ${state.playstyleMode} PlayStyles`)
                    .setMinValues(0)
                    .setMaxValues(Math.min(
                        selectionLimit,
                        source.length
                    ))
                    .addOptions(source.map(row => ({
                        label: optionLabel(row.name),
                        value: row.id,
                        description: optionLabel(row.requirementsText || "Requirements met"),
                        default: selected.includes(row.id)
                    })))
            )
        );
    }
    return rows;
}

function facilityRows(sessionId, state, facilities) {
    const level = facilities.levels.find(row => Number(row.level) === Number(state.cl)) || facilities.levels[0];
    const pageCount = Math.max(1, Math.ceil(level.facilities.length / 25));
    state.facilityPage = Math.max(0, Math.min(pageCount - 1, state.facilityPage));
    const page = level.facilities.slice(state.facilityPage * 25, state.facilityPage * 25 + 25);
    if (!state.facility || !level.facilities.some(row => row.name === state.facility)) state.facility = page[0]?.name || null;
    return [
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(id(sessionId, "facility"))
                .setPlaceholder("Choose a facility")
                .addOptions(page.map(row => ({ label: optionLabel(row.name), value: row.name, description: optionLabel(row.costRange), default: row.name === state.facility })))
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(id(sessionId, "facility-prev")).setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(state.facilityPage === 0),
            new ButtonBuilder().setCustomId(id(sessionId, "facility-1")).setLabel("Equip 1★").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(id(sessionId, "facility-2")).setLabel("Equip 2★").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(id(sessionId, "facility-3")).setLabel("Equip 3★").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(id(sessionId, "facility-next")).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(state.facilityPage >= pageCount - 1)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(id(sessionId, "facility-remove")).setLabel("Remove Selected").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(id(sessionId, "settings")).setLabel("Club Level").setStyle(ButtonStyle.Secondary)
        )
    ];
}

async function payload(sessionId, state) {
    const ctx = await context(state);
    state.sp = builder.activeSpecializations(ctx.archetype, state);
    builder.reconcilePlaystyles(ctx.archetype, ctx.playstyles, state);
    builder.reconcileFacilities(ctx.facilities, state);
    const rows = [archetypeRow(sessionId, state, ctx.archetypes), navigationRow(sessionId, state)];
    if (state.view === "stats") rows.push(...statsRows(sessionId, state, ctx.archetype));
    else if (state.view === "playstyles") rows.push(...playstyleRows(sessionId, state, ctx));
    else if (state.view === "facilities") rows.push(...facilityRows(sessionId, state, ctx.facilities));
    else rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id(sessionId, "settings")).setLabel("Level & Physique").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(id(sessionId, "import")).setLabel("Import Code").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(id(sessionId, "reset")).setLabel("Reset Build").setStyle(ButtonStyle.Danger)
    ));
    return { embeds: [buildEmbed(state, ctx)], components: rows.slice(0, 5) };
}

function input(customId, label, value, required = true) {
    return new ActionRowBuilder().addComponents(
        new TextInputBuilder()
            .setCustomId(customId)
            .setLabel(label)
            .setStyle(TextInputStyle.Short)
            .setRequired(required)
            .setValue(String(value ?? "").slice(0, 100))
    );
}

function settingsModal(sessionId, state) {
    return new ModalBuilder()
        .setCustomId(id(sessionId, "settings-submit"))
        .setTitle("Player Builder Settings")
        .addComponents(
            input("name", "Build name", state.name, false),
            input("level", "Player level (1-95)", state.l),
            input("height", "Height in cm", state.h),
            input("weight", "Weight in kg", state.w),
            input("club-level", "Club level (1-10)", state.cl)
        );
}

function importModal(sessionId) {
    return new ModalBuilder()
        .setCustomId(id(sessionId, "import-submit"))
        .setTitle("Import Player Builder Code")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("code")
                    .setLabel("PCW1 build code")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setPlaceholder("PCW1:...")
            )
        );
}

async function execute(interaction) {
    await interaction.deferReply();
    const code = interaction.options.getString("code");
    let archetype;
    let state;
    if (code) {
        const raw = builder.decodeState(code);
        if (!ARCHETYPES.includes(raw.a)) throw new Error("That code uses an unknown archetype.");
        archetype = await builder.getArchetype(raw.a);
        state = builder.cleanPortableState(raw, archetype, interaction.user.id);
        const invalid = builder.validateState(archetype, state);
        if (invalid) throw new Error(`That PCW1 build is invalid: ${invalid}`);
    } else {
        const name = interaction.options.getString("archetype") || "Shot Stopper";
        archetype = await builder.getArchetype(name);
        state = builder.freshState(archetype, interaction.user.id);
    }
    const sessionId = builder.saveSession(state);
    return interaction.editReply(await payload(sessionId, state));
}

async function handleComponent(interaction) {
    const [, sessionId, action] = interaction.customId.split(":");
    let state = builder.getSession(sessionId);
    const blocked = ownerGuard(interaction, state);
    if (blocked) return blocked;
    let archetype = await builder.getArchetype(state.a);

    if (action === "settings") return interaction.showModal(settingsModal(sessionId, state));
    if (action === "import") return interaction.showModal(importModal(sessionId));
    if (action === "export") {
        const code = builder.encodeState(state);
        return interaction.reply(code.length <= 1900 ? {
            content: `Import this with \`/playerbuilder code:\`\n\n\`${code}\``,
            flags: MessageFlags.Ephemeral
        } : {
            content: "Your PCW1 build code is attached.",
            files: [new AttachmentBuilder(Buffer.from(code), { name: "player-builder-code.txt" })],
            flags: MessageFlags.Ephemeral
        });
    }
    if (action.startsWith("view-")) state.view = action.slice(5);
    else if (action === "archetype") {
        archetype = await builder.getArchetype(interaction.values[0]);
        const replacement = builder.freshState(archetype, state.ownerId);
        replacement.view = state.view;
        Object.assign(state, replacement);
    } else if (action === "group") {
        state.group = interaction.values[0];
        state.attribute = archetype.attributeGroups.find(row => row.name === state.group)?.attributes[0]?.name || "";
    } else if (action === "attribute") state.attribute = interaction.values[0];
    else if (action === "minus" || action === "plus") {
        const result = builder.adjustAttribute(archetype, state, action === "plus" ? 1 : -1);
        if (!result.ok) return interaction.reply({ content: result.reason, flags: MessageFlags.Ephemeral });
    } else if (action === "reset") {
        const replacement = builder.freshState(archetype, state.ownerId);
        Object.assign(state, replacement);
    } else if (action.startsWith("mode-")) state.playstyleMode = action.slice(5);
    else if (action === "playstyle-category") state.playstyleCategory = interaction.values[0];
    else if (action === "playstyle") {
        if (state.playstyleMode === "signature") state.sg = interaction.values;
        else {
            const playstyles = await builder.getPlaystyles();
            const categoryIds = new Set(
                playstyles
                    .filter(row => row.category === state.playstyleCategory)
                    .map(row => row.id)
            );
            state.ps = state.ps
                .filter(playstyleId => !categoryIds.has(playstyleId))
                .concat(interaction.values);
        }
    } else if (action === "facility") state.facility = interaction.values[0];
    else if (action === "facility-prev") state.facilityPage -= 1;
    else if (action === "facility-next") state.facilityPage += 1;
    else if (action.startsWith("facility-") && /^[123]$/.test(action.slice(-1))) {
        const facilities = await builder.getFacilities();
        const level = facilities.levels.find(row => Number(row.level) === Number(state.cl));
        const star = Number(action.slice(-1));
        const candidate = state.fa.filter(row => row.n !== state.facility);
        candidate.push({ n: state.facility, l: star, c: "Player" });
        const cost = candidate.reduce((sum, selected) => {
            const facility = level?.facilities.find(row => row.name === selected.n);
            return sum + Number(facility?.starLevels.find(row => Number(row.star) === Number(selected.l ?? selected.s))?.cost || 0);
        }, 0);
        if (cost > Number(level?.totalBudget || 0)) {
            return interaction.reply({
                content: `That would cost ${cost.toFixed(1)}M; club level ${state.cl} has a ${Number(level?.totalBudget || 0).toFixed(1)}M budget.`,
                flags: MessageFlags.Ephemeral
            });
        }
        state.fa = candidate;
    } else if (action === "facility-remove") state.fa = state.fa.filter(row => row.n !== state.facility);

    return interaction.update(await payload(sessionId, state));
}

async function handleModal(interaction) {
    const [, sessionId, action] = interaction.customId.split(":");
    const state = builder.getSession(sessionId);
    const blocked = ownerGuard(interaction, state);
    if (blocked) return blocked;
    if (action === "import-submit") {
        const raw = builder.decodeState(
            interaction.fields.getTextInputValue("code")
        );
        if (!ARCHETYPES.includes(raw.a)) {
            throw new Error("That code uses an unknown archetype.");
        }
        const importedArchetype = await builder.getArchetype(raw.a);
        const imported = builder.cleanPortableState(
            raw,
            importedArchetype,
            state.ownerId
        );
        const invalid = builder.validateState(importedArchetype, imported);
        if (invalid) throw new Error(`That PCW1 build is invalid: ${invalid}`);
        Object.assign(state, imported);
        return interaction.update(await payload(sessionId, state));
    }

    const archetype = await builder.getArchetype(state.a);
    const bounds = archetype.physiqueBounds;
    const number = (key, min, max) => {
        const value = Number(interaction.fields.getTextInputValue(key));
        if (!Number.isInteger(value) || value < min || value > max) {
            throw new Error(`${key} must be a whole number from ${min} to ${max}.`);
        }
        return value;
    };
    const previous = { name: state.name, l: state.l, h: state.h, w: state.w, cl: state.cl };
    state.name = interaction.fields.getTextInputValue("name").trim().slice(0, 80);
    state.l = number("level", 1, 95);
    state.h = number("height", bounds.heightMin, bounds.heightMax);
    state.w = number("weight", bounds.weightMin, bounds.weightMax);
    state.cl = number("club-level", 1, 10);
    const invalid = builder.validateState(archetype, state);
    if (invalid) {
        Object.assign(state, previous);
        return interaction.reply({ content: invalid, flags: MessageFlags.Ephemeral });
    }
    return interaction.update(await payload(sessionId, state));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("playerbuilder")
        .setDescription("Build and share an FC 26 Pro Clubs player")
        .addStringOption(option =>
            option.setName("archetype").setDescription("Starting archetype").addChoices(
                ...ARCHETYPES.map(name => ({ name, value: name }))
            )
        )
        .addStringOption(option =>
            option.setName("code").setDescription("Import a PCW1 Player Builder code")
        ),
    execute,
    handleComponent,
    handleModal,
    buildPayload: payload
};
