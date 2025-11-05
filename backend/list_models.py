import boto3
import json

bedrock = boto3.client('bedrock', region_name='us-east-1')

# List all available models
response = bedrock.list_foundation_models()

print("Available Claude models:\n")
for model in response['modelSummaries']:
    if 'claude' in model['modelId'].lower():
        print(f"- {model['modelId']}")
        print(f"  Name: {model['modelName']}")
        print()