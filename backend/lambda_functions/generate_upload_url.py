import json
import boto3
import uuid
import os
from datetime import datetime

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Get from environment variables
BUCKET_NAME = os.environ.get('UPLOAD_BUCKET', 'contractguard-uploads-YOUR_ACCOUNT_ID')
TABLE_NAME = os.environ.get('TABLE_NAME', 'ContractAnalyses')

def lambda_handler(event, context):
    """Generate pre-signed S3 upload URL"""
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        file_name = body.get('fileName')
        file_type = body.get('fileType', 'text/plain')
        
        if not file_name:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'fileName is required'})
            }
        
        # Generate unique contract ID
        contract_id = str(uuid.uuid4())
        s3_key = f"contracts/{contract_id}/{file_name}"
        
        # Generate pre-signed URL (valid for 5 minutes)
        upload_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key,
                'ContentType': file_type
            },
            ExpiresIn=300
        )
        
        # Store metadata in DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        table.put_item(
            Item={
                'contractId': contract_id,
                'fileName': file_name,
                's3Key': s3_key,
                'status': 'pending_upload',
                'createdAt': datetime.utcnow().isoformat()
            }
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'uploadUrl': upload_url,
                'contractId': contract_id,
                's3Key': s3_key
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
