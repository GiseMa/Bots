const { SlashCommandBuilder } = require('discord.js');
const { google } = require('googleapis');
const path = require('path');


const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');

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
            .setMinLength(1)
        ),
        async execute(interaction) {
            const wordsString = interaction.options.getString('word');
            console.log('Received wordsString:', wordsString); 
            
            if (!wordsString || wordsString.trim() === '') {
                await interaction.reply('No se proporcionaron palabras para añadir.');
                return;
            }
            console.log(wordsString);
        
            const words = wordsString.split(' ').filter(word => word.trim() !== ''); 
            console.log('Words to add:', words);
        
            const spreadsheetId = '18gN2mVkCnfnxZg241n__HzBRGh7Ogs2cc8A3GaMTXT0';
        
            try {
                const authClient = await auth.getClient();
                const sheets = google.sheets({ version: 'v4', auth: authClient });
        
                // Append the data as a new row
                const request = {
                    spreadsheetId,
                    range: 'Bot_sheet', // Only specify the sheet name
                    valueInputOption: 'RAW',
                    resource: {
                        values: [words],
                    },
                };
        
                await sheets.spreadsheets.values.append(request);
                await interaction.reply(`Las palabras ${words.join(', ')} se han añadido como una nueva fila en la hoja de cálculo.`);
            } catch (err) {
                console.log('Error adding words:', err);
                await interaction.reply('Hubo un error al añadir las palabras');
            }
        
    
        },
};

