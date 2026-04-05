#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AssetsStack } from '../lib/assets-stack';

const app = new cdk.App();

// 既存リソースがある場合は cdk.context.json で指定する（cdk.context.json.example を参照）
const existingBucket = app.node.tryGetContext('existing:bucketName');
const existingCfId = app.node.tryGetContext('existing:distributionId');
const existingCfDomain = app.node.tryGetContext('existing:distributionDomainName');
const responseHeadersPolicyId = app.node.tryGetContext('cloudfront:responseHeadersPolicyId');

const existing =
	existingBucket && existingCfId && existingCfDomain
		? {
				bucketName: existingBucket,
				distributionId: existingCfId,
				distributionDomainName: existingCfDomain
			}
		: undefined;

new AssetsStack(app, 'MorivisAssetsStack', {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: 'ap-northeast-1'
	},
	existing,
	responseHeadersPolicyId
});
