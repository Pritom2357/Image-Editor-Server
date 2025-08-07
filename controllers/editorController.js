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

            if (process.env.NODE_ENV === 'production') {
                try {
                    const { execSync } = require('child_process');
                    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
                    console.log('Testing Python and required packages...');
                    
                    try {
                        execSync(`${pythonCmd} -c "import PIL"`, { stdio: 'inherit' });
                        console.log('PIL (Pillow) is available');
                    } catch (error) {
                        console.error('PIL (Pillow) is not installed:', error.message);
                        return EditorController.removeBG(req, res);
                    }
                    
                    try {
                        execSync(`${pythonCmd} -c "import rembg"`, { stdio: 'inherit' });
                        console.log('rembg is available');
                    } catch (error) {
                        console.error('rembg is not installed:', error.message);
                        return EditorController.removeBG(req, res);
                    }
                } catch (error) {
                    console.log('Python or packages not available, falling back to API');
                    return EditorController.removeBG(req, res);
                }
            }

            const imageFile = req.file.buffer;
            const imageName = req.file.originalname;

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
                    message: "Background removed locally - much faster!"
                });
            } else {
                throw new Error("Local processing returned no result");
            }
            
        } catch (error) {
            console.error('Error in local background removal:', error);
            console.log('Falling back to API background removal');
            return EditorController.removeBG(req, res);
        }
    }
}

module.exports = EditorController;
