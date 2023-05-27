const Airtable = require('airtable');

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    accessToken: 'keyS9jvhm0mCtkS86'
});

const baseId = 'appxE0V5PM0pS51L7';
const base = new Airtable({ apiKey: 'keyS9jvhm0mCtkS86' }).base(appxE0V5PM0pS51L7);
const employeesTable = base('Employees');
const clockInsTable = base('Clock Ins');

module.exports = async (req, res) => {
    const employeeId = req.query.employeeId;

    try {
        // Load employee data
        const employeeRecords = await employeesTable.select({
            filterByFormula: `{Employee ID} = "${employeeId}"`,
        }).all();

        if (employeeRecords.length === 0) {
            return res.status(404).send(`<p style="color:red;">No employee found with ID ${employeeId}</p>`);
        }

        const employee = employeeRecords[0];
        const clockInStatus = employee.fields['Clock In Status'];

        // Prevent clocking in again within the same day.
        if (clockInStatus === 'Clocked In') {
            return res.status(403).send(`<p style="color:red;">${employee.fields.Name} is already clocked in for today</p>`);
        }

        // Update 'Clock In Status' to 'Clocked In'
        await employeesTable.update([{ id: employee.id, fields: { 'Clock In Status': 'Clocked In' }}]);

        // Create a 'Clock-Ins' record.
        const clockInRecord = await clockInsTable.create({
            "Employee": [employee.id],
            "Clock In Time": new Date().toISOString()
        });

        res.send(`<p style="color:green;">Clock-in record created for ${employee.fields.Name} with ID ${clockInRecord.id}</p>`);
    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    }
};
