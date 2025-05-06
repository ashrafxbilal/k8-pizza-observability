# Helm Charts for Kubernetes Pizza Observability: Comprehensive Guide

## ⚓ Overview

This directory contains the Helm charts essential for deploying and managing the Kubernetes Pizza Observability project components within a Kubernetes cluster. Helm, as a package manager for Kubernetes, streamlines the deployment process by bundling application components into reusable and configurable packages called charts.

These charts are designed to be modular, allowing for flexible deployment of individual components or the entire stack.

## 📊 Available Charts

While the current `helm/k8s-pizza-observability-chart/` directory suggests a single monolithic chart, a more modular approach often involves separate charts for distinct components. This documentation will describe the logical components that would typically be managed by Helm, whether as subcharts of a parent chart or as individual, deployable charts.

### 1. `pizza-controller` (Logical Component)

*   **Purpose**: Deploys the core **Pizza Order Controller**. This controller is responsible for watching `PizzaOrder` Custom Resources (CRs) within the cluster. When a `PizzaOrder` CR is created or updated, the controller interacts with the Dominos API (or a similar pizza delivery service API) to place an actual pizza order.
*   **Key Kubernetes Resources Managed (within the main chart or as a subchart)**:
    *   `Deployment`: Manages the controller's pod replicas (`templates/pizza-controller-deployment.yaml`).
    *   `CustomResourceDefinition (CRD)`: Defines the `PizzaOrder` schema (`templates/pizzaorders.yaml`).
    *   `ServiceAccount`: Provides a dedicated identity for the controller pod.
    *   `ClusterRole` & `ClusterRoleBinding` (or `Role` & `RoleBinding`): Grants necessary RBAC permissions.
    *   `Secret`: For Dominos API credentials and payment information (`templates/dominos-payment-secret.yaml`).

### 2. `monitoring-stack` (Leveraging Community Charts as Dependencies)

*   **Purpose**: Deploys a monitoring stack (Prometheus, Grafana, Alertmanager). This is crucial for collecting metrics, visualizing dashboards, and triggering alerts that might lead to pizza orders.
*   **Implementation**: Typically achieved by adding community charts like `kube-prometheus-stack` as a dependency in the `Chart.yaml` of the main `k8s-pizza-observability-chart` or by installing it separately.
*   **Key Components Deployed (by `kube-prometheus-stack` or similar)**:
    *   **Prometheus**: Collects metrics. Configuration for Prometheus, including alert rules, can be managed via `templates/prometheus-values.yaml` or directly in the values for the dependency chart.
    *   **Grafana**: For dashboards.
    *   **Alertmanager**: Handles alerts and routes them.

## ⚙️ Prerequisites

*   **Kubernetes Cluster**: A running Kubernetes cluster (v1.16+ as per existing docs, v1.19+ recommended for full CRD features).
*   **Helm**: Helm v3.x installed on your local machine.
*   **`kubectl`**: Configured to communicate with your Kubernetes cluster.

## 🚀 Installation Guide

### Add Required Helm Repositories (for Dependencies)

If your main chart depends on community charts like `kube-prometheus-stack`:

