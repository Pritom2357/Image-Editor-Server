const axios = require('axios');
const uploadToCloud = require('../utility/cloudUpload');
const fetchQueuedImage = require('../utility/fetch-queued-image');

const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const BackgroundRemovalNodeService = require('../services/backgroundRemovalNodeService');

class EditorModel {

    static OUTPAINT_URL = process.env.MODELSLAB_OUTPAINT_URL;
    static REMOVE_BG_URL = process.env.MODELSLAB_REMOVE_BG_URL;
    static CREATEMASK_URL = process.env.MODELSLAB_CREATEMASK_URL;
    static INPAINT_URL = process.env.MODELSLAB_INPAINT_URL;
    static TXT_2_IMG_URL = process.env.MODELSLAB_TXT_2_IMG_URL;
    static IMG_2_IMG_URL = process.env.MODELSLAB_IMG_2_IMG_URL;
    static MODELSLAB_API_KEY = process.env.MODELSLAB_API_KEY;
    static ENHANCE_URL = process.env.MODELSLAB_ENHANCE_URL;

    /* 
     * Outpaint (image outpainting)
     *
     * overlap_width: if overlap_width is 30, it blends 30 pixels of the old image into the new edges so it looks natural.
     * num_inference_steps: number of steps for the model to generate the image
     * guidance_scale: higher value means more adherence to the prompt
     * seed: -1 means no seed, which allows for random generation
    */

    static async outpaint({ imageFile, imageName, prompt, negative_prompt, overlap_width, width, height, guidance_scale }) {

        const imageUrl = await uploadToCloud(imageFile, imageName);

        const response = await axios.post(EditorModel.OUTPAINT_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            prompt,
            negative_prompt,
            image: imageUrl,
            width: width || 1280, // width of the output image
            height: height || 1280, // height of the output image
            overlap_width: overlap_width || 10, 
            num_inference_steps: 10, 
            guidance_scale: guidance_scale || 8.0, 
            seed: -1, 
            base64: false,
            webhook: null,
            track_id: null,
        });

