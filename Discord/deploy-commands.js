const { REST, Routes } = require('discord.js');
const { token, clientId, guildIds }  = require('./config.json');
const fs = require('fs');
const path = require('node:path');
const { getSheetData } = require('./sheetExporter');

async function updateGuilds() {
    try {
        const sheetData = await getSheetData();
        console.log('Datos obtenidos de Google Sheets:', sheetData);

        const newGuildIds = [...new Set(sheetData.flatMap(row => row.guildIds))];

        const configPath = path.join(__dirname, 'config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        config.guildIds = [...new Set([...config.guildIds, ...newGuildIds])];

        // Guardar el archivo config.json actualizado
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('config.json actualizado correctamente con los nuevos guilds');
    } catch (error) {
        console.error('Error actualizando guilds desde Google Sheets:', error);
    }
}

async function deployCommands() {
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

    try {
        console.log(`Comenzando a refrescar ${commands.length} comandos globales`);

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );

        console.log(`Comandos globales cargados correctamente`);
    } catch (error) {
        console.error(`Error al registrar comandos globales: ${error.message}`);
    }
}

(async () => {
    await updateGuilds();  
    await deployCommands();  
})();
