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
        
        const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
        
        console.log('Testing Node.js background removal...');
        const result = await BackgroundRemovalNodeService.removeBackgroundFromBuffer(testBuffer);
        
        res.json({
            success: true,
            message: 'Node.js background removal is working!',
            testResultSize: result.length
        });
    } catch (error) {
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


module.exports = router;
