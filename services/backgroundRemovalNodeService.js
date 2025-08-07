const { Rembg } = require("@xixiyahaha/rembg-node");
const sharp = require("sharp");

class BackgroundRemovalNodeService {
    static rembg = null;
    static isInitializing = false;
    
    static async initializeRembg() {
        if (this.rembg) {
            return this.rembg;
        }
        
        if (this.isInitializing) {
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.rembg;
        }
        
        try {
            console.log('Initializing Rembg service...');
            this.isInitializing = true;
            
            this.rembg = new Rembg({
                logging: true,
                models: ["u2net"], 
            });
            
            console.log('Rembg service initialized successfully');
            this.isInitializing = false;
            return this.rembg;
            
        } catch (error) {
            this.isInitializing = false;
            console.error('Failed to initialize Rembg service:', error);
            throw error;
        }
    }
    
    static async removeBackgroundFromBuffer(imageBuffer) {
        try {
            console.log(`Processing image buffer of size: ${imageBuffer.length} bytes`);
            
            const rembgService = await this.initializeRembg();
            
            let inputImage = sharp(imageBuffer);
            
            const metadata = await inputImage.metadata();
            console.log(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
            
            const maxSize = 1024;
            if (metadata.width > maxSize || metadata.height > maxSize) {
                console.log(`Resizing image for optimal processing...`);
                inputImage = inputImage.resize(maxSize, maxSize, { 
                    fit: 'inside',
                    withoutEnlargement: true 
                });
            }
            
            inputImage = inputImage.jpeg({ quality: 95 });
            
            console.log('Starting background removal with Rembg...');
            
            const outputImage = await rembgService.remove(inputImage);
            
            const resultBuffer = await outputImage
                .png({ 
                    compressionLevel: 6,
                    quality: 90 
                })
                .toBuffer();
            
            console.log(`Background removal completed. Result size: ${resultBuffer.length} bytes`);
            return resultBuffer;
            
        } catch (error) {
            console.error('Error in Rembg background removal:', error);
            
            return this.fallbackRemoval(imageBuffer);
        }
    }
    
    static async removeBackgroundFromBufferEnhanced(imageBuffer) {
        try {
            console.log(`Processing enhanced background removal for ${imageBuffer.length} bytes`);
            
            const rembgService = await this.initializeRembg();
            
            let inputImage = sharp(imageBuffer);
            const metadata = await inputImage.metadata();
            
            inputImage = await inputImage
                .normalize() 
                .sharpen() 
                .jpeg({ quality: 98 });
            
            console.log('Starting enhanced background removal...');
            
            let outputImage = await rembgService.remove(inputImage);
            
            outputImage = outputImage
                .trim() 
                .extend({
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }) 
                .png({ 
                    compressionLevel: 6,
                    quality: 95,
                    progressive: true 
                });
            
            const resultBuffer = await outputImage.toBuffer();
            
            console.log(`Enhanced background removal completed. Result size: ${resultBuffer.length} bytes`);
            return resultBuffer;
            
        } catch (error) {
            console.error('Error in enhanced background removal:', error);
            return this.removeBackgroundFromBuffer(imageBuffer);
        }
    }
    
    static async fallbackRemoval(imageBuffer) {
        try {
            console.log('Using Sharp-only fallback background removal...');
            
            const image = sharp(imageBuffer);
            const metadata = await image.metadata();
            
            const result = await image
                .greyscale()
                .threshold(200) 
                .negate() 
                .png()
                .toBuffer();
            
            console.log(`Fallback completed. Result size: ${result.length} bytes`);
            return result;
            
        } catch (fallbackError) {
            console.error('Error in fallback removal:', fallbackError);
            throw fallbackError;
        }
    }
    
    static async getStatus() {
        try {
            const isReady = !!this.rembg;
            const isInitializing = this.isInitializing;
            
            return {
                ready: isReady,
                initializing: isInitializing,
                service: 'rembg-node',
                models: ['u2net'],
                sharp: {
                    version: sharp.versions.vips,
                    platform: process.platform
                }
            };
        } catch (error) {
            return {
                ready: false,
                error: error.message
            };
        }
    }
    
    static async loadModel() {
        console.log('Loading Rembg model...');
        return this.initializeRembg();
    }
    
    static async removeBackgroundBatch(imageBuffers) {
        try {
            console.log(`Processing batch of ${imageBuffers.length} images`);
            
            const rembgService = await this.initializeRembg();
            const results = [];
            
            for (let i = 0; i < imageBuffers.length; i++) {
                console.log(`Processing image ${i + 1}/${imageBuffers.length}`);
                
                try {
                    const result = await this.removeBackgroundFromBuffer(imageBuffers[i]);
                    results.push({ success: true, data: result, index: i });
                } catch (error) {
                    console.error(`Error processing image ${i + 1}:`, error);
                    results.push({ success: false, error: error.message, index: i });
                }
            }
            
            console.log(`Batch processing completed. ${results.filter(r => r.success).length}/${results.length} successful`);
            return results;
            
        } catch (error) {
            console.error('Error in batch processing:', error);
            throw error;
        }
    }
}

module.exports = BackgroundRemovalNodeService;