const { Model } = require("clarifai-nodejs");
const dotenv = require("dotenv");

dotenv.config();

const modelUrl = process.env.CLARIFAI_IMAGE_MODERATION_URL;

async function isSafeImage(imageUrl) {
    try {
        const model = new Model({
            url: modelUrl,
            authConfig: {
                pat: process.env.CLARIFAI_PAT,
            },
        });

        const modelPrediction = await model.predictByUrl({
            url: imageUrl,
            inputType: "image",
        });

        const concepts = modelPrediction?.[0]?.data?.conceptsList || [];

        // Define thresholds for unsafe content
        const unsafeThresholds = {
            explicit: 0.7,
            suggestive: 0.8,
            drug: 0.7,
            gore: 0.5
        };

        // Check if any unsafe concept exceeds its threshold
        const unsafeConcepts = concepts.filter(concept => {
            const threshold = unsafeThresholds[concept.name];
            return threshold && concept.value >= threshold;
        });

        return unsafeConcepts.length === 0;

    }
    catch (error) {
        console.error('Error checking image safety:', error.message);
        return false;
    }
}

module.exports = { isSafeImage };
