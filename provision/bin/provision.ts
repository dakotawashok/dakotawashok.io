#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProvisionStack } from '../lib/provision-stack';

const app = new cdk.App();

const websiteAccount = '757679872496';

new ProvisionStack(app, 'ProvisionStack', {
  env: { account: websiteAccount, region: process.env.CDK_DEFAULT_REGION },
});