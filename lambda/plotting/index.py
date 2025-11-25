import boto3
import os
import time
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io

def handler(event, context):
    """
    Plot graph of bucket size over time
    """
    s3_client = boto3.client('s3')
    dynamodb_client = boto3.client('dynamodb')

    # Get environment variables
    s3_bucket_name = os.environ['BUCKET_NAME']
    table_name = os.environ['TABLE_NAME']
    index_name = 'AllBucketsIndex'

    current_time = int(time.time())
    ten_seconds_ago = current_time - 10

    # Query ALL data for this bucket
    response = dynamodb_client.query(
        TableName=table_name,
        KeyConditionExpression='bucket_name = :bucket AND #ts >= :time_threshold',
        ExpressionAttributeNames={
            '#ts': 'timestamp'
        },
        ExpressionAttributeValues={
            ':bucket': {'S': s3_bucket_name},
            ':time_threshold': {'N': str(ten_seconds_ago)}
        }
    )

    # Extract data
    timestamps = []
    sizes = []

    for item in response['Items']:
        timestamps.append(int(item['timestamp']['N']))
        sizes.append(int(item['total_size']['N']))

    print(f"Found {len(timestamps)} data points")

    # Query index for max size
    index_response = dynamodb_client.query(
        TableName=table_name,
        IndexName=index_name,
        KeyConditionExpression='record_type = :rt',
        ExpressionAttributeValues={
            ':rt': {'S': 'SIZE_RECORD'}
        },
        ScanIndexForward=False,
        Limit=1
    )

    max_size = int(index_response['Items'][0]['total_size']['N']) if index_response['Items'] else 0
    print(f"Max size: {max_size}")

    # Create plot
    plt.figure(figsize=(10, 6))

    if timestamps:
        plt.plot(timestamps, sizes, marker='o', label='Bucket Size Over Time')

    plt.axhline(y=max_size, color='r', linestyle='--', label=f'Max Size Ever: {max_size} bytes')

    plt.xlabel('Timestamp (seconds)')
    plt.ylabel('Size (bytes)')
    plt.title('S3 Bucket Size Over Time')
    plt.legend()
    plt.grid(True)

    # Save to buffer
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)

    # Upload to S3
    s3_client.put_object(
        Bucket=s3_bucket_name,
        Key='plot.png',
        Body=buffer,
        ContentType='image/png'
    )

    print(f"Plot uploaded to {s3_bucket_name}/plot.png")

    return {
        'statusCode': 200,
        'body': 'Plot generated and saved to S3'
    }