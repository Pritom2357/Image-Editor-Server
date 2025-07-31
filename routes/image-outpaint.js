const axios = require('axios');
const multer = require('multer');
const fetchQueuedImage = require('../utility/fetch-queued-image');
const upload = multer({ storage: multer.memoryStorage() });

const router = require('express').Router();
const uploadToCloud = require('../utility/cloudUpload');
 
router.post('/outpaint', upload.single('image'), async (req, res) => {
    try {
        const {prompt, negative_prompt, overlap_width, width, height, guidance_scale, num_inference_steps} = req.body;
        const imageFile = req.file.buffer;
        const imageName = req.file.originalname;

        console.log('Processing outpaint request:', { 
            imageName, 
            prompt: prompt?.substring(0, 50) + '...', 
            width, height 
        });

        // Upload the image to cloud storage
        const imageUrl = await uploadToCloud(imageFile, imageName);
        console.log('Image uploaded to cloud:', imageUrl);
        
        const outpaintURL = process.env.MODELSLAB_OUTPAINT_URL;
        const modelsLabAPIKey = process.env.MODELSLAB_API_KEY;

        const response = await axios.post(outpaintURL, {
            key: modelsLabAPIKey,
            prompt: prompt,
            negative_prompt: negative_prompt,
            image: imageUrl,
            width: width || 1280,                                          // width of the output image
            height: height || 1280,                                        // height of the output image
            overlap_width: overlap_width || 10,                            // if overlap_width is 30, it blends 30 pixels of the old image into the new edges so it looks natural.
            num_inference_steps: num_inference_steps || 10,                // number of steps for the model to generate the image
            guidance_scale: guidance_scale || 8.0,                         // higher value means more adherence to the prompt
            seed: -1,                                                      // -1 means no seed, which allows for random generation
            base64: false,
            webhook: null,
            track_id: null,
        }, {
            timeout: 90000, // 90 seconds
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Outpaint API response received');
        const fetchURL = response.data.fetch_result;

        // Fetch the queued image result
        const resultURL = await fetchQueuedImage(fetchURL);
        console.log('Outpaint completed successfully');
        
        if (resultURL && resultURL.length > 0) {
            res.status(200).json({
                success: true,
                image: resultURL[0]
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'No result returned from the model.'
            });
        }

    } catch (error) {
        console.error('Error in Outpaint Image request:', error.message);

        // Handle timeout specifically
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Request timeout - the outpainting process is taking too long. Please try again with a smaller image or simpler prompt.'
            });
        }

        // Handle other axios errors
        if (error.response) {
            return res.status(error.response.status || 500).json({
                success: false,
                message: 'External API error',
                error: error.response.data?.message || error.message
            });
        }

        // Generic error
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request.',
            error: error.message
        });
    }
});

module.exports = router;