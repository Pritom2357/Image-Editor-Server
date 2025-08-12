require('dotenv').config();
const axios = require('axios');

class FetchQueuedImage {

    static FETCH_IMAGE_BY_ID_URL = process.env.MODELSLAB_FETCH_IMAGE_BY_ID_URL;
    static API_KEY = process.env.MODELSLAB_API_KEY;

    static async FetchQueuedImageByURL(fetchURL, maxRetries = 30, delayMs = 3000) {
        console.log('Fetching queued image result...');

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}/${maxRetries} to fetch result`);

                const response = await axios.get(fetchURL, {
                    timeout: 10000 // 10 seconds timeout for each fetch attempt
                });

                if (response.data && response.data.output) {
                    console.log('✅ Image processing completed successfully');
                    return response.data.output;
                }

                // If status indicates processing, wait and retry
                if (response.data && response.data.status === 'processing') {
                    console.log(`🔄 Still processing... waiting ${delayMs}ms before retry`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }

                // If no output but no error, wait and retry
                console.log(`⏳ No result yet, waiting ${delayMs}ms before retry`);
                await new Promise(resolve => setTimeout(resolve, delayMs));

            }

            catch (error) {
                console.error(`❌ Fetch attempt ${attempt} failed:`, error.message);

                // On last attempt, throw error
                if (attempt === maxRetries) {
                    throw new Error(`Failed to fetch result after ${maxRetries} attempts: ${error.message}`);
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        throw new Error('Image processing timed out - maximum retries exceeded');
    };

    static async fetchedQueuedImageByID(fetchID) {
        try {
            const response = await axios.post(`${FetchQueuedImage.FETCH_IMAGE_BY_ID_URL}/${fetchID}`, {
                key: FetchQueuedImage.API_KEY
            })

            return response;
        } 
        catch (error) {
            console.error('Error fetching queued image by ID:', error.message);
            throw new Error('Failed to fetch queued image by ID');
        }
    }

}

module.exports = FetchQueuedImage;