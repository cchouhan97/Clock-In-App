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

        // Prevent clocking out without clocking in.
        if (clockInStatus !== 'Clocked In') {
            return res.status(403).send(`<p style="color:red;">${employee.fields.Name} cannot clock out without clocking in first</p>`);
        }

        // Update 'Clock In Status' to 'Clocked Out'
        await employeesTable.update([{ id: employee.id, fields: { 'Clock In Status': 'Clocked Out' }}]);

        // Fetch all clock-in records
        const clockInRecords = await clockInsTable.select({}).all();
            
        // Find the clock-in record for the given employee with a blank "Clock Out Time"
        const clockInRecord = clockInRecords.find(record => {
            return (
                record.fields.Employee.includes(employee.id) &&
                !record.fields['Clock Out Time']
            );
        });

        if (!clockInRecord) {
            return res.status(404).send(`<p style="color:red;">No clock-in record found for ${employee.fields.Name} today</p>`);
        }

        // Update the clock-in record with the current time as the "Clock Out Time"
        const currentDate = new Date().toISOString();
        await clockInsTable.update([{ id: clockInRecord.id, fields: { 'Clock Out Time': currentDate }}]);

        res.send(`<p style="color:green;">Clock-out record created for ${employee.fields.Name} with ID ${clockInRecord.id}</p>`);
    } catch (err) {
        console.error(err);
        return res.status(500).send(err);
    }
};
