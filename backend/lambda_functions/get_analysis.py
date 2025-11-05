import json
import boto3
import os
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'ContractAnalyses')

# Helper to convert Decimal to int/float
def decimal_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError

def lambda_handler(event, context):
    """Retrieve analysis results"""
    
    try:
        # Get contract ID from path
        contract_id = event.get('pathParameters', {}).get('id')
        
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'contractId required'})
            }
        
        # Get from DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(Key={'contractId': contract_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Contract not found'})
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(response['Item'], default=decimal_default)
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }