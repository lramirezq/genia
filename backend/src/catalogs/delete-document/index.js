const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const response = require('./response');

const s3Client = new S3Client();

exports.handler = async (event) => {
  try {
    const catalogId = event.pathParameters?.catalogId;
    const documentName = decodeURIComponent(event.pathParameters?.documentName || '');

    if (!catalogId || !documentName) {
      return response.error('Catalog ID and document name are required');
    }

    const key = `catalogs/${catalogId}/${documentName}`;

    await s3Client.send(new DeleteObjectCommand({
      Bucket: process.env.DOCUMENTS_BUCKET,
      Key: key
    }));

    return response.success({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    return response.error('Failed to delete document');
  }
};