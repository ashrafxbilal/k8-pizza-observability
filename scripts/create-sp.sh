#!/bin/bash


SP_NAME="terraform-sp"

SP_OUTPUT=$(az ad sp create-for-rbac --name "$SP_NAME" --role="Contributor" --scopes="/subscriptions/$(az account show --query id -o tsv)" --sdk-auth)

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

CLIENT_ID=$(echo $SP_OUTPUT | jq -r .clientId)
CLIENT_SECRET=$(echo $SP_OUTPUT | jq -r .clientSecret)

echo ""
echo "Add the following to your Terraform provider config:"
echo ""
echo "subscription_id = \"$SUBSCRIPTION_ID\""
echo "tenant_id       = \"$TENANT_ID\""
echo "client_id       = \"$CLIENT_ID\""
echo "client_secret   = \"$CLIENT_SECRET\""

#chmod +x create-sp.sh
# ./create-sp.sh