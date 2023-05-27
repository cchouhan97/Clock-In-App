const Airtable = require('airtable');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    accessToken: 'keyS9jvhm0mCtkS86'
});

const baseId = 'appxE0V5PM0pS51L7';
const base = new Airtable({ apiKey: 'keyS9jvhm0mCtkS86' }).base(baseId);
const employeesTable = base('Employees');
const clockInsTable = base('Clock Ins');

module.exports = async (req, res) => {
    const employeeId = req.query.employeeId;

    // Rest of your code goes here...
}
