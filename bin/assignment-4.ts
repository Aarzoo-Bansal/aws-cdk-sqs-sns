#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { StorageStack } from '../lib/storage-stack';
import { SizeTrackingStack } from '../lib/size-tracking-stack';
import { LoggingStack } from '../lib/logging-stack';
import { MonitoringCleanerStack } from '../lib/monitoring-cleaner-stack';
import { PlottingStack } from '../lib/plotting-stack';
import { DriverStack } from '../lib/driver-stack';

const app = new cdk.App();

const storageStack = new StorageStack(app, 'Assignment4StorageStack', {
  description: 'S3, SNS, SQS, and DynamoDB for Assignment 4'
})

const sizeTrackingStack = new SizeTrackingStack(app, 'Assignment4SizeTrackingStack', {
  description: 'Lambda to track total bucket size',
  queue: storageStack.messageQueueForSizeTracking,
  table: storageStack.dynamoDbTable,
  bucket: storageStack.s3Bucket
})

const loggingStack = new LoggingStack(app, 'Assignment4LoggingStack', {
  description: 'Lambda to log S3 events in JSON Format',
  queue: storageStack.messageQueueForLogging
})

const monitoringCleanerStack = new MonitoringCleanerStack(app, 'Assignment4MonitoringCleanerStack', {
  description: 'CloudWatch monitoring and cleaner Lambda',
  logGroupName: loggingStack.logGroupName,
  bucket: storageStack.s3Bucket
});

const plottingStack = new PlottingStack(app, 'Assignment4PlottingStack', {
  description: 'Lambda to generate bucket size plot',
  table: storageStack.dynamoDbTable,
  bucket: storageStack.s3Bucket,
  indexName: storageStack.indexName
});

const driverStack = new DriverStack(app, 'Assignment4DriverStack', {
  description: 'Driver Lambda to test the system',
  bucket: storageStack.s3Bucket,
  plottingApi: plottingStack.api
});


sizeTrackingStack.addDependency(storageStack)
loggingStack.addDependency(storageStack)


