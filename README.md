# 🎨 Random Color Generator

A lightweight, fun static web app built with **Next.js** that displays a new random background color on every page load. This project also showcases how to deploy static websites to AWS using **Pulumi** and **infrastructure as code** principles.

---

## 🚀 Live Demo

👉 [View Live Demo](https://dtdysydbnr00s.cloudfront.net/)

---

## 📁 Project Structure

- **`/app`** – The main Next.js app (exported as static HTML)
- **`Pulumi/`** – Infrastructure code to deploy to AWS S3 + CloudFront using Pulumi (in TypeScript)

---

## 📸 Preview

![Color Generator Screenshot](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/jjo0zssgq8qustq1xafv.png)

---

## ⚙️ How It Works

Each time you refresh the page, the background color changes randomly using a `generateRandomColor()` function in JavaScript. The app was statically exported using `next export` and deployed securely using AWS services via Pulumi.

---

## 🛠️ Deployment Using Pulumi

The infrastructure is defined in TypeScript and includes:

### 1. **S3 Bucket (Private)**
- Hosts the exported static site.
- Blocked public access.
- Configured using `BucketV2` and `BucketWebsiteConfigurationV2`.

### 2. **CloudFront Distribution**
- Serves content from S3 securely.
- Uses Origin Access Identity (OAI) to restrict S3 access.
- Enforces HTTPS.
- Handles 403 and 404 errors by falling back to `index.html`.

### 3. **Pulumi Features**
- Modular and readable IaC setup.
- Uses Pulumi Copilot suggestions (refined manually).
- Recursive file upload using `BucketObject`.

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/raibove/random-color-generator.git
cd random-color-generator
```

### 2. Install Dependencies

```
npm install
```

### 3. Export the Next.js App
```
npm run build
npm run export
```

This creates a static version of your site in the out/ folder.

# 🧱 Deploy to AWS Using Pulumi

## Prerequisites

- AWS credentials configured (`aws configure`)
- Pulumi CLI installed
- Node.js installed

---

## 1. Install Pulumi Dependencies

```bash
cd pulumi
npm install
```

### 2. Preview the Stack

```bash
pulumi preview
```

### 3. Deploy
```bash
pulumi up
```

Pulumi will:

* Create an S3 bucket and CloudFront distribution
* Upload your static files
* Print the CloudFront domain URL

### 🔐 Secure Access with OAI
The app is served via CloudFront with an Origin Access Identity (OAI) so that:

* The S3 bucket remains private
* Only CloudFront can fetch the content

✅ This avoids making the bucket publicly accessible while keeping the site fast and secure

# 🧹 Refactoring Highlights

✅ **Switched from `Bucket` to `BucketV2`** for future-proofing  
✅ **Used `BucketWebsiteConfigurationV2`** for clear separation of concerns  
✅ **Integrated OAI cleanly** with predictable policies  
✅ **Simplified file uploads** with better privacy and organization  

---

## 🤖 Using Pulumi Copilot

**Prompts used:**
- `"Deploy a static site to AWS using S3 and CloudFront with Pulumi in TypeScript."`
- `"How do I make sure S3 is only accessible through CloudFront?"`
- `"How to configure custom error responses for a single page app?"`

Pulumi Copilot provided helpful scaffolding, but manual refactoring ensured a **clean and modular setup**.

---

## 🔄 What’s Next

📌 **Automate the deployment using GitHub Actions**:
- Trigger `pulumi up` on push to `main`
- Manage secrets using GitHub Secrets
- Set up multiple stacks (e.g., `dev`, `prod`) for staging and production environments

---

## 📚 Learnings

- S3 and CloudFront can serve static sites **securely and efficiently**
- Pulumi allows writing infrastructure in **real code (TypeScript!)**, making it **readable and maintainable**
- Understanding AWS resource relationships (OAI, policies) helps **avoid common pitfalls**
- `BucketV2` and modular Pulumi setup = **cleaner, future-ready IaC**
