import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources'
import { Construct } from 'constructs'

// Creating interface to accept props from storage stack
interface SizeTrackingStackProps extends cdk.StackProps {
    queue: sqs.Queue
    table: dynamodb.Table
    bucket: cdk.aws_s3.Bucket 
}

export class SizeTrackingStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: SizeTrackingStackProps) {
        super(scope, id, props)

        /***********************************************************************************************************************************/
        // Creating the lambda function
        const SizeTrackingLambda = new lambda.Function(this, 'Assignment4SizeTrackingFunction', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/size-tracking'),
            environment: {
                TABLE_NAME: props.table.tableName,
            },
            timeout: cdk.Duration.seconds(30)
        })

        /***********************************************************************************************************************************/
        // Adding SQS as event source - Lamba will poll the queue
        SizeTrackingLambda.addEventSource(new SqsEventSource(props.queue, {
            batchSize: 10 // Can process upto 10 messages at once
        }))

        /***********************************************************************************************************************************/
        // granting permissions
        props.table.grantReadWriteData(SizeTrackingLambda)
        props.queue.grantConsumeMessages(SizeTrackingLambda)
        props.bucket.grantRead(SizeTrackingLambda)
    }
}
