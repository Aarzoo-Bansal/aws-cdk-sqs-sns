import json
import boto3
import os

s3 = boto3.client('s3')
bucket_name = os.environ['BUCKET_NAME']

def handler(event, context):
    """
    Triggered by CloudWatch Alarm.
    Deletes the largest ASSIGNMENT object from the bucket (excludes plot.png).
    """
    print(f"Cleaner Lambda triggered. Event: {json.dumps(event)}")
    
    try:
        # List all objects in the bucket
        response = s3.list_objects_v2(Bucket=bucket_name)
        
        if 'Contents' not in response or len(response['Contents']) == 0:
            print("No objects in bucket to delete")
            return {'statusCode': 200, 'body': 'No objects to delete'}
        
        # Filter to only assignment files (exclude plot.png)
        assignment_files = [
            obj for obj in response['Contents'] 
            if obj['Key'].startswith('assignment') and obj['Key'].endswith('.txt')
        ]
        
        if not assignment_files:
            print("No assignment files to delete")
            return {'statusCode': 200, 'body': 'No assignment files to delete'}
        
        # Find the largest assignment file
        largest_object = max(assignment_files, key=lambda x: x['Size'])
        largest_key = largest_object['Key']
        largest_size = largest_object['Size']
        
        print(f"Deleting largest assignment file: {largest_key} (size: {largest_size} bytes)")
        
        # Delete the largest object
        s3.delete_object(Bucket=bucket_name, Key=largest_key)
        
        print(f"Successfully deleted {largest_key}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'deleted_object': largest_key,
                'size': largest_size
            })
        }
        
    except Exception as e:
        print(f"Error in Cleaner Lambda: {str(e)}")
        raise e