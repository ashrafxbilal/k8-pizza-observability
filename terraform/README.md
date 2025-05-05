# Terraform for AKS Cluster Deployment

## Overview

This directory contains Terraform configurations for deploying an Azure Kubernetes Service (AKS) cluster to host the Kubernetes Pizza Observability project. The infrastructure is defined as code, making it easy to create, modify, and destroy the required cloud resources in a consistent and repeatable manner.

## Prerequisites

1. [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) installed
2. [Terraform](https://www.terraform.io/downloads.html) installed (v0.14.0 or newer)
3. Azure subscription
4. Service Principal with Contributor access to your Azure subscription

## Infrastructure Components

The Terraform configuration creates the following resources:

- **Resource Group**: Contains all the Azure resources
- **Log Analytics Workspace**: For AKS monitoring
- **AKS Cluster**: Kubernetes cluster with:
  - Default node pool
  - Auto-scaling enabled
  - Monitoring add-on
  - System-assigned managed identity

## Getting Started

### Creating a Service Principal

Use the provided script to create a Service Principal with Contributor access:

```bash
# Make the script executable
chmod +x ../scripts/create-sp.sh

# Run the script
../scripts/create-sp.sh
```

The script will output the necessary credentials for Terraform:

```
Add the following to your Terraform provider config:

subscription_id = "your-subscription-id"
tenant_id       = "your-tenant-id"
client_id       = "your-client-id"
client_secret   = "your-client-secret"
```

### Configuration

1. Create a `terraform.tfvars` file with your Azure credentials and desired configuration:

```hcl
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
```

2. Alternatively, you can set these as environment variables with the `TF_VAR_` prefix:

```bash
export TF_VAR_subscription_id="your-subscription-id"
export TF_VAR_tenant_id="your-tenant-id"
export TF_VAR_client_id="your-client-id"
export TF_VAR_client_secret="your-client-secret"
```

## Deployment

### Initialize Terraform

```bash
terraform init
```

### Plan the Deployment

```bash
terraform plan
```

Review the plan to ensure it will create the expected resources.

### Apply the Configuration

```bash
terraform apply
```

When prompted, type `yes` to confirm the deployment.

### Configure kubectl

After the deployment completes, configure kubectl to access your new AKS cluster:

```bash
az aks get-credentials --resource-group k8s-pizza-rg --name k8s-pizza-cluster
```

## Customization

### Variables

The following variables can be customized in your `terraform.tfvars` file:

| Variable | Description | Default |
|----------|-------------|--------|
| `resource_group_name` | Name of the Azure Resource Group | `k8s-pizza-rg` |
| `location` | Azure region for deployment | `eastus` |
| `cluster_name` | Name of the AKS cluster | `k8s-pizza-cluster` |
| `node_count` | Initial number of nodes | `2` |
| `vm_size` | VM size for the nodes | `Standard_D2s_v3` |
| `min_node_count` | Minimum number of nodes for auto-scaling | `1` |
| `max_node_count` | Maximum number of nodes for auto-scaling | `5` |
| `dns_prefix` | DNS prefix for the cluster | `k8s-pizza` |
| `environment` | Environment tag (e.g., dev, prod) | `dev` |

### Advanced Configuration

For advanced configuration options, modify the `main.tf` file directly. Common customizations include:

- Adding additional node pools
- Configuring network settings
- Setting up Azure AD integration
- Enabling additional features like pod identity

## Clean Up

To destroy the resources when they are no longer needed:

```bash
terraform destroy
```

When prompted, type `yes` to confirm deletion.

## Next Steps

After deploying the AKS cluster, proceed with installing the Kubernetes Pizza Observability components:

1. Install Prometheus and Grafana using Helm
2. Deploy the Pizza Controller
3. Configure AlertManager
4. Set up the Azure Function for alert processing

Refer to the main project README for detailed instructions.

## Troubleshooting

### Common Issues

- **Authentication Errors**: Ensure your Service Principal credentials are correct and have sufficient permissions
- **Quota Limits**: Check if you have sufficient quota in your Azure subscription for the requested resources
- **State Lock**: If a previous Terraform operation was interrupted, you might need to remove the state lock:
  ```bash
  terraform force-unlock <LOCK_ID>
  ```

### Getting Help

For issues with:

- **Terraform**: Consult the [Terraform documentation](https://www.terraform.io/docs/)
- **AKS**: Refer to the [AKS documentation](https://docs.microsoft.com/en-us/azure/aks/)
- **Project-specific issues**: Open an issue in the project repository