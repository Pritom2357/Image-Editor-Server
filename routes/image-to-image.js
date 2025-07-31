const router = require('express').Router();
const axios = require('axios');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloud = require('../utility/cloudUpload');

router.post('/img-2-img', upload.single('image'), async (req, res) => {
    try {
        const { prompt, negative_prompt, samples, width, height, safety_checker, strength } = req.body;
        const imageFile = req.file.buffer;
        const imageName = req.file.originalname;

        console.log('Processing image-to-image request:', { 
            imageName, 
            prompt: prompt?.substring(0, 50) + '...', 
            samples, width, height 
        });

        // Upload the image to cloud storage
        const imageUrl = await uploadToCloud(imageFile, imageName);
        console.log('Image uploaded to cloud:', imageUrl);

        // Prepare the request to the image-to-image model
        const txtToImgURL = process.env.MODELSLAB_IMG_2_IMG_URL;
        const modelsLabAPIKey = process.env.MODELSLAB_API_KEY;

        const response = await axios.post(txtToImgURL, {
            key: modelsLabAPIKey,
            prompt: prompt,
            negative_prompt: negative_prompt,
            init_image: imageUrl,
            samples: samples || 1,
            width: width || 512,
            height: height || 512,
            safety_checker: safety_checker || false,
            base64: false,
            strength: strength || 0.5,
            seed: null,
            webhook: null,
            track_id: null,
            enhance_prompt: false
        }, {
            timeout: 90000, 
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Image-to-Image completed successfully');

        if (response.data && response.data.output) {
            res.status(200).json({
                success: true,
                images: response.data.output
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'No images returned from the model.'
            });
        }

    } catch (error) {
        console.error('Error in image-to-image request:', error.message);

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Request timeout - the AI model is taking too long to respond. Please try again.'
            });
        }

        if (error.response) {
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'External API error',
                error: error.response.data?.message || error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request.',
            error: error.message
        });
    }
});

module.exports = router;

// Strength parameter is a float value between 0 and 1, where 0 means no change to the image and 1 means full transformation based on the prompt [Original Image is ignored, and works like text to image].

// The default value is 0.5, which means a moderate transformation.