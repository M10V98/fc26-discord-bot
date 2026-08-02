const { PermissionFlagsBits } = require("discord.js");

const MANAGER_ROLE_NAME = "manager";

function hasRoleNamed(interaction, roleName) {
    const roles = interaction.member?.roles?.cache;

    return Boolean(
        roles?.some(role =>
            role.name.toLowerCase() === roleName.toLowerCase()
        )
    );
}

function canUseAdminCommands(interaction) {
    return Boolean(
        interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
        interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
        hasRoleNamed(interaction, MANAGER_ROLE_NAME)
    );
}

module.exports = { canUseAdminCommands, hasRoleNamed, MANAGER_ROLE_NAME };
