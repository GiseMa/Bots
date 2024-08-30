const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed-buttons')
        .setDescription('Muestra un mensaje embed con botones'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Gatos')
            .setDescription('Elija a su gato preferido');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('button1')
                    .setLabel('Pistacho')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('button2')
                    .setLabel('Choclo')
                    .setStyle(ButtonStyle.Secondary),
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
