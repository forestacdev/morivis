# morivis AWS CDK

AWS CDK stack for serving morivis static assets via S3 + CloudFront.

## Resources

- **S3 Bucket** — Origin for static assets (`data/assets/`)
- **CloudFront Distribution** — CDN delivery
- **BucketDeployment** — Lambda that uploads `data/assets/` to S3

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure AWS CLI

Make sure the AWS CLI is configured and ready to use.

- [Configuring the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)

### 3. Create cdk.context.json (if you have existing resources)

If you already have an S3 bucket and CloudFront distribution, copy the example file and fill in your values.

```bash
cp cdk.context.json.example cdk.context.json
```

```json
{
  "existing:bucketName": "your-s3-bucket-name",
  "existing:distributionId": "YOUR_CLOUDFRONT_DISTRIBUTION_ID",
  "existing:distributionDomainName": "xxxx.cloudfront.net"
}
```

If you have no existing resources, skip this step — new resources will be created on first deploy.

## Deploy

### First time only: bootstrap

```bash
pnpm exec cdk bootstrap
```

### Preview changes

```bash
pnpm run diff
```

### Deploy

```bash
pnpm run deploy
```

After deploying, set the `CloudFrontUrl` output value as `PUBLIC_BASE_PATH` in `frontend/.env.production`.

## Upload Assets Only (faster)

Run from the `data/` directory instead of going through CDK.

```bash
cd ../data
pnpm run deploy
```
