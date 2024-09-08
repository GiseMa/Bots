const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('node:path');
const axios = require('axios');

const TARGET_CHANNEL_ID = '1279182539935842397'; // ID del canal al que enviar el archivo
const allowedUserIds = [
    '1257631834951516185',
    '1085379498977017896',
]; // IDs de usuarios permitidos

module.exports = {
    data: new SlashCommandBuilder()
        .setName('descargar')
        .setDescription('Descarga toda la conversación y elimina el canal'),
    
    async execute(interaction) {
        // Chequeando si el usuario esta habilitado para usar el comando
        if (!allowedUserIds.includes(interaction.user.id)) {
            return await interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); 

        const allowedCategoryIds = ['1257667147476238420']; // IDs de categorías permitidas

       
        if (!allowedCategoryIds.includes(interaction.channel.parentId)) {
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('Acción restringida')
                .setDescription('Este canal no puede ser procesado ya que no pertenece a una categoría permitida.');

            await interaction.editReply({ embeds: [embed], ephemeral: true });
            return;
        }

        try {
            const channel = interaction.channel;
            const serverId = interaction.guild.id;
            const channelId = channel.id;
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

            // HTML revertido
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

            for (const message of messages) {
                const author = message.author;
                const content = message.content.replace(/\n/g, '<br>'); 
                const timestamp = `${message.createdAt.getDate().toString().padStart(2, '0')}/${(message.createdAt.getMonth() + 1).toString().padStart(2, '0')}/${message.createdAt.getFullYear().toString().slice(-2)} ${message.createdAt.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;

                let replyContent = '';

            //Chequea si el mensaje es en respuesta a otro mensaje
                if (message.reference && message.reference.messageId) {
                    const referencedMessage = await channel.messages.fetch(message.reference.messageId).catch(() => null);
                    if (referencedMessage) {
                        const refAuthor = referencedMessage.author;
                        const refContent = referencedMessage.content.length > 100 ? referencedMessage.content.substring(0, 100) + '...' : referencedMessage.content;

                        if (referencedMessage.attachments.size > 0) {
                            replyContent = `
                            <div class="reply">
                                <strong>${refAuthor.username}:</strong> <em>Attachment</em>
                                <a href="#message-${referencedMessage.id}" class="reply-link">Click to see attachment</a>
                            </div>`;
                        } else {
                            replyContent = `
                            <div class="reply">
                                <strong>${refAuthor.username}:</strong> ${refContent.replace(/\n/g, '<br>')}
                                <a href="#message-${referencedMessage.id}" class="reply-link">Go to message</a>
                            </div>`;
                        }
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

              
                if (message.attachments.size > 0) {
                    for (const [attachmentId, attachment] of message.attachments) {
                        const filePath = path.join(tempDir, attachment.name);
                        await downloadFile(attachment.url, filePath);

                        if (attachment.contentType && attachment.contentType.startsWith('image')) {
                       
                            htmlContent += `<img src="${filePath}" alt="${attachment.name}" />`;
                        } else {
                            htmlContent += `<a href="${filePath}">${attachment.name}</a>`;
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

                if (message.components && message.components.length > 0) {
                    message.components.forEach(component => {
                        component.components.forEach(button => {
                            htmlContent += `<button class="button ${button.style === 1 ? 'button-primary' : 'button-secondary'}">${button.label}</button>`;
                        });
                    });
                }

                htmlContent += `</div></div>`;
            }

            htmlContent += `</body></html>`;

            const htmlFilePath = path.join(tempDir, 'conversation.html');
            fs.writeFileSync(htmlFilePath, htmlContent);

            const targetChannel = await interaction.client.channels.fetch(TARGET_CHANNEL_ID);
            if (!targetChannel) {
                throw new Error('El canal de destino no es válido.');
            }

            const sentMessage = await targetChannel.send({ content: 'Aquí está la conversación:', files: [htmlFilePath] });

            if (sentMessage) {
                const channel = interaction.channel;
                await channel.delete();
            } else {
                await interaction.editReply({ content: 'El archivo no se pudo enviar al canal especificado.', ephemeral: true });
            }

            fs.unlinkSync(htmlFilePath);

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Hubo un error al procesar el comando.', ephemeral: true });
        }
    },
};
