const express = require('express');
const router = express.Router();
const multer = require('multer');
const EditorController = require('../controllers/editorController');
const authenticateToken = require('../middlewares/authenticateToken');

// Configure multer
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
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
            'POST /api/remove-objects',
            'POST /api/outpaint',
            'POST /api/txt-2-img',
            'POST /api/img-2-img',
            'POST /api/enhance-image'
        ]
    });
});

// Test route for Node.js background removal
router.get('/test-node-bg-removal', async (req, res) => {
    try {
        const BackgroundRemovalNodeService = require('../services/backgroundRemovalNodeService');
        
        // Create a simple test image (1x1 pixel)
        const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
        
        console.log('Testing TensorFlow.js background removal...');
        
        // Test model loading first
        await BackgroundRemovalNodeService.loadModel();
        console.log('Model loaded successfully');
        
        // Test with a small image
        const result = await BackgroundRemovalNodeService.removeBackgroundFromBuffer(testBuffer);
        
        res.json({
            success: true,
            message: 'TensorFlow.js background removal is working!',
            testResultSize: result.length,
            modelLoaded: true
        });
    } catch (error) {
        console.error('TensorFlow test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// NEW WORKFLOW ROUTES

// Primary background removal using removebg_mask API
router.post('/remove-background', authenticateToken, upload.single('image'), EditorController.removeBG);

// Object removal for additional cleanup
router.post('/remove-objects', authenticateToken, upload.single('mask'), EditorController.removeObjectsNew);

// Local background removal 
router.post('/remove-background-local', authenticateToken, upload.single('image'), EditorController.removeBackgroundLocal);

// Mask creation route
// router.post('/create-mask', authenticateToken, upload.single('image'), EditorController.createMaskOnly);

// EXISTING ROUTES (keep for compatibility)

// Outpaint (image outpainting)
router.post('/outpaint', authenticateToken, upload.single('image'), EditorController.outpaint);

// Text to Image
router.post('/txt-2-img', authenticateToken, EditorController.textToImage);

// Image to Image
router.post('/img-2-img', authenticateToken, upload.single('image'), EditorController.imageToImage);

// Enhance Image
router.post('/enhance-image', authenticateToken, upload.single('image'), EditorController.enhanceImage);

// TensorFlow status check
router.get('/tensorflow-status', async (req, res) => {
    try {
        const BackgroundRemovalNodeService = require('../services/backgroundRemovalNodeService');
        
        // Check if model is loaded
        const modelStatus = BackgroundRemovalNodeService.model ? 'loaded' : 'not loaded';
        
        // Check TensorFlow backend
        const tfVersion = require('@tensorflow/tfjs-node').version_core;
        
        res.json({
            tensorflow: {
                version: tfVersion,
                backend: 'node',
                modelStatus: modelStatus
            },
            bodypix: {
                available: true
            },
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                memory: process.memoryUsage()
            }
        });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            tensorflow: 'failed to initialize'
        });
    }
});

module.exports = router;
