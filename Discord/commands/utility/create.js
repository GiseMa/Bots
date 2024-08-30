const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crearcanal')
        .setDescription('Agrega un nuevo canal a la categoria')
        .addStringOption(option =>
            option.setName('nombre')
            .setDescription('Nombre del nuevo canal')
            .setRequired(true)
        ),

    async execute(interaction){
        const channelName = interaction.options.getString('nombre');
        const categoryId = '1085390914786185317';

        if(!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)){
            return interaction.reply({
                content: 'No tienes permiso para gestionar canales',
                ephemeral: true
            });
        }

        try{
            const category = interaction.guild.channels.cache.get(categoryId);

            if(!category || category.type !== ChannelType.GuildCategory){
                return interaction.reply({
                    content: 'No tienes permiso para gestionar canales',
                    ephemeral: true
                });
            }
            const newChannel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: category.id,
            })

           await interaction.reply(`Canal ${newChannel.name} creado exitosamente en la categoria ${category.name}`) 
        
        }catch(error){
        console.error('Error al crear el canal:', error);
        await interaction.reply({
            content: 'Hubo un error al crear el canal',
            ephemeral: true
        });
    }
    }
}