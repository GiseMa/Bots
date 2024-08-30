const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eliminarcanal')
        .setDescription('Elimina el canal donde se ejecuta el comando'),

    async execute(interaction) {
        // Verifica si el usuario tiene permisos para gestionar canales
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: 'No tienes permiso para gestionar canales',
                ephemeral: true
            });
        }

        const channel = interaction.channel;

        try {
            await channel.delete();
            await interaction.reply({
                content: `Canal ${channel.name} eliminado exitosamente`,
                ephemeral: true
            });
        
        } catch (error) {
            console.error('Error al eliminar el canal:', error);
            await interaction.reply({
                content: 'Hubo un error al eliminar el canal',
                ephemeral: true
            });
        }
    }
};
