const axios = require('axios');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = require('express').Router();
const uploadToCloud = require('../utility/cloudUpload');
const fetchQueuedImage = require('../utility/fetch-queued-image');

router.post('/remove-bg', upload.single('image'), async (req, res) => {
    try {
        const imageFile = req.file.buffer;
        const imageName = req.file.originalname;

        console.log('Processing remove background request:', imageName);

        // Upload the image to cloud storage
        const imageUrl = await uploadToCloud(imageFile, imageName);
        console.log('Image uploaded to cloud:', imageUrl);        

        // Prepare the request to the remove background model
        const removeBgURL = process.env.MODELSLAB_REMOVE_BG_URL;
        const modelsLabAPIKey = process.env.MODELSLAB_API_KEY;

        const response = await axios.post(removeBgURL, {
            key: modelsLabAPIKey,
            image: imageUrl,
            alpha_matting: true,        //Alpha Matting: It generates better edges for the foreground object.
            post_process_mask: true,    //Post Process Mask: It cleans up the raw mask — removes noise, smooths edges.
            only_mask: false,           //Only Mask: It returns only the mask of the foreground object. Best to use when you want to apply the mask on your own.
            inverse_mask: false,        //Inverse Mask: Flips the mask - white becomes black and vice versa. True when you want to remove the subject instead of the background.
            seed: null,
            base64: false,
            webhook: null,
            track_id: null
        }, {
            timeout: 90000, // 90 seconds
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Remove background API response received');
        const fetchURL = response.data.fetch_result;

        // Fetch the queued image result
        const resultURL = await fetchQueuedImage(fetchURL);
        console.log('Remove background completed successfully');
        
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
        console.error('Error in remove background request:', error.message);

        // Handle timeout specifically
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return res.status(408).json({
                success: false,
                message: 'Request timeout - the background removal is taking too long. Please try again with a smaller image.'
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