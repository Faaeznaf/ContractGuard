# ContractGuard Deployment Guide

Complete guide to deploying ContractGuard to AWS from scratch.

## Prerequisites

- AWS Account (free tier eligible)
- AWS CLI installed and configured
- Node.js 18+ and npm
- Python 3.11
- Git

## Architecture Overview

ContractGuard uses AWS serverless architecture:
- 3 Lambda functions (Python 3.11)
- API Gateway (REST API)
- S3 (contract storage)
- DynamoDB (analysis results)
- Bedrock (Claude Sonnet 4.5 AI)

**Estimated Setup Time**: 60-90 minutes  
**Monthly Cost**: $5-10 for 100 contracts

---

## Phase 1: AWS Account Setup (10 mins)

### 1.1 Configure AWS CLI
```bash
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1
# - Output format: json
```

### 1.2 Verify AWS Access
```bash
aws sts get-caller-identity
# Note your Account ID - you'll need it later
```

### 1.3 Enable Bedrock Model Access

1. Go to AWS Console → Bedrock → Model Access
2. Click "Enable specific models"
3. Enable: **Anthropic Claude Sonnet 4.5**
4. Wait 2-5 minutes for approval (usually instant)

---

## Phase 2: Create AWS Resources (20 mins)

### 2.1 Create S3 Buckets
```bash
# Replace YOUR_ACCOUNT_ID with your actual account ID
ACCOUNT_ID="YOUR_ACCOUNT_ID"

# Create uploads bucket
aws s3 mb s3://contractguard-uploads-${ACCOUNT_ID} --region us-east-1

# Create outputs bucket
aws s3 mb s3://contractguard-outputs-${ACCOUNT_ID} --region us-east-1

# Verify buckets exist
aws s3 ls | grep contractguard
```

### 2.2 Configure S3 CORS

Create `cors.json`:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Apply CORS:
```bash
aws s3api put-bucket-cors \
  --bucket contractguard-uploads-${ACCOUNT_ID} \
  --cors-configuration file://cors.json \
  --region us-east-1
```

### 2.3 Create DynamoDB Table
```bash
aws dynamodb create-table \
  --table-name ContractAnalyses \
  --attribute-definitions \
    AttributeName=contractId,AttributeType=S \
  --key-schema \
    AttributeName=contractId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Verify table is active
aws dynamodb describe-table \
  --table-name ContractAnalyses \
  --query 'Table.TableStatus' \
  --region us-east-1
```

---

## Phase 3: Deploy Lambda Functions (30 mins)

### 3.1 Create IAM Role

Create `trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create role:
```bash
aws iam create-role \
  --role-name ContractGuardLambdaRole \
  --assume-role-policy-document file://trust-policy.json

# Attach basic Lambda permissions
aws iam attach-role-policy \
  --role-name ContractGuardLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

Create `lambda-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::contractguard-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/ContractAnalyses"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach custom policy:
```bash
aws iam put-role-policy \
  --role-name ContractGuardLambdaRole \
  --policy-name ContractGuardPolicy \
  --policy-document file://lambda-policy.json
```

### 3.2 Package Lambda Functions
```bash
cd backend/lambda_functions

# Create zips
python -c "import zipfile; z = zipfile.ZipFile('generate_upload_url.zip', 'w', zipfile.ZIP_DEFLATED); z.write('generate_upload_url.py'); z.close()"
python -c "import zipfile; z = zipfile.ZipFile('analyze_contract.zip', 'w', zipfile.ZIP_DEFLATED); z.write('analyze_contract.py'); z.close()"
python -c "import zipfile; z = zipfile.ZipFile('get_analysis.zip', 'w', zipfile.ZIP_DEFLATED); z.write('get_analysis.py'); z.close()"
```

### 3.3 Deploy Lambda Functions
```bash
# Set variables
ACCOUNT_ID="YOUR_ACCOUNT_ID"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/ContractGuardLambdaRole"

# Deploy Lambda 1
aws lambda create-function \
  --function-name ContractGuard-UploadURL \
  --runtime python3.11 \
  --role $ROLE_ARN \
  --handler generate_upload_url.lambda_handler \
  --zip-file fileb://generate_upload_url.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables={UPLOAD_BUCKET=contractguard-uploads-${ACCOUNT_ID},TABLE_NAME=ContractAnalyses} \
  --region us-east-1

