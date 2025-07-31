const express = require('express');
const router = express.Router();
const axios = require('axios'); 


router.post('/txt-2-img', async (req, res) => {

    try {
        const txtToImgURL = process.env.MODELSLAB_TXT_2_IMG_URL;
        const modelsLabAPIKey = process.env.MODELSLAB_API_KEY;

        const {prompt, negative_prompt, samples, width, height, safety_checker, enhance_prompt} = req.body;

        console.log('Processing text-to-image request:', { 
            prompt: prompt?.substring(0, 50) + '...', 
            samples, width, height 
        });
        

        const response = await axios.post(txtToImgURL, {
            key: modelsLabAPIKey,
            prompt: prompt,
            negative_prompt: negative_prompt,
            samples: samples || 1,
            width: width || 512,
            height: height || 512,
            safety_checker: safety_checker || false,
            base64: false,
            seed: null,
            webhook: null,
            track_id: null,
            enhance_prompt: enhance_prompt || false
        }, {
            timeout: 90000, 
            headers:{
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data && response.data.output) {
            console.log('Text-to-image completed successfully');
            res.status(200).json({
                success: true,
                images: response.data.output
            });
        }
        else {
            console.log('No images returned from ModelsLab');
            res.status(400).json({
                success: false,
                message: 'No images returned from the model.'
            });
        }
    } catch (error) {
        console.error('Error in text-to-image request:', error.message);

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Request timeout - the AI model is taking too long to respond. Please try again with simpler prompts.'
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