#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { Assignment4Stack } from '../lib/assignment-4-stack';
import { StorageStack } from '../lib/storage-stack';
import { SizeTrackingStack } from '../lib/size-tracking-stack';
import { table } from 'console';


const app = new cdk.App();

const storageStack = new StorageStack(app, 'Assignment4StorageStack', {
  description: 'S3, SNS, SQS, and DynamoDB for Assignment 4'
})

const sizeTrackingStack = new SizeTrackingStack(app, 'Assignment4SizeTrackingStack', {
  queue: storageStack.messageQueueForSizeTracking,
  table: storageStack.dynamoDbTable,
  bucket: storageStack.s3Bucket
})



