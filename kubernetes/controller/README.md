# Pizza Order Controller: Detailed Documentation

## 🍕 Overview

The Pizza Order Controller is a custom Kubernetes controller that forms the core of the Kubernetes Pizza Observability project. It's responsible for watching `PizzaOrder` custom resources, processing these orders by interacting with the Dominos Pizza API, and updating their status within the Kubernetes cluster. This enables the automated ordering of pizza when specific cluster conditions (like high CPU usage) are met.

## 🏗️ Architecture

The controller is built using Go and the `controller-runtime` library, adhering to the Kubernetes operator pattern. Its main architectural components are:

1.  **`PizzaOrder` Custom Resource Definition (CRD)**: Defines the `PizzaOrder` custom resource, which represents a pizza order within the Kubernetes cluster. This CRD includes fields for customer details, delivery address, pizza specifications, and payment information.
2.  **Reconciler (`pizza-controller.go`)**: Contains the primary reconciliation logic. The `Reconcile` function is triggered when `PizzaOrder` resources are created, updated, or deleted. It handles the entire lifecycle of a pizza order.
3.  **Dominos API Integration**: A set of functions responsible for communicating with the Dominos Pizza API. This includes finding the nearest store, validating the order, pricing the order, and placing the order.
4.  **RBAC Configuration (`pizza-controller-deployment.yaml`)**: Defines the necessary `ServiceAccount`, `ClusterRole`, and `ClusterRoleBinding` to grant the controller appropriate permissions to interact with Kubernetes API resources (e.g., `PizzaOrder` CRDs, `Secrets`).

## ⚙️ How It Works

The controller's workflow is as follows:

1.  **Resource Watching**: The controller continuously watches for changes to `PizzaOrder` custom resources in the cluster.
2.  **Order Processing Trigger**: When a new `PizzaOrder` resource is created with the `spec.placeOrder` field set to `true`, or an existing one is updated to this state, the reconciler is invoked.
3.  **Order Validation & Preparation**:
    *   Retrieves customer and delivery details from the `PizzaOrder` spec.
    *   Fetches payment information from a Kubernetes `Secret` referenced in `spec.paymentSecret.name`.
    *   Validates the order details with the Dominos API (e.g., address validation, store lookup).
4.  **Order Placement**:
    *   Prices the order using the Dominos API.
    *   If validation and pricing are successful, places the order with the Dominos API.
5.  **Status Update**: After attempting to place the order, the controller updates the `status` subresource of the `PizzaOrder` CRD with:
    *   `orderId`: The ID returned by Dominos API upon successful order placement.
    *   `status`: The current status of the order (e.g., "Pending", "Placed", "Failed", "Delivered").
    *   `price`: The total price of the order.
    *   `lastUpdateTime`: Timestamp of the last status update.
6.  **Order Tracking (Future Enhancement)**: While the current implementation focuses on order placement, a future enhancement could involve periodic polling of the Dominos API to track the order through its various stages (e.g., preparation, baking, out for delivery) and update the `PizzaOrder` status accordingly.

## 🚀 Deployment

### Prerequisites

*   A running Kubernetes cluster (e.g., Minikube, Kind, AKS, GKE, EKS).
*   `kubectl` configured to communicate with your cluster.
*   The `PizzaOrder` CRD must be installed in the cluster.
*   A Kubernetes `Secret` containing Dominos payment information must be created.
*   Docker (if building the image locally).
*   Helm 3.x (if deploying via Helm).

### Building the Controller (Optional)

If you've made changes to the controller code, you'll need to rebuild the Docker image:

```bash
# Navigate to the controller directory
cd kubernetes/controller

# Build the Docker image
docker build -t your-registry/pizza-controller:latest .

# Push to your container registry (e.g., Docker Hub, ACR, GCR)
# docker login your-registry
docker push your-registry/pizza-controller:latest
```

Make sure to update the image path in `kubernetes/controller/pizza-controller-deployment.yaml` or your Helm `values.yaml` if you use a custom registry or tag.

### Deployment Methods

#### 1. Using Helm (Recommended)

This is the easiest way to deploy the controller along with all its dependencies (CRD, RBAC, etc.).

```bash
# From the project root directory
helm install k8s-pizza helm/k8s-pizza-observability-chart --namespace k8s-pizza
```

Ensure your `values.yaml` for the Helm chart correctly points to the controller image and configures any necessary parameters.

#### 2. Manual Deployment using `kubectl`

If you prefer manual deployment or are not using Helm:

```bash
# 1. Apply the PizzaOrder CRD
kubectl apply -f kubernetes/crds/pizzaorders.yaml

# 2. Create the Dominos Payment Secret (see Configuration section below)
kubectl apply -f kubernetes/dominos-payment-secret.example.yaml # Modify with real data first!

# 3. Deploy the Controller
kubectl apply -f kubernetes/controller/pizza-controller-deployment.yaml
```

## 🛠️ Configuration

### Payment Information (`dominos-payment-secret`)

The controller requires payment information to place orders. This is securely stored in a Kubernetes `Secret`. Create a `Secret` named `dominos-payment-secret` in the same namespace as the controller.

