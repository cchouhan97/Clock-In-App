const Airtable = require('airtable');
const axios = require('axios');
const QRCode = require('qrcode');
const ip = require('ip');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    accessToken: 'keyS9jvhm0mCtkS86'
});

const baseId = 'appxE0V5PM0pS51L7';
const base = new Airtable({ apiKey: 'keyS9jvhm0mCtkS86' }).base(baseId);
const employeesTable = base('Employees');
const clockInsTable = base('Clock Ins');
const qrCodesTable = base('QR Codes');
const officesTable = base('Offices');
