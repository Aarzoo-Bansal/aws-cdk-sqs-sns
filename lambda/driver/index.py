import json
import boto3
import os
import time
import urllib3

s3 = boto3.client('s3')
bucket_name = os.environ['BUCKET_NAME']
plotting_api_url = os.environ['PLOTTING_API_URL']

http = urllib3.PoolManager()

def handler(event, context):
    """
    Driver Lambda that creates and deletes objects to test the system.
    """
    print("Driver Lambda started")
    
    try:
        # Step 1: Create assignment1.txt (19 bytes)
        print("Step 1: Creating assignment1.txt")
        s3.put_object(
            Bucket=bucket_name,
            Key='assignment1.txt',
            Body='Empty Assignment 1'
        )
        print("Created assignment1.txt (19 bytes)")
        time.sleep(5)  # Wait for processing
        
        # Step 2: Create assignment2.txt (28 bytes)
        # Total size will be 47 bytes, alarm should fire
        print("Step 2: Creating assignment2.txt")
        s3.put_object(
            Bucket=bucket_name,
            Key='assignment2.txt',
            Body='Empty Assignment 2222222222'
        )
        print("Created assignment2.txt (28 bytes)")
        print("Waiting for alarm to fire and cleaner to delete assignment2.txt...")
        time.sleep(10)  # Wait for alarm and cleaner
        
        # Step 3: Create assignment3.txt (2 bytes)
        # Total size will be 21 bytes (19 + 2), alarm should fire again
        print("Step 3: Creating assignment3.txt")
        s3.put_object(
            Bucket=bucket_name,
            Key='assignment3.txt',
            Body='33'
        )
        print("Created assignment3.txt (2 bytes)")
        print("Waiting for alarm to fire and cleaner to delete assignment1.txt...")
        time.sleep(10)  # Wait for alarm and cleaner
        
        # Step 4: Call plotting API
        print("Step 4: Calling plotting API")
        response = http.request('GET', plotting_api_url)
        print(f"Plotting API response: {response.status}")
        print(f"Response body: {response.data.decode('utf-8')}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Driver completed successfully',
                'plotting_api_response': response.data.decode('utf-8')
            })
        }
        
    except Exception as e:
        print(f"Error in Driver Lambda: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }