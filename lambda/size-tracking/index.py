import json
import boto3
import os
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def handler(event, context):
    """
    Processes SQS messages containing S3 events
    For each event, computes total bucket size and stores in DynamoDB
    """

    for record in event['Records']:
        # Parse SQS message body
        body = json.loads(record['body'])

        # SNS warps the S3 event in a Message Field
        message = json.loads(body['Message'])

        # Process S3 event
        for s3_record in message['Records']:
            event_name = s3_record['eventName']
            key = s3_record['s3']['object']['key']
            bucket_name = s3_record['s3']['bucket']['name']

            print(f'Processing S3 event: {event_name} for bucket: {bucket_name} , object {key}')

            # Compute the total bucket size
            total_size, object_count = compute_bucket_size(bucket_name)

            # Store aggregate data in DynamoDB
            timestamp = int(datetime.now().timestamp())

            table.put_item(Item={
                'bucket_name' : bucket_name,
                'timestamp' : timestamp,
                'total_size' : total_size,
                'object_count' : object_count,
                'record_type' : 'SIZE_RECORD'
            })

            print(f'Stored: bucket={bucket_name}, size={total_size} bytes, count={object_count}, timestamp={timestamp}')

        return {'statusCode': 200}

    def compute_bucket_size(bucket_name):
        """
        Calculate the total size and count of all objects in the bucket
        """

        total_size = 0
        object_count = 0

        paginator = s3.get_paginator('list_objects_v2')

        for page in paginator.paginate(Bucket=bucket_name):
            if 'Contents' in page:
                for obj in page['Contents']:
                    total_size += obj['Size']
                    object_count += 1
        
        return total_size, object_count
