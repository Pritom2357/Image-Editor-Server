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

            if (output.output && output.output.length > 0) {
                const user = req.user;                
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    image: output.output[0]
                });
            }

            else if(output.id){
                res.status(202).json({
                    success: true,
                    message: 'Enhancing in progress',
                    id: output.id
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
            console.log('HuggingFace background removal request received');

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;

            console.log('Processing with HuggingFace background removal service');

            const result = await EditorModel.removeBackgroundLocal({
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
                    message: "Background removed with HuggingFace - fast and reliable!"
                });
            } else {
                throw new Error("HuggingFace processing returned no result");
            }
            
        } catch (error) {
            console.error('Error in HuggingFace background removal:', error);
            
            // Fallback to your existing API method if HF fails
            console.log('Falling back to ModelsLab API background removal');
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

    static async removeBackgroundWithMask(req, res) {
        try {
            console.log('Mask-guided background removal request received');
            console.log('Files received:', Object.keys(req.files || {}));
            
            if (!req.files || !req.files.image || !req.files.mask) {
                return res.status(400).json({
                    success: false,
                    message: 'Both image and mask files are required'
                });
            }

            const imageFile = req.files.image[0].buffer;
            const imageName = req.files.image[0].originalname;
            const maskFile = req.files.mask[0].buffer;
            const maskName = req.files.mask[0].originalname;

            const postProcessMask = req.body.post_process_mask !== 'true';

            console.log('Processing mask-guided background removal:', {
                imageName,
                maskName,
                imageSize: imageFile.length,
                maskSize: maskFile.length,
                postProcessMask  
            });

            const result = await EditorModel.removeBackgroundWithMask({
                imageFile, 
                imageName,
                maskFile,
                maskName,
                postProcessMask  
            });

            if (result) {
                const resultUrl = Array.isArray(result) ? result[0] : result;

                const user = req.user;
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    image: resultUrl,
                    message: "Mask-guided background removal successful! 🎨",
                    postProcessed: postProcessMask  
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: "No result returned from the mask-guided bg-removal service"
                });
            }
            
        } catch (error) {
            console.error('Error in mask-guided background removal:', error);

            res.status(500).json({
                success: false,
                message: 'An error occurred while processing mask-guided background removal.',
                error: error.message
            });
        }
    }

    static async removeBackgroundLocalEnhanced(req, res) {
        try {
            console.log('🌟 Enhanced background removal request received');
            console.log('Body params:', req.body);

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;
            
            // Extract parameters correctly from the request body
            const addBackground = req.body.add_background === 'true';
            const bgColorR = Math.max(0, Math.min(255, req.body.bg_color_r === undefined ? 255 : parseInt(req.body.bg_color_r)));
            const bgColorG = Math.max(0, Math.min(255, req.body.bg_color_g === undefined ? 255 : parseInt(req.body.bg_color_g)));
            const bgColorB = Math.max(0, Math.min(255, req.body.bg_color_b === undefined ? 255 : parseInt(req.body.bg_color_b)));
            const transparency = Math.max(0, Math.min(1, parseFloat(req.body.transparency) || 1.0));
            const brightness = Math.max(0.1, Math.min(3, parseFloat(req.body.brightness) || 1.0));
            const saturation = Math.max(0, Math.min(3, parseFloat(req.body.saturation) || 1.0));
            const contrast = Math.max(0.1, Math.min(3, parseFloat(req.body.contrast) || 1.0));

            // Log the actual extracted values for debugging
            console.log('📊 Processing with parameters:', {
                imageName,
                addBackground,
                bgColor: `rgb(${bgColorR}, ${bgColorG}, ${bgColorB})`, // Using actual RGB values
                transparency,
                brightness,
                saturation,
                contrast
            });

            // Pass parameters individually to avoid any object reference issues
            const result = await EditorModel.removeBackgroundEnhanced({
                imageFile,
                imageName,
                addBackground,
                bgColorR,
                bgColorG,
                bgColorB,
                transparency,
                brightness,
                saturation,
                contrast
            });

            if (result) {
                const user = req.user;
                const service = formatServicePath(req.path);
                trackUsage(user.uuid, user.username, user.email, service);

                res.status(200).json({
                    success: true,
                    image: result,
                    message: "Enhanced background removal successful! 🎨✨",
                    enhanced: true,
                    parameters: {
                        addBackground,
                        bgColor: addBackground ? `rgb(${bgColorR}, ${bgColorG}, ${bgColorB})` : null,
                        transparency,
                        brightness,
                        saturation,
                        contrast
                    }
                });
            } else {
                throw new Error("Enhanced processing returned no result");
            }
            
        } catch (error) {
            console.error('❌ Error in enhanced background removal:', error);
            
            res.status(500).json({
                success: false,
                message: 'Enhanced background removal failed.',
                error: error.message,
                enhanced: false
            });
        }
    }
}

module.exports = EditorController;
