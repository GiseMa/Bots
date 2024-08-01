const { SlashCommandBuilder } = require('@discordjs/builders');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addchannel')
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
                const category = interaction.guild.channels.cache.get(categoryId)

                if(!category || category.type !== ChannelType.GuildCategory){
                    return interaction.reply({
                        content: 'La categoria indicada no se encontro',
                        ephemeral: true})
                }

                const newChannel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category.id,
                })
                const messageContent = 'Puto el que lee';
                await newChannel.send(messageContent);

                const filePath = path.join('C:', 'Users', 'gisel', 'Desktop', 'channel_message_log.txt');


                fs.writeFile(filePath, 
                    `Canal: ${newChannel.name}\nMensaje: ${messageContent}\n\n`, 
                    { flag: 'a' }, err => {
                    if (err) {
                        console.error('Error al escribir en el archivo:', err);
                    }
                });

                setTimeout(async () =>{
                    try{
                        await newChannel.delete();
                        console.log(`Canal ${newChannel.name} eliminado exitosamente en la categoria ${category.name}`)
                    }catch(deleteError){
                        console.log('Error al eliminar el canala: ', deleteError);
                    }
                }, 5000);

                await interaction.reply(`Canal ${newChannel.name} creado exitosamente en la categoria ${category.name}`)


            }catch(error){
                console.error('Error al crear el canal:', error);
                await interaction.reply({
                    content:'Hubo un error al intentar crear el canal',
                    ephemeral: true
                });
            }
            
            }
        }
