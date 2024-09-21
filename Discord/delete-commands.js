const { REST, Routes } = require('discord.js');
const { token, clientId, guildIds } = require('./config.json');
const rest = new REST().setToken(token);

async function deleteGlobalCommands() {
    try {
        console.log('Eliminando todos los comandos globales...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('Comandos globales eliminados.');
    } catch (error) {
        console.error('Error al eliminar comandos globales:', error);
    }
}

async function deleteGuildCommands() {
    try {
        for (const guildId of guildIds) {
            console.log(`Eliminando comandos para la guild: ${guildId}`);
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log(`Comandos eliminados para la guild: ${guildId}`);
        }
    } catch (error) {
        console.error('Error al eliminar comandos de guilds:', error);
    }
}

(async () => {
    await deleteGlobalCommands(); 
    await deleteGuildCommands();    
})();
