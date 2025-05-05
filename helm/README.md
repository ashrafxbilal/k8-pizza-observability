# Helm Charts for Kubernetes Pizza Observability

## Overview

This directory contains Helm charts for deploying the Kubernetes Pizza Observability project. The charts provide a streamlined way to install and configure all components of the system, including Prometheus, Grafana, AlertManager, the Pizza Controller, and necessary custom resources.

## Chart Structure

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

## Prerequisites

- Kubernetes cluster (v1.16+)
- Helm 3.x installed
- kubectl configured to access your cluster

## Installation

### Add Required Helm Repositories

```bash
# Add Prometheus community charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### Install the Chart

```bash
# From the project root directory
helm install k8s-pizza helm/k8s-pizza-observability-chart
```

### Custom Configuration

Create a values file to override default settings:

```bash
cat > pizza-values.yaml << EOF
# Global settings
global:
  namespace: monitoring

# Pizza Controller settings
pizzaController:
  image:
    repository: ashrafxbilal/pizza-controller
    tag: latest

# Dominos payment settings
dominosPayment:
  cardType: "Credit"
  cardNumber: "4100123456789010"
  cardExpiration: "01/25"
  cardSecurityCode: "123"
  cardPostalCode: "90210"

# Prometheus settings
prometheus:
  enabled: true
  alertRules:
    cpuThreshold: 75  # Lower threshold for testing
    duration: 2m      # Shorter duration for testing
EOF

helm install k8s-pizza helm/k8s-pizza-observability-chart -f values.yaml
```

## Configuration Options

### Global Settings

| Parameter | Description | Default |
|-----------|-------------|--------|
| `global.namespace` | Namespace for all resources | `default` |
| `global.labels` | Common labels for all resources | `app.kubernetes.io/part-of: k8s-pizza-observability` |

### Pizza Controller Settings

| Parameter | Description | Default |
|-----------|-------------|--------|
| `pizzaController.image.repository` | Controller image repository | `pizza-controller` |
| `pizzaController.image.tag` | Controller image tag | `latest` |
| `pizzaController.image.pullPolicy` | Image pull policy | `Always` |
| `pizzaController.resources.limits.cpu` | CPU limits | `100m` |
| `pizzaController.resources.limits.memory` | Memory limits | `128Mi` |
| `pizzaController.resources.requests.cpu` | CPU requests | `50m` |
| `pizzaController.resources.requests.memory` | Memory requests | `64Mi` |
| `pizzaController.serviceAccount.name` | Service account name | `pizza-controller-sa` |

### Dominos Payment Settings

| Parameter | Description | Default |
|-----------|-------------|--------|
| `dominosPayment.cardType` | Payment card type | `"Credit"` |
| `dominosPayment.cardNumber` | Payment card number | `"4100123456789010"` |
| `dominosPayment.cardExpiration` | Card expiration date | `"01/25"` |
| `dominosPayment.cardSecurityCode` | Card security code | `"123"` |
| `dominosPayment.cardPostalCode` | Billing postal code | `"90210"` |

### Prometheus Settings

| Parameter | Description | Default |
|-----------|-------------|--------|
| `prometheus.enabled` | Enable Prometheus | `true` |
| `prometheus.alertRules.cpuThreshold` | CPU threshold percentage | `80` |
| `prometheus.alertRules.duration` | Duration before alerting | `5m` |

## Upgrading

To upgrade an existing installation:

```bash
helm upgrade k8s-pizza helm/k8s-pizza-observability-chart -f values.yaml
```

## Uninstalling

To remove the chart:

```bash
helm uninstall k8s-pizza
```

## Troubleshooting

### Common Issues

- **CRD already exists**: If you get an error about the PizzaOrder CRD already existing, you can use the `--skip-crds` flag with Helm install
- **Permission issues**: Ensure your Kubernetes user has cluster-admin privileges for CRD creation
- **Resource limits**: If pods are failing to start, check if your cluster has enough resources

### Debugging

```bash
# Check pod status
kubectl get pods

# View controller logs
kubectl logs -f deployment/pizza-controller

# Check Prometheus configuration
kubectl get configmap -n monitoring prometheus-server -o yaml
```

## Development

### Testing Chart Changes

```bash
# Validate the chart
helm lint helm/k8s-pizza-observability-chart

# Test template rendering
helm template k8s-pizza helm/k8s-pizza-observability-chart
```

### Packaging the Chart

```bash
helm package helm/k8s-pizza-observability-chart
```