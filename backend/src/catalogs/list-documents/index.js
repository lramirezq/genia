const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const response = require('./response');

const s3Client = new S3Client();

exports.handler = async (event) => {
  try {
    const catalogId = event.pathParameters?.catalogId;

    if (!catalogId) {
      return response.error('Catalog ID is required');
    }

    const result = await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.DOCUMENTS_BUCKET,
      Prefix: `catalogs/${catalogId}/`,
      Delimiter: '/'
    }));

    const documents = (result.Contents || [])
      .filter(obj => obj.Key !== `catalogs/${catalogId}/`)
      .map(obj => ({
        key: obj.Key,
        name: obj.Key.split('/').pop(),
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString?.() || obj.LastModified
      }));

    return response.success({ documents });

  } catch (error) {
    console.error('List documents error:', error);
    return response.error('Failed to list documents');
  }
};