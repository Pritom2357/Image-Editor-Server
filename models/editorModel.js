const axios = require('axios');
const uploadToCloud = require('../utility/cloudUpload');
const fetchQueuedImage = require('../utility/fetch-queued-image');

const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const { isSafeImage } = require('../utility/NSFWFlagUtils/FlagImage');
const { isSafePrompt } = require('../utility/NSFWFlagUtils/FlagPrompt');

class EditorModel {

    static OUTPAINT_URL = process.env.MODELSLAB_OUTPAINT_URL;
    static REMOVE_BG_URL = process.env.MODELSLAB_REMOVE_BG_URL;
    static CREATEMASK_URL = process.env.MODELSLAB_CREATEMASK_URL;
    static INPAINT_URL = process.env.MODELSLAB_INPAINT_URL;
    static TXT_2_IMG_URL = process.env.MODELSLAB_TXT_2_IMG_URL;
    static IMG_2_IMG_URL = process.env.MODELSLAB_IMG_2_IMG_URL;
    static MODELSLAB_API_KEY = process.env.MODELSLAB_API_KEY;
    static ENHANCE_URL = process.env.MODELSLAB_ENHANCE_URL;
    static REMBG_HF_URL = 'https://pritombiswas9999-rembg-server.hf.space/api/remove-background-bytes';

    static NSFW_MESSAGE = 'Please Follow Our NSFW Guidelines and Don\'t Upload or Try To Generate Inappropriate Content';

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

        if(await isSafeImage(imageUrl) === false) {
            return {
                safe: false,
                error: EditorModel.NSFW_MESSAGE
            };
        }
        else if(await isSafePrompt(prompt) === false) {
            return {
                safe: false,
                error: EditorModel.NSFW_MESSAGE
            };
        }

        const response = await axios.post(EditorModel.OUTPAINT_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            prompt,
            negative_prompt,
            image: imageUrl,
            width: width || 1280, // width of the output image
            height: height || 1280, // height of the output image
            overlap_width: overlap_width || 10, 
            num_inference_steps: 30, 
            guidance_scale: guidance_scale || 8.0, 
            seed: -1, 
            base64: false,
            webhook: null,
            track_id: null,
        });

        if(response.data.output.length === 0) {
            return { 
                output: [],
                id: response.data.id
            }
        }
        else{
            return {
                output: response.data.output,
                id: null
            }
        }
    }


    /*
     * Text to Image
    */

    static async textToImage({ prompt, negative_prompt, samples, width, height, safety_checker, enhance_prompt }) {

        if(await isSafePrompt(prompt) !== true) {
            return {
                safe: false,
                error: EditorModel.NSFW_MESSAGE
            };
        }

        const response = await axios.post(EditorModel.TXT_2_IMG_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            prompt,
            negative_prompt,
            samples: samples || 1,
            width: width || 512,
            height: height || 512,
            safety_checker: true,
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
        }
        
        catch (error) {
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
            console.log("Starting HuggingFace background removal");
            console.log(`Using HF endpoint: ${EditorModel.REMBG_HF_URL}`);

            // Create FormData for the API call
            const FormData = require('form-data');
            const form = new FormData();
            
            // Append the image buffer as a file
            form.append('image', imageFile, {
                filename: imageName,
                contentType: 'image/jpeg' // or detect from imageName
            });

            // Make API call to your HuggingFace endpoint
            const response = await axios.post(EditorModel.REMBG_HF_URL, form, {
                headers: {
                    ...form.getHeaders(),
                },
                responseType: 'arraybuffer', // Important: get binary data
                timeout: 60000 // 60 second timeout
            });

            if (response.status === 200 && response.data) {
                // Upload the processed image buffer to your cloud storage
                const processedImageName = `bg-removed-hf-${Date.now()}.png`;
                const imageUrl = await uploadToCloud(Buffer.from(response.data), processedImageName);
                
                console.log('Background removed successfully with HF, uploaded to:', imageUrl);
                return imageUrl;
            } else {
                throw new Error(`HuggingFace API returned status ${response.status}`);
            }
        }
        
        catch (error) {
            console.error('Error in HuggingFace background removal:', error.message);
            
            // Log more details for debugging
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data?.toString?.() || 'Binary data');
            }
            
            throw error;
        }
    }

    
    static async removeBackgroundLocalBase64({imageFile, imageName}){
        try {
            console.log("Starting HuggingFace background removal (base64)");
            
            const FormData = require('form-data');
            const form = new FormData();
            form.append('image', imageFile, {
                filename: imageName,
                contentType: 'image/jpeg'
            });

            const response = await axios.post('https://pritombiswas9999-rembg-server.hf.space/api/remove-background', form, {
                headers: {
                    ...form.getHeaders(),
                },
                timeout: 60000
            });

            if (response.data.success && response.data.image_base64) {
                // Convert base64 to buffer
                const imageBuffer = Buffer.from(response.data.image_base64, 'base64');
                
                // Upload to cloud
                const processedImageName = `bg-removed-hf-b64-${Date.now()}.png`;
                const imageUrl = await uploadToCloud(imageBuffer, processedImageName);
                
                console.log(`Background removed in ${response.data.processing_time}s, uploaded to:`, imageUrl);
                return imageUrl;
            } else {
                throw new Error('HuggingFace API did not return success');
            }
        }
        
        catch (error) {
            console.error('Error in HuggingFace background removal (base64):', error.message);
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

        console.log('Uploaded image URL:', imageUrl);

        if(await isSafeImage(imageUrl) === false) {
            return {
                safe: false,
                error: EditorModel.NSFW_MESSAGE
            };
        }

        console.log('Image is safe, proceeding with transformation.');

        const response = await axios.post(EditorModel.IMG_2_IMG_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            prompt,
            negative_prompt,
            init_image: imageUrl,
            samples: samples || 1,
            width: width || 512,
            height: height || 512,
            safety_checker: true,
            base64: false,
            strength: strength || 0.5,
            seed: null,
            webhook: null,
            track_id: null,
            enhance_prompt: true
        });

        console.log('Image transformation response:', response.data);

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

        if(await isSafeImage(imageUrl) !== true) {
            return {
                safe: false,
                error: EditorModel.NSFW_MESSAGE
            };
        }

        const response = await axios.post(EditorModel.ENHANCE_URL, {
            key: EditorModel.MODELSLAB_API_KEY,
            init_image: imageUrl,
            model_id: "realesr-general-x4v3",   // 4x image enhancement model
            face_enhance: faceEnhance,
            scale: scale || 4,
            webhook: null,
            track_id: null,
        });

        if(response.data.output.length === 0) {
            return { 
                output: [],
                id: response.data.id
            }
        }
        else{
            return {
                output: response.data.output,
                id: null
            }
        }
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
            console.log('Image transformation successful:', response.data.output);
            return response.data.output;
        }
        
        else if (response.data.status === 'processing') {
            console.log('Image transformation is still processing...');

            const fetchURL = response.data.fetch_result;
            const resultURL = await fetchQueuedImage.FetchQueuedImageByURL(fetchURL);

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