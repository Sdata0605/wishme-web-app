/**
 * Backblaze B2 storage for private files (call recordings).
 *
 * Unlike the media the app shows publicly, nothing here is uploaded with public-read: a recording
 * is a private conversation, so it can only be played through a short-lived signed link.
 */

import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.17';

const REGION = 'us-east-005';

function b2() {
  const keyId = Deno.env.get('B2_KEY_ID');
  const appKey = Deno.env.get('B2_APPLICATION_KEY');
  const bucket = Deno.env.get('B2_BUCKET_NAME');
  const endpointRaw = Deno.env.get('B2_ENDPOINT') ?? `s3.${REGION}.backblazeb2.com`;
  if (!keyId || !appKey || !bucket) return null;
  const endpoint = endpointRaw.startsWith('http') ? endpointRaw : `https://${endpointRaw}`;
  return {
    bucket,
    endpoint,
    client: new AwsClient({ accessKeyId: keyId, secretAccessKey: appKey, service: 's3', region: REGION }),
  };
}

/** Stores bytes privately and returns the key they were stored under. */
export async function putPrivate(key: string, body: ArrayBuffer, contentType: string): Promise<string> {
  const cfg = b2();
  if (!cfg) throw new Error('B2 storage is not configured.');
  const res = await cfg.client.fetch(`${cfg.endpoint}/${cfg.bucket}/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!res.ok) throw new Error(`B2 upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return key;
}

/** A link that plays the file and then stops working. */
export async function signedUrl(key: string): Promise<string> {
  const cfg = b2();
  if (!cfg) throw new Error('B2 storage is not configured.');
  const signed = await cfg.client.sign(`${cfg.endpoint}/${cfg.bucket}/${key}`, {
    method: 'GET',
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function deleteObject(key: string): Promise<void> {
  const cfg = b2();
  if (!cfg) return;
  await cfg.client.fetch(`${cfg.endpoint}/${cfg.bucket}/${key}`, { method: 'DELETE' }).catch(() => {});
}
