const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('node:path');
const axios = require('axios');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('descargar_y_eliminar')
        .setDescription('Descarga toda la conversación y luego elimina el canal'),

    async execute(interaction) {
        // Verifica si el usuario tiene permisos para gestionar canales
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: 'No tienes permiso para gestionar canales',
                ephemeral: true
            });
        }

        await interaction.deferReply(); // Defer the reply to prevent interaction timeout
        try {
            const channel = interaction.channel;
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

            // Build the HTML content with CSS styling
            let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Chat Conversation - ${channel.name}</title>
                <style>
                    body {
                        background-color: #36393f;
                        color: #dcddde;
                        font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    }
                    .message {
                        padding: 10px;
                        border-bottom: 1px solid #40444b;
                    }
                    .author {
                        font-weight: bold;
                        color: #7289da;
                    }
                    .timestamp {
                        color: #72767d;
                        font-size: 0.8em;
                    }
                </style>
            </head>
            <body>
            `;

            for (const message of messages) {
                htmlContent += `
                <div class="message">
                    <span class="author">${message.author.username}</span> <span class="timestamp">${message.createdAt}</span>
                    <div>${message.content}</div>
                </div>
                `;

                // Download attachments
                for (const attachment of message.attachments.values()) {
                    const filePath = path.join(tempDir, attachment.name);
                    await downloadFile(attachment.url, filePath);
                }
            }

            htmlContent += `
            </body>
            </html>
            `;

            // Save the HTML content to a file
            const htmlFilePath = path.join(tempDir, `conversation-${channel.name}.html`);
            fs.writeFileSync(htmlFilePath, htmlContent);

            // Delete the channel after downloading the conversation
            await channel.delete();

            await interaction.editReply('Conversación descargada y canal eliminado.');
        } catch (error) {
            console.error(error);
            await interaction.editReply('Hubo un error al procesar el comando.');
        }
    },
};
