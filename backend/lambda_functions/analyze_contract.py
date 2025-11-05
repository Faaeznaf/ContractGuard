import json
import boto3
import os
from datetime import datetime

s3_client = boto3.client('s3')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb')

BUCKET_NAME = os.environ.get('UPLOAD_BUCKET', 'contractguard-uploads-YOUR_ACCOUNT_ID')
TABLE_NAME = os.environ.get('TABLE_NAME', 'ContractAnalyses')

# Hardcoded playbook (we'll load from S3 later if needed)
PLAYBOOK = """
Company Playbook Rules:

1. LIABILITY: Liability cap must not exceed $2,000,000
2. TERMINATION: Termination notice period must be 90 days or less
3. PAYMENT: Payment terms should be Net 30-45 days
4. INTELLECTUAL PROPERTY: Company must own all work product and deliverables
5. CONFIDENTIALITY: Confidentiality must survive termination for at least 3 years
6. INDEMNIFICATION: Mutual indemnification preferred
7. DATA PRIVACY: Must comply with GDPR/CCPA if handling customer data
8. AUTO-RENEWAL: Auto-renewal requires 60+ days notice to cancel
9. GOVERNING LAW: Prefer company's jurisdiction
10. FORCE MAJEURE: Must include force majeure clause
"""

def lambda_handler(event, context):
    """Analyze contract using AWS Bedrock (Claude)"""
    
    try:
        # Parse request
        body = json.loads(event.get('body', '{}'))
        contract_id = body.get('contractId')
        s3_key = body.get('s3Key')
        
        if not contract_id or not s3_key:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'contractId and s3Key required'})
            }
        
        # Update status to analyzing
        table = dynamodb.Table(TABLE_NAME)
        table.update_item(
            Key={'contractId': contract_id},
            UpdateExpression='SET #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': 'analyzing'}
        )
        
        # Get contract from S3
        print(f"Fetching contract from S3: {s3_key}")
        obj = s3_client.get_object(Bucket=BUCKET_NAME, Key=s3_key)
        contract_text = obj['Body'].read().decode('utf-8')
        
        print(f"Contract length: {len(contract_text)} characters")
        
        # Build prompt for Claude
        prompt = f"""You are a legal contract analyst. Review this contract against our company playbook and return ONLY valid JSON.

<company_playbook>
{PLAYBOOK}
</company_playbook>

<contract>
{contract_text[:15000]}
</contract>

Analyze the contract and return ONLY a JSON object with this exact structure (no markdown, no explanation):

{{
  "riskScore": <number 0-100>,
  "criticalIssues": [
    {{
      "clause": "Section name or clause text",
      "issue": "What's wrong with it",
      "suggestion": "How to fix it"
    }}
  ],
  "mediumIssues": [
    {{
      "clause": "Section name",
      "issue": "Concern description"
    }}
  ],
  "compliantSections": [
    "List of sections that comply with playbook"
  ]
}}

Risk scoring:
- 70-100: High risk (multiple critical issues)
- 40-69: Medium risk (some concerning terms)
- 0-39: Low risk (mostly compliant)

Return ONLY the JSON, nothing else."""

        # Call Bedrock
        print("Calling Bedrock...")
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        response = bedrock.invoke_model(
            modelId='us.anthropic.claude-sonnet-4-5-20250929-v1:0',  # Claude Sonnet 4.5
            body=json.dumps(request_body)
        )
        
        # Parse response
        response_body = json.loads(response['body'].read())
        claude_response = response_body['content'][0]['text']
        
        print(f"Claude response: {claude_response[:500]}")
        
        # Parse JSON from Claude's response
        # Sometimes Claude wraps JSON in markdown, so we clean it
        claude_response = claude_response.strip()
        if claude_response.startswith('```'):
            # Remove markdown code blocks
            claude_response = claude_response.split('```')[1]
            if claude_response.startswith('json'):
                claude_response = claude_response[4:]
        
        analysis = json.loads(claude_response.strip())
        claude_response_clean = claude_response  # Save for error logging

        # Store results in DynamoDB
        table.update_item(
            Key={'contractId': contract_id},
            UpdateExpression='SET #status = :status, analysis = :analysis, completedAt = :time',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'completed',
                ':analysis': analysis,
                ':time': datetime.utcnow().isoformat()
            }
        )
        
        print("Analysis complete!")
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'status': 'completed',
                'contractId': contract_id
            })
        }
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {str(e)}")
        print(f"Claude response was: {claude_response}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Failed to parse AI response: {str(e)}'})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        
        # Update status to failed
        try:
            table.update_item(
                Key={'contractId': contract_id},
                UpdateExpression='SET #status = :status, error = :error',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'failed',
                    ':error': str(e)
                }
            )
        except:
            pass
            
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
