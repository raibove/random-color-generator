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

// 3. Upload static files from local directory (without public-read ACL)
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

crawlDir(webDir, (filePath: string) => {
  const relativeFilePath = path.relative(webDir, filePath).replace(/\\/g, "/");

  new aws.s3.BucketObject(relativeFilePath, {
    bucket: bucket.id,
    source: new pulumi.asset.FileAsset(filePath),
    contentType: lookup(filePath) || undefined,
  }, { dependsOn: publicAccessBlock });
});

// 4. Create CloudFront Distribution (with OAI for secure access)
const oai = new aws.cloudfront.OriginAccessIdentity("oai", {
  comment: "OAI for secured S3 access",
});

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
    allowedMethods: ["GET", "HEAD"],
    cachedMethods: ["GET", "HEAD"],
    forwardedValues: {
      queryString: false,
      cookies: { forward: "none" },
    },
  },
  priceClass: "PriceClass_100", // Use PriceClass_100 for lower-cost edge locations
  viewerCertificate: {
    cloudfrontDefaultCertificate: true,
  },
  restrictions: {
    geoRestriction: {
      restrictionType: "none", // No restrictions on country access
    },
  },
});

// 5. Export bucket name and CloudFront URL
export const bucketName = bucket.bucket;
export const cloudfrontUrl = pulumi.interpolate`https://${cloudfrontDistribution.domainName}`;
