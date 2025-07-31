const axios = require('axios');
const uploadToCloud = require('../utility/cloudUpload');
const fetchQueuedImage = require('../utility/fetch-queued-image');

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
     * Step 2: Remove background using existing mask
    */
    static async removeBgWithMask({ imageFile, imageName, maskUrl }) {
        try {
            const imageUrl = await uploadToCloud(imageFile, imageName);
            console.log('Removing background with mask:', maskUrl);

            // Step 2: Remove background using the mask
            const response = await axios.post(EditorModel.REMOVE_BG_URL, {
                key: EditorModel.MODELSLAB_API_KEY,
                image: imageUrl,
                mask: maskUrl, // Use the pre-generated mask
                only_mask: false, // Return the final image
                inverse_mask: false,
                alpha_matting: true,
                post_process_mask: true,
                base64: false,
                webhook: null,
                track_id: null
            });

            return await EditorModel.handleModelResponse(response);
        } catch (error) {
            console.error('Error in removeBgWithMask:', error.response?.data || error.message);
            throw error;
        }
    }

    /*
     * Combined workflow: Create mask then remove background
    */
    static async removeBg({ imageFile, imageName, maskUrl = null, maskFile = null }) {
        try {
            // Upload original image
            const imageUrl = await uploadToCloud(imageFile, imageName);
            
            // If mask file was provided, upload it
            let uploadedMaskUrl = maskUrl;
            if (maskFile) {
                uploadedMaskUrl = await uploadToCloud(maskFile, `mask-${imageName}`);
            }
            
            // If we have a mask, use it
            if (uploadedMaskUrl) {
                console.log('Using provided mask:', uploadedMaskUrl);
                
                // Use object removal API with mask
                const response = await axios.post('https://modelslab.com/api/v6/image_editing/object_removal', {
                    key: EditorModel.MODELSLAB_API_KEY,
                    init_image: imageUrl,
                    mask_image: uploadedMaskUrl,
                    track_id: null,
                    webhook: null
                });
                
                return await EditorModel.handleModelResponse(response);
            } else {
                // No mask provided, use automatic background removal
                // Create mask first, then remove background
                const maskResponse = await axios.post(EditorModel.CREATEMASK_URL, {
                    key: EditorModel.MODELSLAB_API_KEY,
                    image: imageUrl,
                    only_mask: true,
                    inverse_mask: false,
                    alpha_matting: true,
                    post_process_mask: true,
                    base64: false,
                    webhook: null,
                    track_id: null
                });

                const generatedMaskUrl = await EditorModel.handleModelResponse(maskResponse);
                
                // Step 2: Remove background using the mask
                const finalResponse = await axios.post(EditorModel.REMOVE_BG_URL, {
                    key: EditorModel.MODELSLAB_API_KEY,
                    image: imageUrl,
                    mask: generatedMaskUrl,
                    only_mask: false,
                    inverse_mask: false,
                    alpha_matting: true,
                    post_process_mask: true,
                    base64: false,
                    webhook: null,
                    track_id: null
                });

                return await EditorModel.handleModelResponse(finalResponse);
            }
        } catch (error) {
            console.error('Error in removeBg:', error.response?.data || error.message);
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
