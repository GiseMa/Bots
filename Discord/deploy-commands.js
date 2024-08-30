const { REST, Routes } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const fs = require('fs');
const path = require('node:path');

const commands = [];

const foldersPath = path.join(__dirname, './commands');
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
			commands.push(command.data.toJSON());
        }else{
            console.log( `[AVISO] El comando en ${filePath} le falta una propiedad "data" o "execute" requerida`);
        }
    }
}


const rest = new REST().setToken(token);

(async () =>{
    try{
        console.log(`Comenzando a refrescar ${commands.length} aplicacion (/) comandos`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            {body: commands},
    
        );

        console.log(`Aplicaciones (/) comandos ${data.length} cargados correctamente`);
    }catch(error){
        console.error(error);
    }
})();