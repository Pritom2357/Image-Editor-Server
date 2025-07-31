const app = require('./app.js');

const PORT = process.env.PORT || 10000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`🌐 Backend URL: http://0.0.0.0:${PORT}`);
});

if(process.env.NODE_ENV === 'production'){
    server.keepAliveTimeout = 180000;
    server.headersTimeout = 180000;
    server.timeout = 180000;
};

process.on('SIGTERM', ()=>{
    console.log('SIGTERM received, shutting down gracefully');
    server.close(()=>{
        console.log('Process terminated');
    });
});

process.on('SIGINT', ()=>{
    console.log('SIGINT received, shutting down gracefully');
    server.close(()=>{
        console.log('Process terminated');
    })
})