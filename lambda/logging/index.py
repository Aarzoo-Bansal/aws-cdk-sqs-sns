import json
import os
import boto3
from datetime import datetime

logs_client = boto3.client('logs')

def handler(event, context):
    """
    Logs S3 event in JSON Format
    """
    log_group_name = context.log_group_name

    for record in event['Records']:
        # Parse SQS Message body
        body = json.loads(record['body'])
        
        # DEBUG: Print to see structure
        print(f"DEBUG - SQS Body keys: {body.keys()}")

        # SNS wraps the S3 event in a Message field
        message = json.loads(body['Message'])
        
        # DEBUG: Print message structure
        print(f"DEBUG - SNS Message keys: {message.keys()}")
        
        # Check if 'Records' exists (skip test notifications)
        if 'Records' not in message:
            print(f"Skipping test notification. Available keys: {list(message.keys())}")
            continue

        for s3_record in message['Records']:
            event_name = s3_record['eventName']
            object_name = s3_record['s3']['object']['key']

            if 'ObjectCreated' in event_name:
                size = s3_record['s3']['object']['size']
                log_entry = {
                    "object_name": object_name,
                    "size_delta": size
                }
                print(json.dumps(log_entry))
            
            elif 'ObjectRemoved' in event_name:
                size = find_object_size_from_logs(log_group_name, object_name)
                log_entry = {
                    "object_name": object_name,
                    "size_delta": -size  # Negative for deletions!
                }
                print(json.dumps(log_entry))
    
    # FIXED: Return is now at the correct indentation level
    return {'statusCode': 200}
    
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