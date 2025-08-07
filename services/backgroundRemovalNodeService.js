const tf = require('@tensorflow/tfjs-node');
const bodyPix = require('@tensorflow-models/body-pix');
const Jimp = require('jimp');

class BackgroundRemovalNodeService {
    static model = null;
    static isModelLoading = false;
    
    static async loadModel() {
        if (this.model) {
            return this.model;
        }
        
        if (this.isModelLoading) {
            while (this.isModelLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.model;
        }
        
        try {
            console.log('Loading BodyPix model...');
            this.isModelLoading = true;
            
            this.model = await bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                multiplier: 0.75,
                quantBytes: 2
            });
            
            console.log('BodyPix model loaded successfully');
            this.isModelLoading = false;
            return this.model;
            
        } catch (error) {
            this.isModelLoading = false;
            console.error('Failed to load BodyPix model:', error);
            throw error;
        }
    }
    
    static async removeBackgroundFromBuffer(imageBuffer) {
        try {
            console.log(`Processing image buffer of size: ${imageBuffer.length} bytes`);
            
            const model = await this.loadModel();
            
            console.log('Loading image with Jimp...');
            const image = await Jimp.read(imageBuffer);
            
            const maxSize = 512;
            if (image.bitmap.width > maxSize || image.bitmap.height > maxSize) {
                console.log(`Resizing image from ${image.bitmap.width}x${image.bitmap.height}`);
                image.scaleToFit(maxSize, maxSize);
                console.log(`Resized to ${image.bitmap.width}x${image.bitmap.height}`);
            }
            
            const { width, height } = image.bitmap;
            const imageData = new ImageData(
                new Uint8ClampedArray(image.bitmap.data),
                width,
                height
            );
            
            console.log(`Processing segmentation for ${width}x${height} image...`);
            
            const segmentation = await model.segmentPerson(imageData, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7,
                maxDetections: 10,
                scoreThreshold: 0.2,
                nmsRadius: 20
            });
            
            console.log('Segmentation complete, creating mask...');
            
            const resultImage = await this.applySegmentationMask(image, segmentation);
            
            const resultBuffer = await resultImage.getBufferAsync(Jimp.MIME_PNG);
            
            console.log(`Background removal completed. Result size: ${resultBuffer.length} bytes`);
            return resultBuffer;
            
        } catch (error) {
            console.error('Error in TensorFlow background removal:', error);
            throw error;
        }
    }
    
    static async applySegmentationMask(originalImage, segmentation) {
        try {
            const { width, height } = originalImage.bitmap;
            const maskData = segmentation.data;
            
            const resultImage = originalImage.clone();
             
            for (let i = 0; i < maskData.length; i++) {
                const pixelIndex = i * 4;
                
                if (maskData[i] === 0) {
                    resultImage.bitmap.data[pixelIndex + 3] = 0; 
                } else {
                }
            }
            
            return resultImage;
            
        } catch (error) {
            console.error('Error applying segmentation mask:', error);
            throw error;
        }
    }
    
    static async removeBackgroundFromBufferEnhanced(imageBuffer) {
        try {
            console.log(`Processing image buffer of size: ${imageBuffer.length} bytes with enhancement`);
            
            const model = await this.loadModel();
            const image = await Jimp.read(imageBuffer);
            
            const originalWidth = image.bitmap.width;
            const originalHeight = image.bitmap.height;
            const maxSize = 512;
            
            if (originalWidth > maxSize || originalHeight > maxSize) {
                image.scaleToFit(maxSize, maxSize);
            }
            
            const { width, height } = image.bitmap;
            const imageData = new ImageData(
                new Uint8ClampedArray(image.bitmap.data),
                width,
                height
            );
            
            console.log('Processing enhanced segmentation...');
            
            const segmentation1 = await model.segmentPerson(imageData, {
                flipHorizontal: false,
                internalResolution: 'high',
                segmentationThreshold: 0.6,
                maxDetections: 10
            });
            
            const segmentation2 = await model.segmentPerson(imageData, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.8,
                maxDetections: 10
            });
            
            const combinedMask = this.combineMasks(segmentation1.data, segmentation2.data);
               
            const resultImage = await this.applySmoothedMask(image, combinedMask, width, height);
            
            if (originalWidth > maxSize || originalHeight > maxSize) {
                resultImage.resize(originalWidth, originalHeight);
            }
            
            const resultBuffer = await resultImage.getBufferAsync(Jimp.MIME_PNG);
            
            console.log(`Enhanced background removal completed. Result size: ${resultBuffer.length} bytes`);
            return resultBuffer;
            
        } catch (error) {
            console.error('Error in enhanced background removal:', error);
            return this.removeBackgroundFromBuffer(imageBuffer);
        }
    }
    
    static combineMasks(mask1, mask2) {
        const combined = new Uint8Array(mask1.length);
        for (let i = 0; i < mask1.length; i++) {
            combined[i] = (mask1[i] === 1 && mask2[i] === 1) ? 1 : 0;
        }
        return combined;
    }
    
    static async applySmoothedMask(originalImage, maskData, width, height) {
        const resultImage = originalImage.clone();
        const smoothingRadius = 2;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                const pixelIndex = index * 4;
                
                if (maskData[index] === 0) {
                    const edgeDistance = this.getEdgeDistance(maskData, x, y, width, height, smoothingRadius);
                    const alpha = Math.max(0, Math.min(255, edgeDistance * 255 / smoothingRadius));
                    
                    resultImage.bitmap.data[pixelIndex + 3] = Math.floor(alpha);
                } else {
                   
                }
            }
        }
        
        return resultImage;
    }
    
    static getEdgeDistance(maskData, x, y, width, height, radius) {
        let foregroundCount = 0;
        let totalCount = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const index = ny * width + nx;
                    if (maskData[index] === 1) foregroundCount++;
                    totalCount++;
                }
            }
        }
        
        return totalCount > 0 ? foregroundCount / totalCount : 0;
    }
}

module.exports = BackgroundRemovalNodeService;