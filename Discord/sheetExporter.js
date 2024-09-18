const { google } = require('googleapis');
const sheets = google.sheets('v4');
const path = require('path');
const fs = require('fs');

async function getSheetData(){
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'credentials.json'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const spreadsheetId = '1IVxOLQbjwpHJMhokDK2YU2MNRGJja9P7BcqEv4CCGQY';
    const range = 'NG!A2:B';

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        auth: client,
    });

    return response.data.values.map(row =>({
        userId: row[0],
        allowedCategories: row[1]?.split(',').map(category => category.trim()) || []

    }));
}

module.exports = {
    getSheetData,
};