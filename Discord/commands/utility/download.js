const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('node:path');
const axios = require('axios'); 
const { getSheetData } = require('../../sheetExporter');

const TARGET_CHANNEL_ID = '1279182539935842397'; // Canal para enviar el embed
const HTML_CHANNEL_ID = '1276643047853129881';  // Canal para enviar el archivo HTML

module.exports = {
    data: new SlashCommandBuilder()
        .setName('borrar')
        .setDescription('Descarga toda la conversación y elimina el canal'),
    
    async execute(interaction) {

        const sheetData = await getSheetData();

        const allowedUsers = sheetData.flatMap(row => row.userId);

        if (!allowedUsers.includes(interaction.user.id)) {
            return await interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); 

        try {
            const channel = interaction.channel;
            const guild = channel.guild;
            const allMembers = await guild.members.fetch();

            const sheetData  = await getSheetData();

            const allowedCategories = sheetData.map(row => row.allowedCategories).flat();
            const categoryId = interaction.channel.parentId;

            if (!allowedCategories.includes(categoryId)) {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('Acción restringida')
                    .setDescription('Este canal no puede ser procesado ya que no pertenece a una categoría permitida.');

                await interaction.editReply({ embeds: [embed], ephemeral: true });
                return;
            }

            const membersInChannel = allMembers
            .filter(member => 
                channel.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel) &&
                channel.permissionsFor(member).has(PermissionsBitField.Flags.SendMessages)
            )
            .map(member => member.id);

            const sheetIds = sheetData.map(row => row.userId);

            const notInSheet = membersInChannel
            .filter(id => !sheetIds.includes(id))
            .map(id => `<@${id}> (${id})`);


            let messages = [];
            let lastMessageId = null;

            while (true) {
                const fetchedMessages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
                if (fetchedMessages.size === 0) {
                    break;
                }
                messages = messages.concat(Array.from(fetchedMessages.values()));
                lastMessageId = fetchedMessages.last().id;
            }

            messages.reverse();

            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            async function downloadFile(url, filePath) {
                const response = await axios({
                    url,
                    method: 'GET',
                    responseType: 'stream',
                });
                return new Promise((resolve, reject) => {
                    const file = fs.createWriteStream(filePath);
                    response.data.pipe(file);
                    file.on('finish', () => resolve());
                    file.on('error', reject);
                });
            }

            const cssFilePath = path.join(__dirname, 'htmlStyle.css');
            const cssContent = fs.readFileSync(cssFilePath, 'utf-8');

            let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Chat Conversation - ${channel.name}</title>
                <style>${cssContent}</style>
            </head>
            <body>`;

            // Obtener referencia al canal HTML_CHANNEL_ID
            const fileChannel = await interaction.client.channels.fetch(HTML_CHANNEL_ID);
            if (!fileChannel || fileChannel.type !== ChannelType.GuildText) {
                throw new Error('El canal para enviar el archivo no es válido o no es un canal de texto.');
            } 

            for (const message of messages) {
                const author = message.author;
                const content = message.content.replace(/\n/g, '<br>'); 
                const timestamp = `${message.createdAt.getDate().toString().padStart(2, '0')}/${(message.createdAt.getMonth() + 1).toString().padStart(2, '0')}/${message.createdAt.getFullYear().toString().slice(-2)} ${message.createdAt.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;
                
                let replyContent = '';
                    
                if (message.reference && message.reference.messageId) {
                    const referencedMessage = await channel.messages.fetch(message.reference.messageId).catch(() => null);
                    if (referencedMessage) {
                        const refAuthor = referencedMessage.author;
                        const refContent = referencedMessage.content.length > 100 ? referencedMessage.content.substring(0, 100) + '...' : referencedMessage.content;
                        replyContent = referencedMessage.attachments.size > 0
                            ? `<div class="reply"><strong>${refAuthor.username}:</strong> <em>Attachment</em></div>`
                            : `<div class="reply"><strong>${refAuthor.username}:</strong> ${refContent.replace(/\n/g, '<br>')}</div>`;
                    }
                }
                
                
                htmlContent += `
                <div id="message-${message.id}" class="message">
                    <img class="avatar" src="${author.displayAvatarURL({ format: 'png' })}" alt="${author.username}">
                    <div class="content">
                        ${replyContent}
                        <div>
                            <span class="username">${author.username}</span>
                            <span class="timestamp">${timestamp}</span>
                        </div>
                        <div>${content}</div>`;

                // Manejo de imágenes adjuntas
                if (message.attachments.size > 0) {
                    for (const [attachmentId, attachment] of message.attachments) {
                        const imageMessage = await fileChannel.send({
                            files: [attachment.url], // Usa la URL del attachment
                        });
                
                        const imageUrl = imageMessage.attachments.first().url;
                
                        if (attachment.contentType && attachment.contentType.startsWith('image')) {
                            htmlContent += `<img src="${imageUrl}" alt="${attachment.name}" />`;
                        } else {
                            htmlContent += `<a href="${imageUrl}">${attachment.name}</a>`;
                        }
                    }
                } 

                if (message.embeds.length > 0) {
                    message.embeds.forEach(embed => {
                        htmlContent += `<div class="embed">`;
                        
                        if (embed.title) {
                            htmlContent += `<div><strong>${embed.title}</strong></div>`;
                        }

                        if (embed.description) {
                            htmlContent += `<div>${embed.description.replace(/\n/g, '<br>')}</div>`;
                        }

                        if (embed.fields.length > 0) {
                            htmlContent += `<div class="embed-fields">`;
                            embed.fields.forEach(field => {
                                htmlContent += `
                                    <div class="embed-field">
                                        <div class="embed-field-name"><strong>${field.name}</strong></div>
                                        <div class="embed-field-value">${field.value.replace(/\n/g, '<br>')}</div>
                                    </div>`;
                            });
                            htmlContent += `</div>`;
                        }

                        if (embed.footer) {
                            htmlContent += `<div class="embed-footer">${embed.footer.text}</div>`;
                        }

                        if (embed.image) {
                            htmlContent += `<img src="${embed.image.url}" alt="Embed Image" class="embed-image" />`;
                        }

                        htmlContent += `</div>`;
                    });
                }

                htmlContent += `</div></div>`;
            }

            htmlContent += `</body></html>`;

            const channelName = channel.name.replace(/[^a-zA-Z0-9-_]/g, "_");
            const htmlFilePath = path.join(tempDir,  `${channelName}_conversation.html`);
            fs.writeFileSync(htmlFilePath, htmlContent);
            

    
            // Enviar el embed al canal TARGET_CHANNEL_ID con el enlace al archivo
            //const htmlChannel = await interaction.client.channels.fetch(HTML_CHANNEL_ID);

                        

            //await htmlChannel.send({ content: "Historial de conversación en HTML:", files: [htmlFilePath] });

/*             const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Historial de canal')
                .setDescription(`Aquí está el historial de **${channel.name}** del servidor **${guild.name}** (${guild.id}).`)
                .addFields(
                    { name: 'Usuarios', value: notInSheet.length > 0 ? notInSheet.join('\n') : 'Todos están en el sheet' },
                    { name: 'Para descargar el archivo', value: `[Apreta aquí](${fileUrl})` },
                )
                .setFooter({ text: `Comando ejecutado por ${interaction.user.tag}`})
                .setTimestamp();
 */

            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Historial de canal')
                .setDescription(`Aquí está el historial de **${channel.name}** del servidor **${guild.name}** (${guild.id}).`)
                .addFields(
                    { name: 'Usuarios ', value: notInSheet.length > 0 ? notInSheet.join('\n') : 'Todos están en el sheet' },
                    { name: 'Fecha', value: new Date().toLocaleDateString() },
                )
                .setFooter({ text: `Comando ejecutado por ${interaction.user.tag}` })
                .setTimestamp();

                
            const targetChannel = await interaction.client.channels.fetch(TARGET_CHANNEL_ID);
            if (!targetChannel) throw new Error('El canal de destino no es válido.');
            await targetChannel.send({ embeds: [embed], files: [htmlFilePath] });
            await fileChannel.send({ embeds: [embed], files: [htmlFilePath] });
    

            await channel.delete();

            fs.unlinkSync(htmlFilePath);

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Hubo un error al procesar el comando.', ephemeral: true });
        }
    },
};
