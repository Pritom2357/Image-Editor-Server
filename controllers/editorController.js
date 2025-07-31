const EditorModel = require('../models/editorModel');
const trackUsage = require('../utility/trackUsage');
const formatServicePath = require('../utility/formatServicePath');

class EditorController {

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

            const resultURL = await EditorModel.outpaint({ imageFile, imageName, prompt, negative_prompt, overlap_width, width, height, guidance_scale });
            console.log('Outpaint Response:', resultURL);

            if (resultURL) {
                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    image: resultURL[0]
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

    static async removeBg(req, res) {

        try {
            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;
            
            const maskFile = req.files && req.files.mask ? req.files.mask[0].buffer : null;
            const maskFileName = req.files && req.files.mask ? req.files.mask[0].originalname : null;
            
            const { maskUrl } = req.body; 

            console.log('Remove background request:', {
                imageName,
                hasMaskFile: !!maskFile,
                hasMaskUrl: !!maskUrl
            });

            const result = await EditorModel.removeBg({ 
                imageFile, 
                imageName, 
                maskUrl,
                maskFile: maskFile,
                maskFileName: maskFileName
            });

            if (result) {
                // Fix: Ensure we return a single URL string, not an array
                const resultUrl = Array.isArray(result) ? result[0] : result;

                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);
                
                res.status(200).json({
                    success: true,
                    image: resultUrl
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
            console.error('Error in remove background request:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request.',
                error: error.message
            });
        }
    }

    static async createMaskOnly(req, res) {
        try {
            console.log('Create mask request received');
            console.log('Request body:', req.body);
            console.log('File:', req.file ? 'Present' : 'Missing');

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;
            const { mode = 'foreground' } = req.body;

            console.log('Processing mask creation with mode:', mode);

            const maskResult = await EditorModel.createMask({
                imageFile,
                imageName,
                mode
            });

            console.log('Mask creation result:', maskResult);

            if (maskResult) {
                // Fix: Ensure we return a single URL string, not an array
                const maskUrl = Array.isArray(maskResult) ? maskResult[0] : maskResult;
                
                res.status(200).json({
                    success: true,
                    mask: maskUrl
                });
            }
            
            else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to create mask'
                });
            }
        }
        
        catch (error) {
            console.error('Create mask error:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while creating the mask',
                error: error.message
            });
        }
    }

    static async imageToImage(req, res) {

        try {
            const { prompt, negative_prompt, samples, width, height, safety_checker, strength } = req.body;

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;

            const output = await EditorModel.imageToImage({ imageFile, imageName, prompt, negative_prompt, samples, width, height, safety_checker, strength });

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
    static async removeBgWithMask(req, res) {

        try {
            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;
            const { maskUrl } = req.body;

            if (!maskUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'Mask URL is required for this endpoint'
                });
            }

            console.log('Remove background with existing mask:', {
                imageName,
                maskUrl
            });

            const result = await EditorModel.removeBgWithMask({ 
                imageFile, 
                imageName, 
                maskUrl 
            });

            if (result) {
                // Fix: Ensure we return a single URL string, not an array
                const resultUrl = Array.isArray(result) ? result[0] : result;

                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);
                
                res.status(200).json({
                    success: true,
                    image: resultUrl
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
            console.error('Error in remove background with mask:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request.',
                error: error.message
            });
        }
    }


    static async removeBackgroundNew(req, res) {
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
            const axios = require('axios');
            const uploadToCloud = require('../utility/cloudUpload');
            
            const imageUrl = await uploadToCloud(imageFile, imageName);
            console.log('Image uploaded to:', imageUrl);

            const response = await axios.post(process.env.MODELSLAB_REMOVEBG_MASK_URL, {
                key: process.env.MODELSLAB_API_KEY,
                image: imageUrl,
                alpha_matting: alphaMatting === 'true',
                post_process_mask: postProcessMask === 'true',
                only_mask: false,
                inverse_mask: false,
                seed: null,
                base64: false,
                alpha_matting_foreground_threshold: 240,
                alpha_matting_background_threshold: 20,
                alpha_matting_erode_size: 5,
                webhook: null,
                track_id: null
            });

            console.log('Background removal response:', response.data);
            
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
                    message: 'Background removed successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'No result returned from the background removal service.'
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
}

module.exports = EditorController;
