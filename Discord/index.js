const {Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
//fs= modulo de node para trabajar con el sistema de archivos
const fs = require('node:fs');
const path = require('node:path');

const client = new Client({intents:
    [GatewayIntentBits.Guilds]
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, './commands');
//devuelve una lista de todos los elementos dentro de commands(conjunto de archivos de comandos)
const commandFolders = fs.readdirSync(foldersPath);

for(const folder of commandFolders){
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for(const file of commandFiles){
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        //Data: contiene metadatos sobre el comando como nombre, descripcion
        //Execute: funcion qeu define lo que hace el comando
        if('data' in command && 'execute' in command){
            client.commands.set(command.data.name, command)
        }else{
            console.log( `[AVISO] El comando en ${filePath} le falta una propiedad "data" o "execute" requerida`);
        }
    }
}

client.on(Events.ClientReady, readyClient=>{
    console.log(`Listo! Logueado como ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No se encontraron comandos con el nombre ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'Hubo un error ejecutando el comando',
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    content: 'Hubo un error ejecutando el comando',
                    ephemeral: true,
                });
            }
        }
    } else if (interaction.isButton()) {
        // Manejar las interacciones de los botones
        if (interaction.customId === 'button1') {
            await interaction.reply('¡Aguante Pistacho!');
        } else if (interaction.customId === 'button2') {
            await interaction.reply('¡Aguante Choclo!');
        }
    }
});




client.login(token);

