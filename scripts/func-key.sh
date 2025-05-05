#!/bin/bash


RESOURCE_GROUP="pizza-function-rg"
FUNCTION_APP="pizza-order-function"
FUNCTION_NAME="orderpizza" 
VALUES_FILE="prometheus-values.yaml"

FUNCTION_KEY=$(az functionapp function keys list \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FUNCTION_APP" \
  --function-name "$FUNCTION_NAME" \
  --query "default" -o tsv)

if [[ -z "$FUNCTION_KEY" ]]; then
  echo "Function key not found."
  exit 1
fi

FUNCTION_URL="https://${FUNCTION_APP}.azurewebsites.net/api/${FUNCTION_NAME}?code=${FUNCTION_KEY}"
echo "Function URL: $FUNCTION_URL"

# inject into prometheus-values.yaml
# Update the webhook URL under alertmanagerConfig (YAML must already have this block!)
yq eval ".alertmanager.config.receivers[] |= 
  map(select(.name == \"pizza-webhook\") |
  .webhook_configs[0].url = \"$FUNCTION_URL\")" \
  "$VALUES_FILE" -i