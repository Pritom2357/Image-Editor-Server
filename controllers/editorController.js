const EditorModel = require('../models/editorModel');
const trackUsage = require('../utility/trackUsage');
const formatServicePath = require('../utility/formatServicePath');
const FetchQueuedImage = require('../utility/fetch-queued-image');

class EditorController {

    static NSFW_MESSAGE = 'Please Follow Our NSFW Guidelines and Don\'t Upload or Try To Generate Inappropriate Content';

    static async enhanceImage(req, res) {
        try {
            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;
            const { faceEnhance } = req.body;
            const scale = parseInt(req.body.scale, 10) || 4;

            console.log('Enhance Image Request:', {
                imageName,
                faceEnhance,
                scale
            });


            const output = await EditorModel.enhanceImage({ imageFile, imageName, faceEnhance, scale });

            if(output.safe !== true) {
                return res.status(400).json({
                    success: false,
                    safe: output.safe,
                    message: output.error || EditorModel.NSFW_MESSAGE
                });
            }

            if (result.output.length > 0) {
                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    image: result.output[0]
                });
            }

            else if(result.id){
                res.status(202).json({
                    success: true,
                    message: 'Enhancing in progress',
                    id: result.id
                });
            }

            else {
                res.status(400).json({
                    success: false,
                    message: 'No result returned from the model.'
                });
            }
        } 

        catch (error) {
            console.error('Error in enhance image request:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request.',
                error: error.message
            });
        }
    }

    static async outpaint(req, res) {
        try {
            const { prompt, negative_prompt, overlap_width, width, height, guidance_scale } = req.body;

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;

            console.log('Outpaint Request:', {
                prompt,
                negative_prompt,
                overlap_width,
                width,
                height,
                guidance_scale,
                imageName
            });

            const result = await EditorModel.outpaint({ imageFile, imageName, prompt, negative_prompt, overlap_width, width, height, guidance_scale });
            
            if(result.safe === false) {
                console.log(result);
                
                return res.status(400).json({
                    success: false,
                    safe: result.safe,
                    message: result.error || EditorModel.NSFW_MESSAGE
                });
            }

            if (result.output.length > 0) {
                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    image: result.output[0]
                });
            }

            else if(result.id){
                res.status(202).json({
                    success: true,
                    message: 'Outpainting in progress',
                    id: result.id
                });
            }

            else {
                res.status(400).json({
                    success: false,
                    message: 'No result returned from the model.'
                });
            }
        }

        catch (error) {
            console.error('Error in outpaint request:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request.',
                error: error.message
            });
        }
    }

    static async textToImage(req, res) {

        try {
            const { prompt, negative_prompt, samples, width, height, safety_checker, enhance_prompt } = req.body;
            console.log('Text to Image Request:', req.body);

            const output = await EditorModel.textToImage({ prompt, negative_prompt, samples, width, height, safety_checker, enhance_prompt });
            console.log('Text to Image Response:', output);

            if(output.safe === false) {
                return res.status(400).json({
                    success: false,
                    safe: output.safe,
                    message: output.error || EditorModel.NSFW_MESSAGE
                });
            }

            if (output) {
                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    images: output
                });
            }

            else {
                res.status(400).json({
                    success: false,
                    message: 'No images returned from the model.'
                });
            }
        }

        catch (error) {
            console.error('Error in text to image request:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request.',
                error: error.message
            });
        }
    }

    

    

    static async imageToImage(req, res) {

        try {
            const { prompt, negative_prompt, samples, width, height, safety_checker, strength } = req.body;

            console.log('Image to Image Request:', req.body);

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;

            const output = await EditorModel.imageToImage({ imageFile, imageName, prompt, negative_prompt, samples, width, height, safety_checker, strength });

            console.log('Image to Image Response:', output);

            if(output.safe === false) {
                return res.status(400).json({
                    success: false,
                    safe: output.safe,
                    message: output.error || EditorModel.NSFW_MESSAGE
                });
            }

            if (output) {
                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    images: output
                });
            }

            else {
                
                res.status(400).json({
                    success: false,
                    message: 'No images returned from the model.'
                });
            }
        }

        catch (error) {
            console.error('Error in image-to-image request:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request.',
                error: error.message
            });
        }
    }

    // Add this new method to EditorController class
    


    static async removeBG(req, res) {
        try {
            console.log('New background removal request received');
            console.log('req.file:', !!req.file);
            console.log('req.body:', req.body);

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;
            const { alphaMatting = 'true', postProcessMask = 'true' } = req.body;

            console.log('Processing background removal with options:', {
                imageName,
                alphaMatting,
                postProcessMask
            });

            const result = await EditorModel.removeBG({
                imageFile, 
                imageName,
                alpha_matting: alphaMatting === "true",  
                post_process_mask: postProcessMask === "true"  
            });

            if(result){
                const resultUrl = Array.isArray(result) ? result[0] : result;

                const user = req.user;
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    image: resultUrl,
                    message: "Background removed successfully"
                });
            }else{
                res.status(400).json({
                    success: false,
                    message: "No result returned from the bg-removal api"
                });
            }
            
        } catch (error) {
            console.error('Error in new remove background request:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while removing the background.',
                error: error.message
            });
        }
    }

    static async removeObjectsNew(req, res) {
        try {
            console.log('Remove objects request received');
            console.log('req.file:', !!req.file);
            console.log('req.body:', req.body);

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No mask image file provided'
                });
            }

            const { initImageUrl } = req.body;

            if (!initImageUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Init image URL is required'
                });
            }

            const maskImageFile = req.file.buffer;
            const maskImageName = req.file.originalname;

            console.log('Processing object removal:', {
                initImageUrl,
                maskImageName
            });

            const uploadToCloud = require('../utility/cloudUpload');
            const maskImageUrl = await uploadToCloud(maskImageFile, maskImageName);
            console.log('Mask uploaded to:', maskImageUrl);

            const axios = require('axios');
            const response = await axios.post(process.env.MODELSLAB_OBJECT_REMOVAL_URL, {
                key: process.env.MODELSLAB_API_KEY,
                init_image: initImageUrl,
                mask_image: maskImageUrl,
                track_id: null,
                webhook: null
            });

            // Process the response
            const EditorModel = require('../models/editorModel');
            const result = await EditorModel.handleModelResponse(response);

            if (result) {
                const resultUrl = Array.isArray(result) ? result[0] : result;

                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);
                
                res.status(200).json({
                    success: true,
                    image: resultUrl,
                    message: 'Objects removed successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'No result returned from the object removal service.'
                });
            }
        } catch (error) {
            console.error('Error in remove objects request:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while removing objects.',
                error: error.message
            });
        }
    }

    static async removeBackgroundLocal(req, res) {
        try {
            console.log('Local background removal request received');

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;

            console.log('Processing with Node.js background removal');

            const result = await EditorModel.removeBackgroundLocalNode({
                imageFile, 
                imageName
            });

            if (result) {
                const user = req.user;
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    image: result,
                    message: "Background removed with Node.js - fast and reliable!"
                });
            } else {
                throw new Error("Node.js processing returned no result");
            }
            
        } catch (error) {
            console.error('Error in Node.js background removal:', error);
            
            // Fallback to API
            console.log('Falling back to API background removal');
            return EditorController.removeBG(req, res);
        }
    }

    static async FetchImageByID(req, res) {
        try {
            const { fetchID } = req.params;

            if (!fetchID) {
                return res.status(400).json({
                    success: false,
                    message: 'Fetch ID is required'
                });
            }

            const result = await FetchQueuedImage.fetchedQueuedImageByID(fetchID);

            if(result.data.status === 'success' && result.data.output) {
                console.log('Image fetched successfully:', result.data.output);

                res.status(200).json({
                    success: true,
                    image: result.data.output
                });
            }

            else if(result.data.status === 'processing') {
                console.log('Image is still processing, please try again later');

                res.status(202).json({
                    success: false,
                    message: 'Image is still processing, please try again later'
                });
            }

            else {
                console.error('Failed to fetch image:', result.data.message);

                res.status(400).json({
                    success: false,
                    message: 'Failed to fetch image'
                });
            }
        }
        
        catch (error) {
            console.error('Error fetching image by ID:', error);
            res.status(500).json({
                success: false,
                message: 'An error occurred while fetching the image',
                error: error.message
            });
        }
    }
}

module.exports = EditorController;
