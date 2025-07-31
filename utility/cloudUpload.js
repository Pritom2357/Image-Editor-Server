/*
 * Uploads an image buffer to ImageKit and returns the public URL
 * @param {Buffer} fileBuffer - The image file buffer
 * @param {string} fileName - The desired file name for the uploaded image
 * @returns {Promise<string>} - The public URL of the uploaded image
*/

const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL,
});


async function uploadToCloud(fileBuffer, fileName) {
  try {
    console.log('Uploading image to cloud storage...');
    
    // Convert buffer to base64 string
    const base64String = fileBuffer.toString('base64');

    // Create a timeout promise
    const uploadPromise = imagekit.upload({
      file: base64String,
      fileName,
      folder: "/ai-image-editor/"
    });

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout')), 30000);
    });

    // Race between upload and timeout
    const result = await Promise.race([uploadPromise, timeoutPromise]);

    console.log('✅ Image uploaded successfully to cloud');
    return result.url;

  } catch (error) {
    console.error('❌ Cloud upload failed:', error.message);
    
    if (error.message === 'Upload timeout') {
      throw new Error('Cloud upload timeout - please try again with a smaller image');
    }
    
    throw new Error(`Failed to upload image to cloud: ${error.message}`);
  }
}

module.exports = uploadToCloud;
