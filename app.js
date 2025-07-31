require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');


const passport = require('./config/oauth');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next)=>{
    if(req.url.startsWith('/api/')){
        req.setTimeout(120000);
        res.setTimeout(120000);
    }else{
        req.setTimeout(30000);
        res.setTimeout(30000);
    }
    next();
});

app.use((req, res, next)=>{
    req.on('timeout', ()=>{
        if(!res.headersSent){
            res.status(408).json({
                success: false,
                message: 'Request timeout - processing took too long'
            });
        }
    });
    next();
});

app.use((req, res, next) => {
    const start = Date.now();
    
    console.log(`📨 ${req.method} ${req.url} - Started`);
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`✅ ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        
        if (duration > 30000) {
            console.warn(`⚠️  Slow request: ${req.method} ${req.url} took ${duration}ms`);
        }
    });
    
    next();
});

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(session({
    secret: process.env.SESSION_SECRET || '9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba',
    resave: false,
    saveUninitialized: false,
    cookie:{
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV == 'production' ? 'none' : 'lax'
    },
    name: 'sessionId'
}));

app.use(passport.initialize());
app.use(passport.session());



const oauthRoutes = require('./routes/oAuthRoutes.js');
const userRouter = require('./routes/userRoutes.js');
const editorRoutes = require('./routes/editorRoutes');

app.use('/api/', editorRoutes);
app.use('/api/users', userRouter);
app.use('/auth', oauthRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/', (req, res) => {
    res.send('Entry point for the Image Editor API');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!' 
    });
});

app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
    });
});

module.exports = app;