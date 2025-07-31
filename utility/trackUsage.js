const { query } = require('../config/database');

const logUsage = async ( uuid, username, email, service ) => {
    if (!uuid) {
        throw new Error('Unauthorized: missing user uuid');
    }

    const timestamp = new Date();

    const insertQuery = `
        INSERT INTO usage_logs (uuid, username, email, service, called_at)
        VALUES ($1, $2, $3, $4, $5)
    `;

    try {
        await query(insertQuery, [uuid, username, email, service, timestamp]);
        console.log(`Usage logged for user ${uuid} on service ${service} at ${timestamp}`);
    }

    catch (error) {
        console.error('Error logging usage:', error);
        throw new Error(error.message);
    }
}

module.exports = logUsage;
