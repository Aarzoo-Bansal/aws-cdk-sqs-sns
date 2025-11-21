import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as iam from 'aws-cdk-lib/aws-iam'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { Construct } from 'constructs'

interface LoggingStackProps extends cdk.StackProps {
    queue : sqs.Queue
}

export class LoggingStack extends cdk.Stack {
    public readonly loggingLambda: lambda.Function
    public readonly logGroupName: string

    constructor(scope: Construct, id: string, props: LoggingStackProps) {
        super(scope, id, props)

        /***********************************************************************************************************************************/   
        // Creating the lambda function
        this.loggingLambda = new lambda.Function(this, 'Assignment4LoggingFunction', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/logging'),
            timeout: cdk.Duration.seconds(60)
        })

        /***********************************************************************************************************************************/   
        // The log group name
        this.logGroupName = `aws/;ambda/${this.loggingLambda.functionName}`

        /***********************************************************************************************************************************/   
        // Adding SQS event source
        this.loggingLambda.addEventSource(new SqsEventSource(props.queue, {
            batchSize: 10
        }))

        /***********************************************************************************************************************************/   
        // Granting permisions
        props.queue.grantConsumeMessages(this.loggingLambda)

        this.loggingLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'logs:FilterLogEvents',
                'logs:DescribingLogStreams'
            ],
            resources: ['*']
        }))
    }
}