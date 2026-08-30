// api/upload.js
// Accepts JSON POST with fileBase64, filename, kind. Uploads to S3 if configured or returns data URL as fallback.

import AWS from 'aws-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { fileBase64, filename = 'upload.bin', kind = 'file' } = req.body || {};
  if (!fileBase64) return res.status(400).json({ error: 'fileBase64 required' });

  const s3Bucket = process.env.S3_BUCKET;
  try {
    if (s3Bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      const s3 = new AWS.S3({
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        region: process.env.S3_REGION || 'us-east-1'
      });
      const matches = fileBase64.match(/^data:(.*);base64,(.*)$/);
      const mime = matches ? matches[1] : 'application/octet-stream';
      const b64 = matches ? matches[2] : fileBase64;
      const buffer = Buffer.from(b64, 'base64');
      const key = `uploads/${Date.now()}-${filename}`;
      await s3.putObject({ Bucket: s3Bucket, Key: key, Body: buffer, ContentType: mime, ACL: 'private' }).promise();
      const url = `s3://${s3Bucket}/${key}`;
      return res.status(200).json({ url, key });
    }

    // Fallback: return data URL (not suitable for production large files)
    return res.status(200).json({ url: fileBase64 });
  } catch (e) {
    console.error('Upload error', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
