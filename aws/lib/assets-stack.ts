import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Construct } from 'constructs';

export interface AssetsStackProps extends cdk.StackProps {
	// 既存リソースを参照する場合に指定。未指定の場合は新規作成。
	existing?: {
		bucketName: string;
		distributionId: string;
		distributionDomainName: string;
	};
}

export class AssetsStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: AssetsStackProps) {
		super(scope, id, props);

		let assetsBucket: s3.IBucket;
		let distribution: cloudfront.IDistribution;

		if (props?.existing) {
			// 既存リソースを参照
			assetsBucket = s3.Bucket.fromBucketName(this, 'AssetsBucket', props.existing.bucketName);
			distribution = cloudfront.Distribution.fromDistributionAttributes(
				this,
				'AssetsDistribution',
				{
					distributionId: props.existing.distributionId,
					domainName: props.existing.distributionDomainName
				}
			);
		} else {
			// 新規作成
			const bucket = new s3.Bucket(this, 'AssetsBucket', {
				blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
				removalPolicy: cdk.RemovalPolicy.RETAIN,
				cors: [
					{
						allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
						allowedOrigins: ['*'],
						allowedHeaders: ['*']
					}
				]
			});
			const dist = new cloudfront.Distribution(this, 'AssetsDistribution', {
				defaultBehavior: {
					origin: origins.S3BucketOrigin.withOriginAccessControl(bucket, { originPath: '/assets' }),
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
					cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
				},
				comment: 'morivis assets データ配信'
			});
			assetsBucket = bucket;
			distribution = dist;

			new cdk.CfnOutput(this, 'AssetsBucketName', {
				value: bucket.bucketName,
				description: 'Assets S3 bucket name'
			});
			new cdk.CfnOutput(this, 'CloudFrontUrl', {
				value: `https://${dist.distributionDomainName}`,
				description: 'CloudFront URL for assets (use as PUBLIC_BASE_PATH in .env.production)'
			});
			new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
				value: dist.distributionId,
				description: 'CloudFront distribution ID'
			});
		}

		// data/assets/ 以下をアップロード
		new s3deploy.BucketDeployment(this, 'DeployAssets', {
			sources: [s3deploy.Source.asset(path.join(__dirname, '../../data/assets'))],
			destinationBucket: assetsBucket,
			destinationKeyPrefix: 'assets',
			distribution,
			distributionPaths: ['/*'],
			memoryLimit: 512
		});
	}
}
