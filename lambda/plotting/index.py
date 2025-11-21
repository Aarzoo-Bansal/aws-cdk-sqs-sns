import json
import boto3
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import os

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

table_name = os.environ['TABLE_NAME']
bucket_name = os.environ['BUCKET_NAME']
index_name = os.environ['INDEX_NAME']

table = dynamodb.Table(table_name)

def handler(event, context):
    """
    Generate plot of bucket size over last 10 seconds + max size line.
    Save plot to S3.
    """
    print("Plotting Lambda triggered")
    
    try:
        # Query data for last 10 seconds
        now = int(datetime.now().timestamp())
        ten_seconds_ago = now - 10
        
        response = table.query(
            KeyConditionExpression='bucket_name = :bucket AND #ts > :start_time',
            ExpressionAttributeNames={'#ts': 'timestamp'},
            ExpressionAttributeValues={
                ':bucket': bucket_name,
                ':start_time': ten_seconds_ago
            }
        )
        
        items = response['Items']
        print(f"Found {len(items)} data points in last 10 seconds")
        
        # Query GSI for maximum size ever recorded
        max_size = get_max_size()
        print(f"Maximum size ever: {max_size}")
        
        # Generate plot
        plot_path = '/tmp/plot.png'
        generate_plot(items, max_size, plot_path)
        
        # Upload to S3
        s3.upload_file(plot_path, bucket_name, 'plot.png')
        print("Plot uploaded to S3")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Plot generated successfully',
                'data_points': len(items),
                'max_size': max_size,
                'plot_location': f's3://{bucket_name}/plot.png'
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def get_max_size():
    """
    Query GSI to find maximum total_size across all buckets.
    """
    try:
        response = table.query(
            IndexName=index_name,
            KeyConditionExpression='record_type = :type',
            ExpressionAttributeValues={':type': 'SIZE_RECORD'},
            ScanIndexForward=False,  # Sort descending by total_size
            Limit=1
        )
        
        if response['Items']:
            return response['Items'][0]['total_size']
        return 0
    except Exception as e:
        print(f"Error getting max size: {e}")
        return 0

def generate_plot(items, max_size, output_path):
    """
    Create matplotlib plot of bucket size over time.
    """
    if not items:
        print("No data to plot, creating empty plot")
        plt.figure(figsize=(10, 6))
        plt.title('Bucket Size Over Time (Last 10 Seconds)')
        plt.xlabel('Time')
        plt.ylabel('Size (bytes)')
        plt.text(0.5, 0.5, 'No data available', ha='center', va='center')
        plt.savefig(output_path)
        plt.close()
        return
    
    # Sort by timestamp
    items_sorted = sorted(items, key=lambda x: x['timestamp'])
    
    # Extract data
    timestamps = [datetime.fromtimestamp(item['timestamp']) for item in items_sorted]
    sizes = [item['total_size'] for item in items_sorted]
    
    # Create plot
    plt.figure(figsize=(10, 6))
    plt.plot(timestamps, sizes, marker='o', linestyle='-', label='Bucket Size')
    
    # Add max size line
    if max_size > 0:
        plt.axhline(y=max_size, color='r', linestyle='--', label=f'Max Size Ever: {max_size} bytes')
    
    plt.title('Bucket Size Over Time (Last 10 Seconds)')
    plt.xlabel('Time')
    plt.ylabel('Size (bytes)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    plt.savefig(output_path)
    plt.close()
    
    print(f"Plot saved to {output_path}")