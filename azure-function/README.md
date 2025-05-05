# Azure Function for Pizza Ordering

## Overview

This Azure Function is a critical component of the Kubernetes Pizza Observability project. It serves as the bridge between monitoring alerts and pizza ordering actions. When Prometheus detects high CPU usage in the Kubernetes cluster, AlertManager sends a webhook to this function, which then processes the alert and creates a PizzaOrder custom resource in the Kubernetes cluster.

## How It Works

1. **Alert Reception**: The function receives HTTP POST requests from AlertManager when CPU usage exceeds the configured threshold (80% for 5 minutes)
2. **Data Processing**: It extracts relevant information from the alert payload
3. **Order Creation**: Using the Dominos API, it prepares a pizza order with the configured details
4. **Kubernetes Integration**: It creates a PizzaOrder custom resource in the Kubernetes cluster
5. **Notification**: (Optional) It sends a notification to Slack for order confirmation

## Configuration

The function uses environment variables for configuration:

```
CUSTOMER_FIRST_NAME=Pizza
CUSTOMER_LAST_NAME=Lover
CUSTOMER_EMAIL=pizza@example.com
CUSTOMER_PHONE=1234567890
DELIVERY_STREET=123 Main St
DELIVERY_CITY=Anytown
DELIVERY_STATE=NY
DELIVERY_ZIP=10001
PIZZA_SIZE=large
PIZZA_TYPE=pepperoni
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
```

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run locally
npm start
```

### Azure Deployment

```bash
# Login to Azure
az login

# Create a resource group if needed
az group create --name pizza-function-rg --location eastus

# Create a storage account
az storage account create --name pizzafunctionstorage --location eastus --resource-group pizza-function-rg --sku Standard_LRS

# Create the function app
az functionapp create --resource-group pizza-function-rg --consumption-plan-location eastus --runtime node --runtime-version 14 --functions-version 4 --name pizza-order-function --storage-account pizzafunctionstorage

# Deploy the function
func azure functionapp publish pizza-order-function
```

## Testing

You can test the function by sending a POST request with a sample alert payload:

```bash
curl -X POST https://your-function-url.azurewebsites.net/api/orderpizza \
  -H "Content-Type: application/json" \
  -d '{"alerts":[{"status":"firing","labels":{"alertname":"HighCPUUsage","instance":"node1"},"annotations":{"description":"CPU usage is above 80% for 5 minutes","summary":"High CPU usage detected"}}]}'
```

## Integration with Kubernetes

The function uses the Kubernetes JavaScript client to create PizzaOrder custom resources. It requires a service account with appropriate permissions to create resources in the `pizza.bilalashraf.xyz` API group.

## Troubleshooting

- **Function not receiving alerts**: Check AlertManager configuration and network connectivity
- **Order creation failing**: Verify Dominos API credentials and delivery information
- **Kubernetes integration issues**: Ensure the function has proper permissions to create PizzaOrder resources

## Dependencies

- **axios**: For making HTTP requests
- **dominos**: Node.js library for Dominos Pizza API
- **@kubernetes/client-node**: Kubernetes client for Node.js