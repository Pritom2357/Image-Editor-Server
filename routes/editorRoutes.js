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
            'POST /api/remove-objects',
            'POST /api/outpaint',
            'POST /api/txt-2-img',
            'POST /api/img-2-img',
            'POST /api/enhance-image'
        ]
    });
});

// NEW WORKFLOW ROUTES

// Primary background removal using removebg_mask API
router.post('/remove-background', authenticateToken, upload.single('image'), EditorController.removeBG);

// Object removal for additional cleanup
router.post('/remove-objects', authenticateToken, upload.single('mask'), EditorController.removeObjectsNew);

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