# Deploy Lambda 2 (AI analysis)
aws lambda create-function \
  --function-name ContractGuard-Analyze \
  --runtime python3.11 \
  --role $ROLE_ARN \
  --handler analyze_contract.lambda_handler \
  --zip-file fileb://analyze_contract.zip \
  --timeout 300 \
  --memory-size 1024 \
  --environment Variables={UPLOAD_BUCKET=contractguard-uploads-${ACCOUNT_ID},TABLE_NAME=ContractAnalyses} \
  --region us-east-1

# Deploy Lambda 3
aws lambda create-function \
  --function-name ContractGuard-GetAnalysis \
  --runtime python3.11 \
  --role $ROLE_ARN \
  --handler get_analysis.lambda_handler \
  --zip-file fileb://get_analysis.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables={TABLE_NAME=ContractAnalyses} \
  --region us-east-1

# Verify all deployed
aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'ContractGuard')].FunctionName"
```

---

## Phase 4: Create API Gateway (20 mins)

### 4.1 Create REST API
```bash
# Create API
API_ID=$(aws apigateway create-rest-api \
  --name ContractGuardAPI \
  --description "API for ContractGuard contract analysis" \
  --region us-east-1 \
  --query 'id' \
  --output text)

echo "API ID: $API_ID"

# Get root resource
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region us-east-1 \
  --query 'items[0].id' \
  --output text)
```

### 4.2 Create Endpoints

**Endpoint 1: POST /upload-url**
```bash
# Create resource
UPLOAD_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part upload-url \
  --region us-east-1 \
  --query 'id' \
  --output text)

# Create POST method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $UPLOAD_RESOURCE \
  --http-method POST \
  --authorization-type NONE \
  --region us-east-1

# Integrate with Lambda
LAMBDA1_ARN="arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ContractGuard-UploadURL"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $UPLOAD_RESOURCE \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${LAMBDA1_ARN}/invocations" \
  --region us-east-1

# Grant permission
aws lambda add-permission \
  --function-name ContractGuard-UploadURL \
  --statement-id apigateway-upload \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*/*" \
  --region us-east-1
```

**Endpoint 2: POST /analyze**
```bash
ANALYZE_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part analyze \
  --region us-east-1 \
  --query 'id' \
  --output text)

aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $ANALYZE_RESOURCE \
  --http-method POST \
  --authorization-type NONE \
  --region us-east-1

LAMBDA2_ARN="arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ContractGuard-Analyze"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ANALYZE_RESOURCE \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${LAMBDA2_ARN}/invocations" \
  --region us-east-1

aws lambda add-permission \
  --function-name ContractGuard-Analyze \
  --statement-id apigateway-analyze \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*/*" \
  --region us-east-1
```

**Endpoint 3: GET /analysis/{id}**
```bash
ANALYSIS_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part analysis \
  --region us-east-1 \
  --query 'id' \
  --output text)

ID_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ANALYSIS_RESOURCE \
  --path-part '{id}' \
  --region us-east-1 \
  --query 'id' \
  --output text)

aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $ID_RESOURCE \
  --http-method GET \
  --authorization-type NONE \
  --region us-east-1

LAMBDA3_ARN="arn:aws:lambda:us-east-1:${ACCOUNT_ID}:function:ContractGuard-GetAnalysis"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ID_RESOURCE \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${LAMBDA3_ARN}/invocations" \
  --region us-east-1

