import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import { Construct } from 'constructs'


export class StorageStack extends cdk.Stack {
    public readonly s3Bucket : s3.Bucket
    public readonly dynamoDbTable : dynamodb.Table
    public readonly messageQueueForSizeTracking : sqs.Queue
    public readonly messageQueueForLogging : sqs.Queue
    public readonly indexName: 'ALllBucketsIndex'

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props)

        /***********************************************************************************************************************************/   
        // Creating the S3 Bucket
        this.s3Bucket = new s3.Bucket(this, 'Assignment4TestBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true, // added to be able to delete objects when we are trying to delete the bucket      
        })

        /***********************************************************************************************************************************/
        // Creating a dynamo db table
        this.dynamoDbTable = new dynamodb.Table(this, 'Assignment4SizeTrackingTable', {
            partitionKey : {
                name : 'bucket_name',
                type: dynamodb.AttributeType.STRING
            },

            sortKey: {
                name: 'timestamp',
                type: dynamodb.AttributeType.NUMBER
            },

            removalPolicy: cdk.RemovalPolicy.DESTROY
        })

        this.dynamoDbTable.addGlobalSecondaryIndex({
            indexName: 'AllBucketsIndex',

            partitionKey: {
                name: 'record_type', 
                type: dynamodb.AttributeType.STRING
            },

            sortKey: {
                name: 'total_size', 
                type: dynamodb.AttributeType.NUMBER
            },

            projectionType: dynamodb.ProjectionType.ALL
        })

        /***********************************************************************************************************************************/
        // Creating SNS Topic
        const topic = new sns.Topic(this, 'S3EventTopic', {
            displayName : "S3 Event Fanout Topic"
        })

        /***********************************************************************************************************************************/
        // Creating SQS Queue
        this.messageQueueForSizeTracking = new sqs.Queue(this, 'Assignment4SizeTrackingQueue', {
            visibilityTimeout: cdk.Duration.seconds(300) // setting the time to 5 minutes for now
        })

        this.messageQueueForLogging = new sqs.Queue(this, 'Assignment4LoggingQueue', {
            visibilityTimeout: cdk.Duration.seconds(300)
        })

        /***********************************************************************************************************************************/
        // Subscribing queues to SNS topics
        topic.addSubscription(
            new snsSubscriptions.SqsSubscription(this.messageQueueForSizeTracking)
        )

        topic.addSubscription(
            new snsSubscriptions.SqsSubscription(this.messageQueueForLogging)
        )

        /***********************************************************************************************************************************/
        // Configuring S3 to send events to SNS topic
        // Send object created notification to SNS Topic
        this.s3Bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.SnsDestination(topic)
        )

        // Send object deletion notification to SNS Topic
        this.s3Bucket.addEventNotification(
            s3.EventType.OBJECT_REMOVED,
            new s3n.SnsDestination(topic)
        )
    }
}

