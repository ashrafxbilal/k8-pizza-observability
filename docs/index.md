# Kubernetes Pizza Observability

> Order pizza automatically when your Kubernetes cluster is under high load!

## Overview

Kubernetes Pizza Observability is a fun yet practical project that combines infrastructure monitoring with automated pizza ordering. When your Kubernetes cluster experiences high CPU load, the system automatically orders pizza for your team to enjoy while they work on resolving the issues.

## Inspiration

This project was inspired by the [Terraform Dominos Provider](https://nat-henderson.github.io/terraform-provider-dominos/) created by Nat Henderson. The provider allows users to order Dominos pizza directly through Terraform, expanding infrastructure as code into the physical world. As they eloquently put it:

> If you can use Terraform to summon folks with shovels to drop a fiber line, why shouldn't you be able to summon a driver with a pizza?

We've taken this concept and integrated it with Kubernetes monitoring to create a system that automatically orders pizza when your infrastructure needs attention.

## Architecture

```
Kubernetes Cluster
├── Workloads (Pods, Deployments, etc.)
├── Prometheus (Monitoring)
├── Grafana (Visualization & Alerting)
├── AlertManager (Alert Routing)
├── Azure Function (Alert Handler)
├── PizzaOrder CRD (Custom Resource Definition)
└── Slack App (Order Confirmation)
```

![Kubectl in action](kubectl.jpeg)
*Managing Kubernetes resources with kubectl*

### Workflow

1. Prometheus monitors your Kubernetes cluster metrics
2. When CPU usage exceeds the configured threshold, an alert is triggered
3. AlertManager routes the alert to the Azure Function
4. The Azure Function creates a PizzaOrder custom resource
5. The Pizza Controller processes the order and communicates with the Dominos API
6. A Slack notification is sent for order confirmation
   ![Slack Confirmation](slack-confirmation.jpeg)
   *Example of a Slack notification for pizza order confirmation*
7. Pizza is delivered to your specified address

## Components

### Core Components

- **Prometheus & Grafana**: Monitors cluster metrics and visualizes CPU usage
- **AlertManager**: Routes alerts to the Azure Function
- **Azure Function**: Processes alerts and creates pizza orders
- **Pizza Controller**: Kubernetes controller that manages PizzaOrder custom resources
- **Slack App**: Provides a user interface for confirming pizza orders

## Getting Started

### Prerequisites

- Kubernetes cluster (AKS, GKE, EKS, or local like Minikube/Kind)
- Helm 3.x
- kubectl configured to access your cluster
- Docker and Docker Compose (for local development)
- Dominos account (for actual pizza ordering)

### Quick Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/k8-pizza-observability.git
cd k8-pizza-observability

# Deploy with Helm
helm install pizza-observability helm/k8s-pizza-observability-chart
```

## Configuration

### Dominos Payment Configuration

Create a secret with your Dominos payment information:

```bash
# Create from the example file
cp kubernetes/dominos-payment-secret.example.yaml kubernetes/dominos-payment-secret.yaml

# Edit with your information
vim kubernetes/dominos-payment-secret.yaml

# Apply to the cluster
kubectl apply -f kubernetes/dominos-payment-secret.yaml
```

### Alert Thresholds

You can customize the CPU threshold and duration in the Helm values:

```yaml
prometheus:
  alertRules:
    cpuThreshold: 80  # Percentage
    duration: 5m      # Duration before alerting
```

## Project Structure

```
├── azure-function/       # Azure Function for processing alerts
├── docs/                 # Documentation and diagrams
├── helm/                 # Helm chart for Kubernetes deployment
├── kubernetes/           # Kubernetes manifests and samples
│   ├── controller/       # Pizza Order controller implementation
│   ├── crds/             # Custom Resource Definitions
│   └── samples/          # Sample resources
├── scripts/              # Utility scripts
├── slack/                # Slack app for order confirmation
└── terraform/            # Infrastructure as Code for cloud deployment
```

## Component Details

### Pizza Controller

The controller follows the Kubernetes operator pattern and is built using the controller-runtime library. It consists of:

1. **PizzaOrder CRD**: A custom resource definition that represents a pizza order
2. **Reconciler**: The core logic that processes PizzaOrder resources
3. **Dominos API Integration**: Code that interacts with Dominos to place and track orders
4. **RBAC Configuration**: Service account and role bindings for proper permissions

### Helm Charts

The Helm charts provide a streamlined way to deploy all components of the system. The chart structure includes:

```
k8s-pizza-observability-chart/
├── Chart.yaml             # Chart metadata
├── values.yaml            # Default configuration values
├── templates/             # Kubernetes manifest templates
│   ├── _helpers.tpl       # Template helper functions
│   ├── dominos-payment-secret.yaml  # Secret for Dominos payment
│   ├── pizza-controller-deployment.yaml  # Pizza controller deployment
│   ├── pizzaorders.yaml   # PizzaOrder CRD definition
│   └── prometheus-values.yaml  # Prometheus configuration
└── .helmignore           # Files to ignore when packaging
```

### Azure Function

The Azure Function processes alerts from Prometheus and creates PizzaOrder custom resources. It includes:

- HTTP trigger for receiving alerts
- Kubernetes client for creating custom resources
- Logic for determining pizza type based on alert severity

### Terraform Infrastructure

The Terraform configuration creates the necessary cloud infrastructure for the project, including:

- Azure Kubernetes Service (AKS) cluster
- Virtual Network and subnets
- Azure Container Registry
- Azure Function App

## Limitations

**Note:** The complete end-to-end workflow could not be tested in real-time because the Domino's Pizza API works primarily in the US and Canada. The system is designed to work with the API but may require adjustments based on your location.

## Development

### Adding Features

The controller is designed to be extensible. Common enhancements include:

- Adding support for more pizza customization options
- Implementing additional payment methods
- Creating a web UI for order management
- Adding metrics for Prometheus monitoring

### Testing Chart Changes

```bash
# Validate the chart
helm lint helm/k8s-pizza-observability-chart

# Test template rendering
helm template k8s-pizza helm/k8s-pizza-observability-chart
```

## Troubleshooting

### Debugging

```bash
# Check pod status
kubectl get pods

# View controller logs
kubectl logs -f deployment/pizza-controller

# Check Prometheus configuration
kubectl get configmap -n monitoring prometheus-server -o yaml
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is unlicensed.

## Acknowledgements

- [Terraform Dominos Provider](https://nat-henderson.github.io/terraform-provider-dominos/) for the inspiration
- The Kubernetes and Prometheus communities for their excellent tools
- Dominos Pizza for their API (even if it's not officially supported)