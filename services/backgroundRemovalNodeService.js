const { removeBackground } = require('@imgly/background-removal');

class BackgroundRemovalNodeService {
    static async removeBackgroundFromBuffer(imageBuffer) {
        try {
            console.log(`Processing image buffer of size: ${imageBuffer.length} bytes`);
            
            const uint8Array = new Uint8Array(imageBuffer);
            
            const blob = new Blob([uint8Array], { type: 'image/jpeg' });
            
            console.log('Starting background removal...');
            const result = await removeBackground(blob);
            
            const arrayBuffer = await result.arrayBuffer();
            const resultBuffer = Buffer.from(arrayBuffer);
            
            console.log(`Background removal completed. Result size: ${resultBuffer.length} bytes`);
            return resultBuffer;
            
        } catch (error) {
            console.error('Error in Node.js background removal:', error);
            throw error;
        }
    }
    
    static async removeBackgroundFromFile(imagePath, outputPath) {
        try {
            const result = await removeBackground(imagePath);
            const arrayBuffer = await result.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            require('fs').writeFileSync(outputPath, buffer);
            return buffer;
        } catch (error) {
            console.error('Error in file-based background removal:', error);
            throw error;
        }
    }
}

module.exports = BackgroundRemovalNodeService;