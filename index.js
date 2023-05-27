const express = require('express');
const Airtable = require('airtable');
const axios = require('axios');
const QRCode = require('qrcode');
const ip = require('ip');  // Import the `ip` library

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

const app = express();
app.set('trust proxy', true);

// Middleware to check IP address
async function checkIp(req, res, next) {
    const officeRecords = await officesTable.select({}).all();
    let officeIpAddresses = [];
    officeRecords.forEach((record) => {
        officeIpAddresses.push(record.fields['IP Address']);
    });

    // Format the request IP
    let requestIp = req.ip;
    // If it's an IPv6 address that contains an IPv4 address, extract the IPv4 part
    if (requestIp.includes('::ffff:')) {
        requestIp = requestIp.replace('::ffff:', '');
    }

    console.log(`Request IP: ${requestIp}`); // Print out the IP address for debugging
    console.log(`X-Forwarded-For: ${req.headers['x-forwarded-for']}`); // Print out the X-Forwarded-For header for debugging

    // Check if the request IP or the X-Forwarded-For IP is in the list of office IP addresses
    if (!officeIpAddresses.includes(requestIp) && !officeIpAddresses.includes(req.headers['x-forwarded-for'])) {
        return res.status(403).send(`<p style='color:red;'>You can only clock in or out from the office network.</p>`);
    }
    next();
}

// Clock in Route.
app.get('/clock-in/:employeeId', async (req, res) => {
    const employeeId = req.params.employeeId;

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
});

// Clock out Route
app.get('/clock-out/:employeeId', async (req, res) => {
    const employeeId = req.params.employeeId;

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
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is up and running on port ${port}`);
});
