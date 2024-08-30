const { REST, Routes } = require('discord.js');
const { token, clientId, guildIds } = require('./config.json'); // Asegúrate de que guildIds esté incluido aquí
const fs = require('fs');
const path = require('node:path');

const commands = [];

const foldersPath = path.join(__dirname, './commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[AVISO] El comando en ${filePath} le falta una propiedad "data" o "execute" requerida`);
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Comenzando a refrescar ${commands.length} comandos para múltiples servidores`);

        if (!Array.isArray(guildIds)) {
            throw new Error('guildIds no está definido como un array en config.json');
        }

        for (const guildId of guildIds) {
            console.log(`Registrando comandos para el servidor con ID: ${guildId}`);

            const data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );

            console.log(`Comandos para el servidor ${guildId} cargados correctamente`);
        }
    } catch (error) {
        console.error(error);
    }
})();
