import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

interface DriverStackProps extends cdk.StackProps {
  bucket: s3.Bucket;
  plottingApi: apigateway.LambdaRestApi;
}

export class DriverStack extends cdk.Stack {
  public readonly driverLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: DriverStackProps) {
    super(scope, id, props);

    /***********************************************************************************************************************************/
    // Create Driver Lambda
    this.driverLambda = new lambda.Function(this, 'DriverFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/driver'),
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
        PLOTTING_API_URL: props.plottingApi.url,
      },
      timeout: cdk.Duration.minutes(5), // Needs time for sleeps and alarm triggers
    });

    /***********************************************************************************************************************************/
    // Grant permissions to write to S3
    props.bucket.grantWrite(this.driverLambda);
    props.bucket.grantDelete(this.driverLambda); // In case we need to cleanup

    /***********************************************************************************************************************************/
    new cdk.CfnOutput(this, 'DriverLambdaName', {
      value: this.driverLambda.functionName,
      description: 'Driver Lambda function name (invoke manually)',
    });
  }
}