        return await EditorModel.handleModelResponse(response);
    }


    /*
     * Text to Image
    */

    static async textToImage({ prompt, negative_prompt, samples, width, height, safety_checker, enhance_prompt }) {
        const response = await axios.post(EditorModel.TXT_2_IMG_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            prompt,
            negative_prompt,
            samples: samples || 1,
            width: width || 512,
            height: height || 512,
            safety_checker: safety_checker || false,
            base64: false,
            seed: null,
            webhook: null,
            track_id: null,
            enhance_prompt: enhance_prompt || false
        });


        return await EditorModel.handleModelResponse(response);
    }


    /*
     * Create Mask
     *
     * mode: 'foreground' or 'background'
     * output_type: 'soft' or 'hard'
     * post_process: true or false
     * alpha_matting: true or false
    */

    static async createMask({ imageFile, imageName, mode = 'foreground' }) {
        try {
            console.log('Creating mask with mode:', mode);
            console.log('CREATEMASK_URL:', EditorModel.CREATEMASK_URL);

            const imageUrl = await uploadToCloud(imageFile, imageName);
            console.log('Image uploaded to:', imageUrl);

            // Step 1: Create mask only
            const response = await axios.post(EditorModel.CREATEMASK_URL, {
                key: EditorModel.MODELSLAB_API_KEY,
                image: imageUrl,
                only_mask: true, // This returns only the mask
                inverse_mask: mode === 'background',
                alpha_matting: true,
                post_process_mask: true,
                base64: false,
                webhook: null,
                track_id: null
            });

            console.log('ModelsLab createMask response:', response.data);
            return await EditorModel.handleModelResponse(response);
        } catch (error) {
            console.error('Error in createMask:', error.response?.data || error.message);
            throw error; 
        }
    }

    /*
     *Remove background using existing mask
    */
    

    static async removeBG({imageFile, imageName, alpha_matting = true, post_process_mask = true}){
        try {
            console.log("Starting Background removal");
            console.log(`BG removal endpoint: ${process.env.MODELSLAB_REMOVEBG_MASK_URL}`);

            const imageUrl = await uploadToCloud(imageFile, imageName);
            console.log("Image uploaded to:", imageUrl);

            const response = await axios.post(process.env.MODELSLAB_REMOVEBG_MASK_URL, {
                key: EditorModel.MODELSLAB_API_KEY,
                image: imageUrl,  
                post_process_mask: post_process_mask,
                only_mask: false,  // Returns processed image, not just mask
                alpha_matting: alpha_matting,
                inverse_mask: false,  // Normal background removal
                seed: null,  
                base64: false,
                alpha_matting_foreground_threshold: 240,
                alpha_matting_background_threshold: 20,
                alpha_matting_erode_size: 5,
                webhook: null,
                track_id: null  
            });

            const result = await response.data;
            console.log("Model slab API response: " + result);
            
            return await EditorModel.handleModelResponse(response);                  
            
        } catch (error) {
            console.error('Error in remove background:', error.response?.data || error.message);
            throw error; 
        }
    }

    static async removeBackgroundLocal({imageFile, imageName}){
        try {
            console.log("Starting local background removal");
            console.log(`Image size: ${imageFile.length} bytes, name: ${imageName}`);
            
            return new Promise((resolve, reject) => {
                const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
                console.log(`Using Python command: ${pythonCmd}`);
                
                const scriptPath = path.join(__dirname, '../services/background_removal_service.py');
                console.log(`Python script path: ${scriptPath}`);
                
                if (!fs.existsSync(scriptPath)) {
                    return reject(new Error(`Python script not found at: ${scriptPath}`));
                }
                
                const pythonProcess = spawn(pythonCmd, [scriptPath], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    maxBuffer: 1024 * 1024 * 50 
                });
                
                let outputBuffer = Buffer.alloc(0);
                let errorOutput = '';
                let processExited = false;

                pythonProcess.stderr.on('data', (data) => {
                    const message = data.toString();
                    console.log(`Python stderr: ${message}`);
                    errorOutput += message;
                });

                pythonProcess.stdout.on('data', (data) => {
                    console.log(`Received ${data.length} bytes from Python stdout`);
                    outputBuffer = Buffer.concat([outputBuffer, data]);
                });

                pythonProcess.on('error', (error) => {
                    console.error('Failed to start Python process:', error);
                    processExited = true;
                    reject(error);
                });

                pythonProcess.on('close', async (code) => {
                    console.log(`Python process exited with code: ${code}`);
                    processExited = true;
                    
                    if (code === 0 && outputBuffer.length > 0) {
                        try {
                            console.log(`Received ${outputBuffer.length} bytes of processed image data`);
                            const processedImageName = `bg-removed-local-${Date.now()}.png`;
                            const imageUrl = await uploadToCloud(outputBuffer, processedImageName);
                            console.log('Background removed successfully, uploaded to:', imageUrl);
                            resolve(imageUrl);
                        } catch (uploadError) { 
                            console.error('Error uploading processed image:', uploadError);
                            reject(uploadError);
                        }
                    } else {
                        console.error('Python process failed with code:', code);
                        console.error('Error output:', errorOutput);
                        reject(new Error(`Background removal failed (code ${code}): ${errorOutput}`));
                    }
                });
                
                const timeout = setTimeout(() => {
                    if (!processExited) {
                        console.error('Python process timeout, killing...');
                        pythonProcess.kill();
                        reject(new Error('Python process timeout after 60 seconds'));
                    }
                }, 60000);

                try {
                    console.log(`Writing ${imageFile.length} bytes to Python stdin...`);
                    pythonProcess.stdin.write(imageFile);
                    console.log('Ending stdin stream...');
                    pythonProcess.stdin.end();
                } catch (error) {
                    console.error('Error writing to Python stdin:', error);
                    if (!processExited) {
                        pythonProcess.kill();
                        clearTimeout(timeout);
                    }
                    reject(error);
                }
            });
        } catch (error) {
            console.error('Error in local background removal:', error);
            throw error;
        }
    }

    static async removeBackgroundLocalNode({imageFile, imageName}) {
        try {
            console.log("Starting Node.js background removal");
            console.log(`Image size: ${imageFile.length} bytes, name: ${imageName}`);
            
            const processedImageBuffer = await BackgroundRemovalNodeService.removeBackgroundFromBuffer(imageFile);
            
            const processedImageName = `bg-removed-node-${Date.now()}.png`;
            const imageUrl = await uploadToCloud(processedImageBuffer, processedImageName);
            
            console.log('Background removed successfully with Node.js, uploaded to:', imageUrl);
            return imageUrl;
            
        } catch (error) {
            console.error('Error in Node.js background removal:', error);
            throw error;
        }
    }



    /*
     * Image to Image
     *
     * strength: float value between 0 and 1, where 0 means no change to the image and 1 means full transformation based on the prompt [Original Image is ignored, and works like text to image].
     * The default value is 0.5, which means a moderate transformation.
    */

    static async imageToImage({ imageFile, imageName, prompt, negative_prompt, samples, width, height, safety_checker, strength }) {

        const imageUrl = await uploadToCloud(imageFile, imageName);

        const response = await axios.post(EditorModel.IMG_2_IMG_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            prompt,
            negative_prompt,
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
        });

        return await EditorModel.handleModelResponse(response);
    }



    /*
     * Image Enhancer
     * model_id: 'ultra-resolution' for 4k+ upscaling
     * face_enhance: enables face enhancement if true
     * scale: 2x or 4x
    */

    static async enhanceImage({ imageFile, imageName, faceEnhance, scale }) {
        const imageUrl = await uploadToCloud(imageFile, imageName);

        const response = await axios.post(EditorModel.ENHANCE_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            init_image: imageUrl,
            model_id: "realesr-general-x4v3",   // 4x image enhancement model
            face_enhance: faceEnhance,
            scale: scale || 4,
            webhook: null,
            track_id: null,
        });

        return await EditorModel.handleModelResponse(response);
    }



    /*
     * Inpaint Holes
     *
     * cutoutUrl: URL of the image with the hole (usually the output of the removeBg or createMask function)
     * originalUrl: URL of the original image (before any editing)
    */

    static async inpaintHoles({ cutoutUrl, originalUrl }) {
        const response = await axios.post(EditorModel.INPAINT_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            file: cutoutUrl,
            mask: cutoutUrl,
            reference: originalUrl,
            base64: false
        });

        return await EditorModel.handleModelResponse(response);
    }



    // Handles API responses for all model endpoints
    static async handleModelResponse(response) {

        if (response.data.status === 'success') {
            return response.data.output;
        }
        
        else if (response.data.status === 'processing') {
            const fetchURL = response.data.fetch_result;
            const resultURL = await fetchQueuedImage(fetchURL);

            return resultURL;
        }
        
        else if (response.data.status === 'error') {
            console.error('Error from model:', response.data.message);
            throw new Error(response.data.error || 'API Model error');
        }
        
        else {
            throw new Error('Unknown response status from text-to-image model');
        }
    }
}


module.exports = EditorModel;