```bash
# Add Prometheus community charts (if not already added)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### Installing the `k8s-pizza-observability-chart`

1.  **Navigate to the Helm Directory**:
    The main chart appears to be located at `helm/k8s-pizza-observability-chart/`.

2.  **Customize `values.yaml`**: The primary configuration file is `helm/k8s-pizza-observability-chart/values.yaml`. Review and customize it. You can also create a separate override file (e.g., `my-custom-values.yaml`).

    Key sections in `values.yaml` (based on existing `README.md` structure):
    *   `global`: Namespace, common labels.
    *   `pizzaController`: Image settings, resources, service account.
    *   `dominosPayment`: Card details for the payment secret.
    *   `prometheus`: Enablement, alert rule parameters (CPU threshold, duration).

    Example `my-custom-values.yaml`:
    ```yaml
    global:
      namespace: k8s-pizza-prod

    pizzaController:
      image:
        repository: my-custom-repo/pizza-controller
        tag: v1.2.3
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"

    dominosPayment:
      cardType: "Visa"
      cardNumber: "YOUR_VISA_CARD_NUMBER"
      # ... other payment details ...

    # If kube-prometheus-stack is a subchart, configure it here:
    # kube-prometheus-stack:
    #   grafana:
    #     adminPassword: "SuperSecurePassword!"
    #   alertmanager:
    #     config:
    #       receivers:
    #       - name: 'pizza-webhook'
    #         webhook_configs:
    #         - url: 'http://YOUR_AZURE_FUNCTION_OR_HANDLER/api/alert'
    ```

3.  **Install the Chart**:
    From the directory containing the `helm` folder (e.g., project root):
    ```bash
    helm install k8s-pizza-release ./helm/k8s-pizza-observability-chart/ -n k8s-pizza-prod --create-namespace -f my-custom-values.yaml
    ```
    *   `k8s-pizza-release`: Your chosen release name.
    *   `./helm/k8s-pizza-observability-chart/`: Path to the chart.
    *   `-n k8s-pizza-prod`: Target namespace.
    *   `--create-namespace`: If the namespace doesn't exist.
    *   `-f my-custom-values.yaml`: Your custom values file.

## 🔧 Configuration Parameters

Refer to the `helm/k8s-pizza-observability-chart/values.yaml` file for a comprehensive list of configurable parameters and their default values. The existing `README.md` provides a good summary table structure for these values, which should be maintained and expanded in the chart's own `README.md`.

**Key Configuration Areas**:

*   **Global Settings**: Namespace, labels.
*   **Pizza Controller**: Image details, resource allocation, service account information.
*   **Dominos Payment Secret**: Parameters to populate the payment details secret. **Ensure these are handled securely, ideally by referencing pre-existing secrets or using a secrets management tool like HashiCorp Vault or Sealed Secrets, rather than plain text in values files for production.**
*   **Prometheus/Monitoring Stack**: Configuration for Prometheus alert rules, and if `kube-prometheus-stack` is a subchart, all its extensive configuration options (persistence, Grafana settings, Alertmanager receivers, etc.).

## 🔄 Upgrading Releases

To upgrade an existing Helm release to a new chart version or with modified configuration:

1.  Ensure your chart directory (`helm/k8s-pizza-observability-chart/`) has the updated chart version in `Chart.yaml` and any template changes.
2.  Modify your values file (`my-custom-values.yaml`) if needed.
3.  Run `helm upgrade`:
    ```bash
    helm upgrade k8s-pizza-release ./helm/k8s-pizza-observability-chart/ -n k8s-pizza-prod -f my-custom-values.yaml
    ```

## 🗑️ Uninstalling Releases

To remove a deployed Helm release and its associated Kubernetes resources:

```bash
helm uninstall k8s-pizza-release -n k8s-pizza-prod
```

**Important Notes on Uninstallation**:
*   **PersistentVolumeClaims (PVCs)**: Helm does not automatically delete PVCs to prevent accidental data loss. If Prometheus or Grafana were configured with persistence, you might need to delete their PVCs manually.
*   **CustomResourceDefinitions (CRDs)**: CRDs installed by Helm (like `pizzaorders.k8spizza.com`) are also not removed by default on `helm uninstall`. If you need to remove the CRD, do so manually:
    ```bash
    kubectl delete crd pizzaorders.k8spizza.com
    ```

## 📁 Chart Structure (`k8s-pizza-observability-chart`)

The existing `README.md` outlines this structure:

```
k8s-pizza-observability-chart/
├── Chart.yaml             # Chart metadata (name, version, appVersion, dependencies)
├── values.yaml            # Default configuration values for this chart and subcharts.
├── templates/             # Directory of Kubernetes manifest templates.
│   ├── _helpers.tpl       # Go template helper functions.
│   ├── dominos-payment-secret.yaml  # Template for the payment Secret.
│   ├── pizza-controller-deployment.yaml  # Template for the controller Deployment.
│   ├── pizzaorders.yaml   # Template for the PizzaOrder CRD.
│   └── prometheus-values.yaml  # Potentially a values snippet or ConfigMap for Prometheus rules.
├── .helmignore           # Files to ignore when packaging the chart.
└── charts/                # Optional: Directory for subcharts (e.g., if kube-prometheus-stack was vendored).
```

## ✨ Best Practices for Helm Chart Development & Usage

*   **Parameterize**: Make your chart highly configurable via `values.yaml`.
*   **Secure Secrets**: For production, avoid plain text secrets in `values.yaml`. Use external secrets management (e.g., Vault, Sealed Secrets, SOPS) or rely on pre-created secrets.
*   **Idempotency**: Ensure charts can be applied multiple times without errors.
*   **Resource Management**: Define sensible default CPU/memory `requests` and `limits`.
*   **Health Probes**: Implement `livenessProbe` and `readinessProbe` for deployments.
*   **Documentation**: Maintain a clear `README.md` within the chart directory (`helm/k8s-pizza-observability-chart/README.md`) detailing all parameters, prerequisites, and usage.
*   **Lint and Test**: Use `helm lint` and `helm template` extensively during development.
*   **Versioning**: Follow SemVer for chart versions in `Chart.yaml`.

## 🧑‍💻 Chart Development & Testing (within `helm/k8s-pizza-observability-chart/`)

*   **Lint Chart**:
    ```bash
    helm lint .
    ```
*   **Template Chart (Dry Run)**:
    ```bash
    helm template my-release . -f values.yaml -n test-namespace > rendered-manifests.yaml
    # or with debug output
    helm install my-release . --dry-run --debug -n test-namespace -f values.yaml
    ```
*   **Package Chart**:
    ```bash
    helm package .
    ```
    This creates a `.tgz` archive of your chart that can be distributed or uploaded to a Helm repository.

This comprehensive guide should replace the content of `helm/README.md` to provide a more detailed and structured overview of using Helm for the Kubernetes Pizza Observability project.