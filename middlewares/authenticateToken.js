const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const path = require('path');
const UserModel = require('../models/userModel');

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await UserModel.findById(decoded.id);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired' 
            });
        }
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

module.exports = authenticateToken;
