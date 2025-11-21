import json
import os
import boto3
from datetime import datetime

logs_client = boto3.client('logs')

def handler(event, context):
    """
    Logs S3 event in JSON Format
    - Creation: {"object_name" : "file_txt", "size_delta" : 90}
    - Deletion: {"object_name" : "file_txt", "size_delta" : -74}
    """

    log_group_name = context.log_group_name

    for record in event['Records']:
        # Parse SQS Message body
        body = json.loads(record['body'])

        # SNS wraps the S3 event in a Message field
        message = json.loads(body['Message'])

        for s3_record in message['Record']:
            event_name = s3_record['eventName']
            object_name = s3_record['s3']['object']['key']

            if 'ObjectCreated' in event_name:
                size = s3_record['s3']['object']['size']
                log_entry  = {
                    "object_name": object_name,
                    "size_delta": size
                }
                print(json.dumps(log_entry))
            
            elif 'ObjectRemoved' in event_name:
                size = find_object_size_from_logs(log_group_name, object_name)
                log_entry = {
                    "object_name" : object_name,
                    "size_delta" : size
                }
                print(json.dumps(log_entry))
        
        return {'statusCode' : 200}
    
def find_object_size_from_logs(log_group_name, object_name):
    """
    Search CloudWatch Logs for the creation event of the object to find its size
    """

    try:
        response = logs_client.filter_log_events(
            logGroupName=log_group_name,
            filterPattern=f'"{object_name}"',
            limit=100
        )

        # Parse through the events to find the creation log
        for event in response['events']:
            message = event['message']
            try:
                log_data = json.loads(message)
                if log_data.get('object_name') == object_name and log_data.get('size_delta', 0) > 0:
                    return log_data['size_delta']
            except:
                continue
        
        print(f"Warning: Could not find creation log for {object_name}")
        return 0
    
    except Exception as e:
        print(f"Error searching logs: {e}")
        return 0