aws lambda add-permission \
  --function-name ContractGuard-GetAnalysis \
  --statement-id apigateway-get \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:${ACCOUNT_ID}:${API_ID}/*/*" \
  --region us-east-1
```

### 4.3 Enable CORS (Critical!)

**Use AWS Console (easier):**

1. Go to API Gateway Console
2. Click ContractGuardAPI → Resources
3. For each endpoint (/upload-url, /analyze, /analysis/{id}):
   - Click the resource
   - Click Actions → Enable CORS
   - Check all boxes
   - Click "Enable CORS and replace existing CORS headers"

### 4.4 Deploy API
```bash
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region us-east-1

# Get API URL
API_URL="https://${API_ID}.execute-api.us-east-1.amazonaws.com/prod"
echo "API URL: $API_URL"
```

**Save this API_URL - you'll need it for the frontend!**

---

## Phase 5: Deploy Frontend (10 mins)

### 5.1 Install Dependencies
```bash
cd frontend
npm install
```

### 5.2 Configure API URL

Edit `src/utils/api.js` and update line 3:
```javascript
const API_URL = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod';
```

Replace `YOUR_API_ID` with your actual API ID.

### 5.3 Test Locally
```bash
npm start
```

Visit http://localhost:3000 and test:
1. Upload a contract
2. Wait for analysis
3. View results

---

## Phase 6: Test End-to-End

### Test Lambda 2 Directly
```bash
# Upload test contract
aws s3 cp ../../data/sample_contract/high_risk_vendor.txt \
  s3://contractguard-uploads-${ACCOUNT_ID}/test/test_contract.txt

# Create test event
echo '{"body": "{\"contractId\": \"test-123\", \"s3Key\": \"test/test_contract.txt\"}"}' > test_event.json

# Invoke Lambda
aws lambda invoke \
  --function-name ContractGuard-Analyze \
  --payload file://test_event.json \
  --region us-east-1 \
  response.json

cat response.json

# Check DynamoDB
aws dynamodb get-item \
  --table-name ContractAnalyses \
  --key '{"contractId": {"S": "test-123"}}' \
  --region us-east-1
```

Expected: Status "completed", risk score 70-85, critical issues identified.

---

## Troubleshooting

### Common Issues

**1. CORS Errors**
```
Access to XMLHttpRequest blocked by CORS policy
```
**Fix**: Enable CORS on both API Gateway and S3 bucket (see Phase 4.3 and Phase 2.2)

**2. Bedrock AccessDenied**
```
User is not authorized to perform: bedrock:InvokeModel
```
**Fix**: Update IAM policy to include `"Resource": "*"` for Bedrock

**3. Lambda Timeout**
```
Task timed out after 300.00 seconds
```
**Fix**: Increase Lambda timeout or reduce contract size

**4. JSON Parse Error**
```
Failed to parse AI response
```
**Fix**: Already handled with markdown stripping in code

### View Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/ContractGuard-Analyze --follow

# API Gateway logs (enable first in console)
aws logs tail API-Gateway-Execution-Logs_${API_ID}/prod --follow
```

---

## Production Deployment (Optional)

### Deploy Frontend to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel --prod
```

### Deploy Frontend to AWS Amplify

1. Go to AWS Amplify Console
2. Connect GitHub repository
3. Configure build settings:
   - Build command: `npm run build`
   - Base directory: `frontend`
   - Publish directory: `build`
4. Add environment variable: `REACT_APP_API_URL=your-api-url`
5. Deploy

---

## Cost Estimation

**Per 100 contracts/month:**
- Lambda: $0.50
- Bedrock (Claude): $3.00
- S3: $0.25
- DynamoDB: $0.25
- API Gateway: $1.00
- **Total: ~$5/month**

**Free Tier:** First 1M Lambda requests and 1M API Gateway requests free.

---

## Cleanup (If Needed)
```bash
# Delete Lambdas
aws lambda delete-function --function-name ContractGuard-UploadURL
aws lambda delete-function --function-name ContractGuard-Analyze
aws lambda delete-function --function-name ContractGuard-GetAnalysis

# Delete API Gateway
aws apigateway delete-rest-api --rest-api-id $API_ID

# Delete DynamoDB table
aws dynamodb delete-table --table-name ContractAnalyses

# Delete S3 buckets (must be empty first)
aws s3 rb s3://contractguard-uploads-${ACCOUNT_ID} --force
aws s3 rb s3://contractguard-outputs-${ACCOUNT_ID} --force

# Delete IAM role
aws iam delete-role-policy --role-name ContractGuardLambdaRole --policy-name ContractGuardPolicy
aws iam detach-role-policy --role-name ContractGuardLambdaRole --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name ContractGuardLambdaRole
```

---

## Next Steps

1. Add authentication (AWS Cognito)
2. Set up monitoring (CloudWatch dashboards)
3. Configure custom domain
4. Enable API caching
5. Add rate limiting
6. Implement multi-playbook support

---

