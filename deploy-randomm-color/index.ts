import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as path from "path";
import { lookup } from "mime-types";

// 1. Create S3 bucket (no ACL!)

const bucket = new aws.s3.Bucket("idiot-bucket", {
  website: {
      indexDocument: "index.html",
  },
});

const ownershipControls = new aws.s3.BucketOwnershipControls("ownership-controls", {
  bucket: bucket.id,
  rule: {
      objectOwnership: "ObjectWriter"
  }
});

const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("public-access-block", {
  bucket: bucket.id,
  blockPublicAcls: false,
});


// 4. Upload static files from local directory
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
    acl: "public-read",
  }, { dependsOn: publicAccessBlock });
});

// 5. Export bucket name and website endpoint
export const bucketName = bucket.bucket;
export const bucketWebsiteUrl = pulumi.interpolate`http://${bucket.websiteEndpoint}`;
