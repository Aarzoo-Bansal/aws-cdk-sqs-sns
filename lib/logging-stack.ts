import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';  // ADD THIS
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

interface LoggingStackProps extends cdk.StackProps {
  queue: sqs.Queue;
}

export class LoggingStack extends cdk.Stack {
  public readonly loggingLambda: lambda.Function;
  public readonly logGroup: logs.LogGroup;  // CHANGE THIS from logGroupName

  constructor(scope: Construct, id: string, props: LoggingStackProps) {
    super(scope, id, props);

    // Explicitly create log group FIRST
    this.logGroup = new logs.LogGroup(this, 'LoggingLambdaLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,  // Adjust as needed
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda function
    this.loggingLambda = new lambda.Function(this, 'LoggingFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/logging'),
      timeout: cdk.Duration.seconds(60),
      logGroup: this.logGroup,  // Use the log group we created
    });

    // Rest of the code stays the same...
    this.loggingLambda.addEventSource(new SqsEventSource(props.queue, {
      batchSize: 10,
    }));

    props.queue.grantConsumeMessages(this.loggingLambda);
    
    this.loggingLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'logs:FilterLogEvents',
        'logs:DescribeLogStreams'
      ],
      resources: ['*'],
    }));
  }
}