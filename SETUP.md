# Step-by-Step Guide: Kubernetes Pizza Observability

This guide provides detailed instructions for setting up and running the Kubernetes Pizza Observability project. Follow these steps to deploy a system that automatically orders pizza when your Kubernetes cluster's CPU usage exceeds a threshold.

## Table of Contents

1. [Infrastructure Setup](#infrastructure-setup)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Azure Function Setup](#azure-function-setup)
4. [Slack App Configuration](#slack-app-configuration)
5. [Testing the System](#testing-the-system)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)


## Infrastructure Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/k8s-pizza-observability.git
cd k8s-pizza-observability
```

### 2. Create Azure Service Principal

```bash
# Make the script executable
chmod +x scripts/create-sp.sh

# Run the script to create a service principal
./scripts/create-sp.sh
```

Note the output values for:
- `subscription_id`
- `tenant_id`
- `client_id`
- `client_secret`

### 3. Configure Terraform

```bash
# Navigate to the terraform directory
cd terraform

# Create terraform.tfvars file
cat > terraform.tfvars << EOF
# Azure credentials
subscription_id = "your-subscription-id"
tenant_id       = "your-tenant-id"
client_id       = "your-client-id"
client_secret   = "your-client-secret"

# Cluster configuration
resource_group_name = "k8s-pizza-rg"
location            = "eastus"
cluster_name        = "k8s-pizza-cluster"
node_count          = 2
vm_size             = "Standard_D2s_v3"
min_node_count      = 1
max_node_count      = 5
dns_prefix          = "k8s-pizza"
environment         = "dev"
EOF
```

### 4. Deploy AKS Cluster

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the configuration
terraform apply

# Configure kubectl to use the new cluster
az aks get-credentials --resource-group k8s-pizza-rg --name k8s-pizza-cluster

# Verify the connection
kubectl get nodes
```

## Kubernetes Deployment

### 1. Deploy Prometheus and Grafana

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus Stack with custom values
helm install prometheus prometheus-community/kube-prometheus-stack -f kubernetes/prometheus-values.yaml

# Verify the deployment
kubectl get pods
```

### 2. Create Dominos Payment Secret

```bash
# Create the payment secret
kubectl apply -f kubernetes/dominos-payment-secret.yaml

# Verify the secret was created
kubectl get secret dominos-payment-secret
```

### 3. Deploy Pizza Controller

```bash
# Build the controller Docker image
cd kubernetes/controller
docker build -t pizza-controller:latest .

# Push to your registry (if needed)
# docker tag pizza-controller:latest ashrafxbilal/pizza-controller:latest
# docker push ashrafxbilal/pizza-controller:latest

# Deploy the controller
kubectl apply -f pizza-controller-deployment.yaml

# Verify the controller is running
kubectl get pods | grep pizza-controller
```

### 4. Deploy with Helm (Alternative Approach)

Alternatively, you can deploy all components using the Helm chart:

```bash
# Navigate to the project root
cd /Users/bilal/nerd-bilal/dev-ops/Projects/k8-pizza-observability

# Create a values override file
cat > pizza-values.yaml << EOF
dominosPayment:
  cardType: "Credit"
  cardNumber: "4100123456789010"
  cardExpiration: "01/25"
  cardSecurityCode: "123"
  cardPostalCode: "90210"

azureFunction:
  env:
    CUSTOMER_FIRST_NAME: "Pizza"
    CUSTOMER_LAST_NAME: "Lover"
    CUSTOMER_EMAIL: "pizza@example.com"
    CUSTOMER_PHONE: "1234567890"
    DELIVERY_STREET: "123 Main St"
    DELIVERY_CITY: "Anytown"
    DELIVERY_STATE: "NY"
    DELIVERY_ZIP: "10001"
    PIZZA_SIZE: "large"
    PIZZA_TYPE: "pepperoni"
EOF

# Install the chart
helm install k8s-pizza helm/k8s-pizza-observability-chart -f pizza-values.yaml

# Verify all components are running
kubectl get pods
```

## Azure Function Setup

### 1. Configure Azure Function

```bash
# Navigate to the Azure Function directory
cd /k8-pizza-observability/azure-function

# Install dependencies
npm install
```

### 2. Create Azure Function App

```bash
# Create a resource group (if not using the one from Terraform)
az group create --name pizza-function-rg --location eastus

# Create a storage account
az storage account create --name pizzafunctionstorage --location eastus --resource-group pizza-function-rg --sku Standard_LRS

# Create the function app
az functionapp create --resource-group pizza-function-rg --consumption-plan-location eastus --runtime node --runtime-version 14 --functions-version 4 --name pizza-order-function --storage-account pizzafunctionstorage
```

### 3. Configure Function Settings

```bash
# Set environment variables
az functionapp config appsettings set --name pizza-order-function --resource-group pizza-function-rg --settings \
CUSTOMER_FIRST_NAME=Pizza \
CUSTOMER_LAST_NAME=Lover \
CUSTOMER_EMAIL=pizza@example.com \
CUSTOMER_PHONE=1234567890 \
DELIVERY_STREET="123 Main St" \
DELIVERY_CITY=Anytown \
DELIVERY_STATE=NY \
DELIVERY_ZIP=10001 \
PIZZA_SIZE=large \
PIZZA_TYPE=pepperoni \
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

### 4. Deploy the Function

```bash
# Install Azure Functions Core Tools (if not already installed)
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Deploy the function
func azure functionapp publish pizza-order-function

# Get the function URL and key
FUNCTION_URL=$(az functionapp function show --name pizza-order-function --resource-group pizza-function-rg --function-name OrderPizza --query "invokeUrlTemplate" -o tsv)
echo "Function URL: $FUNCTION_URL"

# Generate a function key (if needed)
./scripts/func-key.sh pizza-function-rg pizza-order-function OrderPizza
```

### 5. Update AlertManager Configuration

Update the AlertManager configuration to use your Azure Function URL:

```bash
# Edit the prometheus-values.yaml file to update the webhook URL
sed -i '' "s|https://your-azure-function-url.azurewebsites.net/api/orderpizza|$FUNCTION_URL|g" kubernetes/prometheus-values.yaml

# Update the Prometheus deployment
helm upgrade prometheus prometheus-community/kube-prometheus-stack -f kubernetes/prometheus-values.yaml
```

## Slack App Configuration

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" and select "From scratch"
3. Name your app (e.g., "Pizza Monitor") and select your workspace
4. Click "Create App"

### 2. Configure Bot Token Scopes

1. In the left sidebar, click "OAuth & Permissions"
2. Under "Scopes", add the following Bot Token Scopes:
   - `chat:write`
   - `chat:write.public`
   - `commands`
   - `incoming-webhook`
3. Click "Save Changes"

### 3. Configure Slash Commands

1. In the left sidebar, click "Slash Commands"
2. Click "Create New Command"
3. Fill in the details:
   - Command: `/pizza-status`
   - Request URL: `https://your-slack-app-url.com/slack/commands`
   - Short Description: "Check pizza order status"
   - Click "Save"
4. Repeat for additional commands:
   - `/pizza-order`: "Manually trigger a pizza order"
   - `/cluster-status`: "Check Kubernetes cluster status"


### 4. Configure Event Subscriptions

1. In the left sidebar, click "Event Subscriptions"
2. Toggle "Enable Events" to On
3. Set the Request URL to `https://your-slack-app-url.com/slack/events`
4. Under "Subscribe to bot events", add:
   - `message.channels`
   - `app_mention`
5. Click "Save Changes"

### 5. Install App to Workspace

1. In the left sidebar, click "Install App"
2. Click "Install to Workspace"
3. Review the permissions and click "Allow"
4. Note the Bot User OAuth Token (starts with `xoxb-`)

### 6. Deploy Slack App

```bash
# Navigate to the Slack app directory
cd /k8-pizza-observability/slack

# Create .env file
cat > .env << EOF
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
AZURE_FUNCTION_URL=$FUNCTION_URL
KUBERNETES_API_URL=https://your-k8s-api
KUBERNETES_TOKEN=your-k8s-token
EOF

# Install dependencies
npm install

# Start the app (for local testing)
npm start
```

### 8. Deploy to Kubernetes (Production)

```bash
# Build the Docker image
docker build -t pizza-slack-app .

# Push to your registry (if needed)
# docker tag pizza-slack-app:latest ashrafxbilal/pizza-slack-app:latest
# docker push ashrafxbilal/pizza-slack-app:latest

# Create a Kubernetes secret for Slack credentials
kubectl create secret generic slack-app-secret \
  --from-literal=SLACK_BOT_TOKEN=xoxb-your-bot-token \
  --from-literal=SLACK_SIGNING_SECRET=your-signing-secret \
  --from-literal=AZURE_FUNCTION_URL=$FUNCTION_URL

# Apply the Kubernetes manifest
kubectl apply -f kubernetes/slack-app-deployment.yaml

# Verify the deployment
kubectl get pods | grep slack-app
```

## Testing the System

### 1. Access Grafana Dashboard

```bash
# Port forward Grafana service
kubectl port-forward svc/prometheus-grafana 3000:80
```

Visit http://localhost:3000 in your browser and log in with:
- Username: `admin`
- Password: `pizza123`

### 2. Test with a Sample Alert

```bash
# Send a test alert
kubectl apply -f kubernetes/pizza-test-alert.json
```

### 3. Generate CPU Load (Optional)

To test with actual CPU load:

```bash
# Deploy a CPU stress test pod
cat > cpu-stress.yaml << EOF
apiVersion: v1
kind: Pod
metadata:
  name: cpu-stress
spec:
  containers:
  - name: cpu-stress
    image: progrium/stress
    args:
    - -c
    - "4"
    - -t
    - "300"
EOF

kubectl apply -f cpu-stress.yaml
```

### 4. Verify Order Creation

```bash
# Check for PizzaOrder resources
kubectl get pizzaorders

# Describe a specific order
kubectl describe pizzaorder k8s-cpu-alert-pizza
```

### 5. Check Slack Notifications

Verify that notifications are appearing in your Slack channel with options to approve or reject the order.

## Monitoring and Maintenance

### 1. Monitor Component Logs

```bash
# Pizza Controller logs
kubectl logs -f deployment/pizza-controller

# Slack app logs
kubectl logs -f deployment/slack-app

# Azure Function logs
az functionapp log tail --name pizza-order-function --resource-group pizza-function-rg
```

### 2. Update Configuration

To update the configuration:

```bash
# Update Helm values
helm upgrade k8s-pizza helm/k8s-pizza-observability-chart -f pizza-values.yaml

# Update Azure Function settings
az functionapp config appsettings set --name pizza-order-function --resource-group pizza-function-rg --settings NEW_SETTING=value
```

### 3. Scaling

```bash
# Scale the AKS cluster
az aks scale --resource-group k8s-pizza-rg --name k8s-pizza-cluster --node-count 3

# Scale the Pizza Controller deployment
kubectl scale deployment pizza-controller --replicas=2
```

## Troubleshooting

### Common Issues and Solutions

#### Prometheus Not Receiving Metrics

```bash
# Check Prometheus pods
kubectl get pods -l app=prometheus

# Check Prometheus targets
kubectl port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090
```

Visit http://localhost:9090/targets to check target status.

#### AlertManager Not Sending Alerts

```bash
# Check AlertManager configuration
kubectl get secret prometheus-kube-prometheus-alertmanager -o jsonpath='{.data.alertmanager\.yaml}' | base64 --decode

# Check AlertManager logs
kubectl logs -l app=alertmanager
```

#### Azure Function Not Processing Alerts

```bash
# Check function logs
az functionapp log tail --name pizza-order-function --resource-group pizza-function-rg

# Test the function directly
curl -X POST $FUNCTION_URL \
  -H "Content-Type: application/json" \
  -d '{"alerts":[{"status":"firing","labels":{"alertname":"HighCPUUsage","instance":"node1"},"annotations":{"description":"CPU usage is above 80% for 5 minutes","summary":"High CPU usage detected"}}]}'
```

#### Pizza Controller Not Creating Orders

```bash
# Check controller logs
kubectl logs -f deployment/pizza-controller

# Verify CRD installation
kubectl get crd | grep pizzaorders

# Check controller permissions
kubectl get clusterrole pizza-controller-role -o yaml
```

#### Slack App Not Receiving Notifications

```bash
# Check Slack app logs
kubectl logs -f deployment/slack-app

# Verify environment variables
kubectl describe pod -l app=slack-app | grep -A 10 Environment

# Test Slack API connection
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer xoxb-your-bot-token" \
  -H "Content-Type: application/json"
```

### Getting Help

If you encounter issues not covered in this guide:

1. Check the component-specific READMEs for more detailed troubleshooting information
2. Review the logs for error messages
3. Check the project repository for known issues
4. Consult the documentation for the specific tools (Kubernetes, Helm, Azure Functions, etc.)

---

Congratulations! You have successfully set up the Kubernetes Pizza Observability project. Your cluster will now automatically order pizza when CPU usage exceeds the configured threshold.