**Example `dominos-payment-secret.yaml`:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dominos-payment-secret
  namespace: k8s-pizza # Or your deployment namespace
type: Opaque
stringData: # Use stringData for base64 auto-encoding by Kubernetes
  CardType: "VISA" # e.g., VISA, MASTERCARD, AMEX
  Number: "4111111111111111" # Your card number (use a test card for development)
  Expiration: "0130" # Format: MMYY (e.g., January 2030)
  SecurityCode: "123" # CVV/CVC
  PostalCode: "90210" # Billing postal code for the card
```

**Apply the secret:**

```bash
kubectl apply -f dominos-payment-secret.yaml
```

**Important Security Note:** Never commit real payment information to your Git repository. Use a placeholder example and create the actual secret directly in your cluster or manage it with a secrets management tool.

### `PizzaOrder` Custom Resource Example

To trigger a pizza order, create a `PizzaOrder` custom resource:

```yaml
apiVersion: pizza.bilalashraf.xyz/v1
kind: PizzaOrder
metadata:
  name: cpu-high-alert-order-1
  namespace: k8s-pizza # Or your deployment namespace
spec:
  placeOrder: true # Set to true to initiate order placement
  customer:
    firstName: "Cluster"
    lastName: "Admin"
    email: "admin@example.com"
    phone: "5551234567"
  address:
    street: "1600 Amphitheatre Parkway"
    city: "Mountain View"
    region: "CA" # State or Province
    postalCode: "94043"
  pizzas:
    - size: "Large" # e.g., Small, Medium, Large
      toppings:
        - "Pepperoni"
        - "Mushrooms"
    - size: "Medium"
      toppings:
        - "Cheese"
  paymentSecret:
    name: "dominos-payment-secret" # Name of the K8s Secret containing payment info
```

**Apply the `PizzaOrder`:**

```bash
kubectl apply -f your-pizza-order.yaml
```

## 🔍 Monitoring & Logging

The controller outputs logs that are crucial for monitoring its activity and troubleshooting issues.

*   **View Controller Logs**:

    ```bash
    # Find the controller pod name
    kubectl get pods -n k8s-pizza -l app=pizza-controller

    # Stream logs from the controller pod (replace <pod-name>)
    kubectl logs -f -n k8s-pizza <pod-name>
    ```

*   **Check `PizzaOrder` Status**:

    ```bash
    # List all pizza orders
    kubectl get pizzaorders -n k8s-pizza

    # Describe a specific pizza order for detailed status
    kubectl describe pizzaorder cpu-high-alert-order-1 -n k8s-pizza
    ```

    The `status` field of the `PizzaOrder` resource will show the `orderId`, `price`, and current `status` (e.g., `Pending`, `Processing`, `Placed`, `Failed`).

## 🔧 Troubleshooting

*   **Controller Pod Not Starting/Crashing**:
    *   Check controller logs (`kubectl logs ...`) for error messages.
    *   Verify RBAC permissions: Ensure the `ServiceAccount` used by the controller has the necessary permissions defined in its `ClusterRole` and `ClusterRoleBinding` to access `PizzaOrder` CRDs and `Secrets`.
    *   Ensure the `PizzaOrder` CRD is correctly installed (`kubectl get crd pizzaorders.pizza.bilalashraf.xyz`).
*   **Order Placement Failing**:
    *   Check controller logs for specific errors from the Dominos API.
    *   Verify the `dominos-payment-secret` exists, is correctly formatted, and contains valid (test) payment details.
    *   Ensure the delivery address is valid and serviceable by Dominos.
    *   Check for network connectivity issues from the controller pod to the Dominos API endpoints.
*   **`PizzaOrder` Status Not Updating**:
    *   Confirm the controller has permissions to update the `status` subresource of `PizzaOrder` objects (this is typically included in the RBAC rules).
    *   Check controller logs for any errors during status updates.

## 🧑‍💻 Development

### Local Development Setup

For developing and testing the controller locally (outside the cluster):

1.  **Ensure Go is installed.**
2.  **Access to a Kubernetes cluster**: Your local `kubectl` should be configured to point to a development cluster where the `PizzaOrder` CRD is installed.
3.  **Environment Variables (Optional)**: If the controller relies on environment variables for configuration (though typically it uses in-cluster config or command-line flags), set them up in your local environment.
4.  **Run the controller**:

    ```bash
    # Navigate to the controller directory
    cd kubernetes/controller

    # Run the main Go program
    go run pizza-controller.go --kubeconfig=/path/to/your/.kube/config
    ```

    This will start the controller on your local machine, watching for `PizzaOrder` resources in the configured Kubernetes cluster.

### Adding Features & Enhancements

The controller is designed to be extensible. Potential areas for enhancement include:

*   **More Pizza Customization**: Add support for different crust types, sauces, and a wider variety of toppings in the `PizzaOrder` spec.
*   **Advanced Order Tracking**: Implement logic to periodically poll the Dominos API for detailed order status updates (e.g., "In the Oven