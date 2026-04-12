import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION ?? "";
const BUCKET = process.env.AWS_S3_BUCKET_NAME ?? "";

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

/** base64 data URL を S3 にアップロードし、公開 URL を返す */
export async function uploadImageToS3(
  key: string,
  dataUrl: string
): Promise<string> {
  const [header, data] = dataUrl.split(",");
  const contentType = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
  const buffer = Buffer.from(data, "base64");

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;
}

/** S3 オブジェクトを削除する */
export async function deleteImageFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** S3 URL からオブジェクトキーを取り出す */
export function getS3KeyFromUrl(url: string): string | null {
  const prefix = `https://${BUCKET}.s3.${region}.amazonaws.com/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
