const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('node:path');
const axios = require('axios');

const TARGET_CHANNEL_ID = '1276643047853129881'; 
module.exports = {
    data: new SlashCommandBuilder()
        .setName('descargar')
        .setDescription('Descarga toda la conversación'),
    async execute(interaction) {
        const allowedUserIds = ['1085379498977017896']; // Reemplaza estos valores con los IDs de usuario permitidos

        // Check if the user is allowed to use this command
        if (!allowedUserIds.includes(interaction.user.id)) {
            return await interaction.reply({ content: 'No tienes permiso para usar este comando.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true }); // Defer the reply to prevent interaction timeout

        const restrictedCategoryIds = ['1276634760357085204'];
        const userEnabledId = '1085379498977017896';

        if (restrictedCategoryIds.includes(interaction.channel.parentId)) {
            if (interaction.user.id === userEnabledId) {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('Acción restringida')
                    .setDescription('Este canal no puede ser eliminado ya que pertenece a la lista de categorías que no se deben eliminar');

                // Send the reply with the embed
                await interaction.editReply({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.editReply({ content: 'No tienes permisos para realizar este comando', ephemeral: true });
            }
            return;
        }

        try {
            const channel = interaction.channel;
            const serverId = interaction.guild.id;
            const channelId = channel.id;
            let messages = [];
            let lastMessageId = null;

            // Fetch messages in a loop to get the entire conversation
            while (true) {
                const fetchedMessages = await channel.messages.fetch({ limit: 100, before: lastMessageId });
                if (fetchedMessages.size === 0) {
                    break;
                }
                messages = messages.concat(Array.from(fetchedMessages.values()));
                lastMessageId = fetchedMessages.last().id;
            }

            // Create a temporary directory for attachments
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            // Function to download a file using axios and save it locally
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

            // Build the HTML content with CSS styling
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
                const content = message.content.replace(/\n/g, '<br>'); // Replace newlines with <br> for HTML
                const timestamp = `${message.createdAt.getDate().toString().padStart(2, '0')}/${(message.createdAt.getMonth() + 1).toString().padStart(2, '0')}/${message.createdAt.getFullYear().toString().slice(-2)} ${message.createdAt.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}`;

                let replyContent = '';

                // Check if the message is a reply to another message
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

                // Handle attachments
                if (message.attachments.size > 0) {
                    for (const [attachmentId, attachment] of message.attachments) {
                        const filePath = path.join(tempDir, attachment.name);
                        await downloadFile(attachment.url, filePath);

                        // Check if the attachment is an image
                        if (attachment.contentType && attachment.contentType.startsWith('image')) {
                            // Embed image in HTML
                            htmlContent += `<img src="${filePath}" alt="${attachment.name}" />`;
                        } else {
                            // Provide a download link for non-image attachments
                            htmlContent += `<a href="${filePath}">${attachment.name}</a>`;
                        }
                    }
                }

                // Handle embeds
                if (message.embeds.length > 0) {
                    message.embeds.forEach(embed => {
                        htmlContent += `<div class="embed">`;
                        if (embed.title) htmlContent += `<div><strong>${embed.title}</strong></div>`;
                        if (embed.description) htmlContent += `<div>${embed.description.replace(/\n/g, '<br>')}</div>`;
                        htmlContent += `</div>`;
                    });
                }

                // Handle buttons
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

            // Save the HTML content to a file
            const htmlFilePath = path.join(tempDir, 'conversation.html');
            fs.writeFileSync(htmlFilePath, htmlContent);

            const targetChannel = await interaction.client.channels.fetch(TARGET_CHANNEL_ID);
            if (!targetChannel) {
                throw new Error('El canal de destino no es válido.');
            }

            await targetChannel.send({ content: 'Aca esta la conversación:', files: [htmlFilePath] });

            // Reply to the interaction
            await interaction.editReply({ content: 'El archivo de la conversación ha sido enviado al canal especificado.', ephemeral: true });

            // Delete the HTML file after it has been sent
            fs.unlinkSync(htmlFilePath);

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Hubo un error al descargar la conversación.', ephemeral: true });
        }
    },
};
