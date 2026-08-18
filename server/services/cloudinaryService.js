const cloudinary = require('../config/cloudinary');

function uploadBuffer(buffer, folder, isPrivate = true) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `medisphere/${folder}`,
        resource_type: 'auto',
        type: isPrivate ? 'authenticated' : 'upload'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type
        });
      }
    );
    uploadStream.end(buffer);
  });
}

function getSignedViewUrl(publicId, resourceType = 'image') {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    type: 'authenticated',
    resource_type: resourceType,
    sign_url: true,
    secure: true
  });
}

module.exports = { uploadBuffer, getSignedViewUrl };