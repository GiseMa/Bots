const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const path = require('path');


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = "C:\\Users\\gisel\\Desktop\\Bots\\PingPong\\credentials.json";


const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addword')
        .setDescription('Agrega una palabra a Google Sheets')
        .addStringOption(option=>
            option.setName('word')
            .setDescription('La palabra a añadir')
            .setRequired(true)
        ),
    async execute(interaction){
        const word = interaction.options.getString('word');

    const spreadsheetId = '18gN2mVkCnfnxZg241n__HzBRGh7Ogs2cc8A3GaMTXT0';
    const range = 'Bot1!A1'
    

    try{
        const authClient = await auth.getClient();

        const sheets = google.sheets({ version: 'v4', auth: authClient});
        const request = { 
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: {
                values: [[word]],
            },
        };
        await sheets.spreadsheets.values.append(request);
        await interaction.reply(`La palabra ${word} se ha añadido a la hoja de calculo`)
    }catch(err){
        console.log(err);
        await interaction.reply('Hubo un error al añadir la palabra');
    }


    },
};

