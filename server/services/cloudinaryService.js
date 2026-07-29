const cloudinary = require('../config/cloudinary');

function uploadBuffer(buffer, folder, isPrivate = true) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `MediSphere/${folder}`,
        resource_type: 'auto',
        type: isPrivate ? 'authenticated' : 'upload'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          isPrivate
        });
      }
    );
    stream.end(buffer);
  });
}

function getSignedViewUrl(publicId, resourceType = 'image') {
  return cloudinary.url(publicId, {
    type: 'authenticated',
    resource_type: resourceType,
    sign_url: true,
    secure: true
  });
}

module.exports = { uploadBuffer, getSignedViewUrl };