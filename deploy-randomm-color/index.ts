import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as path from "path";

// 1. Create S3 bucket using BucketV2
const bucket = new aws.s3.BucketV2("static-website-bucket", {});

// 2. Create website configuration for the bucket
const websiteConfig = new aws.s3.BucketWebsiteConfigurationV2("website-config", {
  bucket: bucket.id,
  indexDocument: {
    suffix: "index.html",
  },
});

// 3. Block public access to S3 bucket
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
  bucket: bucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  restrictPublicBuckets: true,
  ignorePublicAcls: true,
});

// 4. Create CloudFront Origin Access Identity (OAI)
const oai = new aws.cloudfront.OriginAccessIdentity("pulumi-oai", {
  comment: `Access Identity for static website`,
});

// 5. Add Bucket Policy for CloudFront OAI access
const bucketPolicy = new aws.s3.BucketPolicy("pulumi-bucket-policy", {
  bucket: bucket.id,
  policy: pulumi.all([bucket.id, oai.iamArn]).apply(([bucketName, iamArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: { AWS: iamArn },
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucketName}/*`,
      }],
    })
  ),
});

// 6. Helper function to get MIME type for files
function getMimeType(file: string) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "application/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".ico")) return "image/x-icon";
  if (file.endsWith(".txt")) return "text/plain";
  if (file.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";  // Default binary type
}

// 7. Upload files from local directory
const webDir = "../out";

function uploadFiles(dir: string, prefix: string = "") {
  for (const item of fs.readdirSync(dir)) {
    const filePath = path.join(dir, item);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Recursively upload files in subdirectories
      uploadFiles(filePath, path.join(prefix, item));
    } else {
      // Upload file with correct path structure
      const relativePath = path.join(prefix, item).replace(/\\/g, "/");

      new aws.s3.BucketObject(relativePath, {
        bucket: bucket.id,
        source: new pulumi.asset.FileAsset(filePath),
        contentType: getMimeType(filePath),
      });
    }
  }
}

// Upload all files
uploadFiles(webDir);

// 8. Create CloudFront Distribution
const distribution = new aws.cloudfront.Distribution("pulumi-cdn", {
  enabled: true,
  defaultRootObject: "index.html",
  // Define origins (where CloudFront gets content from)
  origins: [{
    originId: "s3-website-origin",
    domainName: bucket.bucketRegionalDomainName,
    s3OriginConfig: {
      originAccessIdentity: oai.cloudfrontAccessIdentityPath,
    },
  }],
  // Default behavior for requests
  defaultCacheBehavior: {
    targetOriginId: "s3-website-origin",
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    forwardedValues: {
      queryString: false,
      cookies: { forward: "none" },
    },
    compress: true,
    minTtl: 0,
    defaultTtl: 3600,
    maxTtl: 86400,
  },
  // Support for Single Page Applications (SPAs)
  customErrorResponses: [
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html",
    },
  ],
  priceClass: "PriceClass_100", // Use cost-effective edge locations
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
});

// 9. Export bucket name and CloudFront URL for easy access
export const bucketName = bucket.id;
export const bucketWebsiteEndpoint = websiteConfig.websiteEndpoint;
export const cloudfrontUrl = pulumi.interpolate`https://${distribution.domainName}`;