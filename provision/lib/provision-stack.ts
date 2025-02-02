import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket} from "aws-cdk-lib/aws-s3";
import {DnsValidatedCertificate} from "aws-cdk-lib/aws-certificatemanager";
import {Distribution, ViewerProtocolPolicy} from "aws-cdk-lib/aws-cloudfront";
import {S3StaticWebsiteOrigin} from "aws-cdk-lib/aws-cloudfront-origins";
import {ARecord, HostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {PolicyStatement, ServicePrincipal} from "aws-cdk-lib/aws-iam";

export class ProvisionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = 'dakotawashok.io';

    // S3 Bucket for static website
    const websiteBucket = new Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: '404.html',
      publicReadAccess: false, // CloudFront will handle access
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      bucketName: `dakotawashokio-bucket-${this.account}-${this.region}`,
    });

    // Route53 Hosted Zone
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'MyHostedZone', {
      hostedZoneId: 'Z25D72DT59KEG9',
      zoneName: 'dakotawashok.io',
    });

    // CloudFront Distribution
    const certificate = new DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName: domainName,
      hostedZone: hostedZone,
      region: 'us-east-1',
    });

    const distribution = new Distribution(this, 'WebsiteDistribution', {
      defaultRootObject: 'index.html',
      domainNames: [domainName],
      certificate: certificate,
      defaultBehavior: {
        origin: new S3StaticWebsiteOrigin(websiteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    websiteBucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${websiteBucket.bucketArn}/*`],
        principals: [new ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': 'arn:aws:cloudfront::757679872496:distribution/E31O773N0YU99E',
          },
        },
      })
    );

    distribution.node.addDependency(certificate);

    // Route53 Alias Record for CloudFront
    new ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

  }
}