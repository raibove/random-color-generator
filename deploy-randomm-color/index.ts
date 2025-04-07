import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as path from "path";
import { lookup } from "mime-types";

// 1. Create S3 bucket (no public access)
const bucket = new aws.s3.Bucket("idiot-bucket", {
  website: {
    indexDocument: "index.html",
  },
});

// 2. Block public access to S3 bucket
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
  bucket: bucket.id,
  blockPublicAcls: true,  // Block all public ACLs
  blockPublicPolicy: true, // Block all public policies
  restrictPublicBuckets: true,
  ignorePublicAcls: true,
});

// 3. Create CloudFront Origin Access Identity (OAI) for secure access
const oai = new aws.cloudfront.OriginAccessIdentity("oai", {
  comment: "OAI for secured S3 access",
});

// 4. Add Bucket Policy for CloudFront OAI access
const bucketPolicy = new aws.s3.BucketPolicy("bucket-policy", {
  bucket: bucket.id,
  policy: pulumi.all([bucket.bucket, oai.iamArn]).apply(([bucketName, iamArn]) => {
    return JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: iamArn },
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    });
  }),
});

// 5. Upload static files from local directory (without public-read ACL)
const webDir = "../out";

function crawlDir(dir: string, callback: (filePath: string) => void) {
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      crawlDir(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}

// Make sure our uploads wait for both the publicAccessBlock and bucketPolicy
const uploadDependencies = [publicAccessBlock, bucketPolicy];

// Upload files with proper dependencies
crawlDir(webDir, (filePath: string) => {
  const relativeFilePath = path.relative(webDir, filePath).replace(/\\/g, "/");

  new aws.s3.BucketObject(relativeFilePath, {
    bucket: bucket.id,
    source: new pulumi.asset.FileAsset(filePath),
    contentType: lookup(filePath) || undefined,
  }, { dependsOn: uploadDependencies });
});

// 6. Create CloudFront Distribution (with OAI for secure access)
const cloudfrontDistribution = new aws.cloudfront.Distribution("web-distribution", {
  enabled: true,
  origins: [{
    originId: bucket.id,
    domainName: bucket.bucketRegionalDomainName,
    s3OriginConfig: {
      originAccessIdentity: oai.cloudfrontAccessIdentityPath,
    },
  }],
  defaultCacheBehavior: {
    targetOriginId: bucket.id,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    forwardedValues: {
      queryString: false,
      cookies: { forward: "none" },
    },
    minTtl: 0,
    defaultTtl: 3600,
    maxTtl: 86400,
  },
  defaultRootObject: "index.html",
  // Custom error response to handle SPA routing
  customErrorResponses: [
    {
      errorCode: 403,
      responseCode: 200,
      responsePagePath: "/index.html",
    },
    {
      errorCode: 404,
      responseCode: 200,
      responsePagePath: "/index.html",
    },
  ],
  priceClass: "PriceClass_100", // Use PriceClass_100 for lower-cost edge locations
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
  restrictions: {
    geoRestriction: {
      restrictionType: "none", // No restrictions on country access
    },
  },
  // Ensure the distribution depends on the bucket policy being set
  // This explicit dependency helps avoid race conditions
}, { dependsOn: [bucketPolicy] });

// 7. Export bucket name and CloudFront URL
export const bucketName = bucket.bucket;
export const cloudfrontUrl = pulumi.interpolate`https://${cloudfrontDistribution.domainName}`;