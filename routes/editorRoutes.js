const express = require('express');
const router = express.Router();
const multer = require('multer');
const EditorController = require('../controllers/editorController');
const authenticateToken = require('../middleware/authenticateToken');

// Configure multer for multiple files
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Test route
router.get('/test-routes', (req, res) => {
    res.json({
        message: 'Editor routes are working',
        availableRoutes: [
            'POST /api/remove-background',
            'POST /api/remove-background-local',
            'POST /api/remove-background-with-mask', 
            'POST /api/remove-objects',
            'POST /api/outpaint',
            'POST /api/txt-2-img',
            'POST /api/img-2-img',
            'POST /api/enhance-image'
        ]
    });
});

// Test route for Rembg background removal
router.get('/test-node-bg-removal', async (req, res) => {
    try {
        const BackgroundRemovalNodeService = require('../services/backgroundRemovalNodeService');
        
        // Create a simple test image (1x1 pixel)
        const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
        
        console.log('Testing Rembg background removal...');
        
        // Test initialization
        await BackgroundRemovalNodeService.initializeRembg();
        console.log('Rembg initialized successfully');
        
        // Test with a small image
        const result = await BackgroundRemovalNodeService.removeBackgroundFromBuffer(testBuffer);
        
        res.json({
            success: true,
            message: 'Rembg background removal is working!',
            testResultSize: result.length,
            serviceReady: true
        });
    } catch (error) {
        console.error('Rembg test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// NEW WORKFLOW ROUTES

// Basic background removal
router.post('/remove-background-local', authenticateToken, upload.single('image'), EditorController.removeBackgroundLocal);

// Enhanced background removal with customization options
router.post('/remove-background-local-enhanced', authenticateToken, upload.single('image'), EditorController.removeBackgroundLocalEnhanced);

// Mask-guided background removal
router.post('/remove-background-with-mask', authenticateToken, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'mask', maxCount: 1 }
]), EditorController.removeBackgroundWithMask);

// Fallback to ModelsLab API
router.post('/remove-background', authenticateToken, upload.single('image'), EditorController.removeBG);

// Object removal for additional cleanup
router.post('/remove-objects', authenticateToken, upload.single('mask'), EditorController.removeObjectsNew);

router.post('/outpaint', authenticateToken, upload.single('image'), EditorController.outpaint);
router.post('/txt-2-img', authenticateToken, EditorController.textToImage);
router.post('/img-2-img', authenticateToken, upload.single('image'), EditorController.imageToImage);
router.post('/enhance-image', authenticateToken, upload.single('image'), EditorController.enhanceImage);
router.post('/fetch-queued-image/:fetchID', authenticateToken, EditorController.FetchImageByID);

module.exports = router;
