import json
import boto3

# Load contract
contract_path = r'C:\Users\sleepyfellow\contractguard\data\sample_contract\high_risk_vendor.txt'

with open(contract_path, 'r') as f:
    contract_text = f.read()

print(f"Contract loaded: {len(contract_text)} characters\n")

# Test Bedrock
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

PLAYBOOK = """
1. LIABILITY: Max $2M cap
2. TERMINATION: 90 days or less notice
3. PAYMENT: Net 30-45 days
4. IP: Company must own all work product
5. CONFIDENTIALITY: 3+ years after termination
"""

prompt = f"""Analyze this contract against our playbook. Return ONLY JSON.

<playbook>
{PLAYBOOK}
</playbook>

<contract>
{contract_text}
</contract>

Return JSON with: riskScore (0-100), criticalIssues (array), mediumIssues (array), compliantSections (array)."""

request = {
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 3000,
    "messages": [{"role": "user", "content": prompt}]
}

print("Calling Bedrock with Claude Sonnet 4.5...\n")

response = bedrock.invoke_model(
    modelId='us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    body=json.dumps(request)
)

result = json.loads(response['body'].read())
claude_response = result['content'][0]['text']

print("="*60)
print("CLAUDE'S ANALYSIS:")
print("="*60)
print(claude_response)
print("="*60)

# Parse JSON (strip markdown if present)
try:
    clean_response = claude_response.strip()
    if clean_response.startswith('```'):
        clean_response = clean_response.split('```')[1]
        if clean_response.startswith('json'):
            clean_response = clean_response[4:]
        clean_response = clean_response.strip()
    
    analysis = json.loads(clean_response)
    
    print("\n" + "="*60)
    print("✅ ANALYSIS SUCCESSFUL!")
    print("="*60)
    print(f"Risk Score: {analysis.get('riskScore')}/100 (HIGH RISK)")
    print(f"\nCritical Issues: {len(analysis.get('criticalIssues', []))}")
    for issue in analysis.get('criticalIssues', []):
        print(f"  🚨 {issue.get('category')}: {issue.get('issue')}")
    
    print(f"\nMedium Issues: {len(analysis.get('mediumIssues', []))}")
    for issue in analysis.get('mediumIssues', []):
        print(f"  ⚠️  {issue.get('category')}: {issue.get('issue')}")
    
    print(f"\nCompliant Sections: {len(analysis.get('compliantSections', []))}")
    
    print("\n" + "="*60)
    print("✅ LOCAL TEST PASSED! Ready to deploy Lambda!")
    print("="*60)
    
except Exception as e:
    print(f"\n❌ JSON parse error: {e}")