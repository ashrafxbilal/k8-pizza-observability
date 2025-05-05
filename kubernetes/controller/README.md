# Pizza Order Controller

## Overview

The Pizza Order Controller is a Kubernetes controller that manages PizzaOrder custom resources. It's responsible for processing pizza orders, interacting with the Dominos API, and tracking order status. This controller is a key component of the Kubernetes Pizza Observability project, enabling the system to automatically order pizza when CPU usage exceeds thresholds.

## Architecture

The controller follows the Kubernetes operator pattern and is built using the controller-runtime library. It consists of:

1. **PizzaOrder CRD**: A custom resource definition that represents a pizza order
2. **Reconciler**: The core logic that processes PizzaOrder resources
3. **Dominos API Integration**: Code that interacts with Dominos to place and track orders
4. **RBAC Configuration**: Service account and role bindings for proper permissions

## How It Works

1. **Resource Watching**: The controller watches for PizzaOrder custom resources
2. **Order Processing**: When a new PizzaOrder is created with `placeOrder: true`:
   - Finds the nearest Dominos store based on delivery address
   - Creates an order with specified pizzas and toppings
   - Adds payment information from a referenced Kubernetes Secret
   - Places the order with Dominos
   - Updates the PizzaOrder status with order ID and price
3. **Order Tracking**: Periodically checks order status and updates the PizzaOrder resource

## Deployment

### Prerequisites

- Kubernetes cluster with kubectl access
- PizzaOrder CRD installed
- Dominos payment secret created

### Building the Controller

```bash
# Build the Docker image
docker build -t pizza-controller:latest .

# Push to your registry (if needed)
docker tag pizza-controller:latest ashrafxbilal/pizza-controller:latest
docker push ashrafxbilal/pizza-controller:latest
```

### Deploying with Helm

```bash
# From the project root
helm install pizza-controller helm/k8s-pizza-observability-chart
```

### Manual Deployment

```bash
# Apply the CRD
kubectl apply -f ../pizzaorders.yaml

# Create the payment secret
kubectl apply -f ../dominos-payment-secret.yaml

# Deploy the controller
kubectl apply -f pizza-controller-deployment.yaml
```

## Configuration

### Payment Information

The controller uses a Kubernetes Secret for payment information. Create a secret with the following keys:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dominos-payment-secret
type: Opaque
stringData:
  CardType: "VISA"
  Number: "4111111111111111" # Test card number
  Expiration: "0130" # Format: MMYY (no slashes)
  SecurityCode: "123"
  PostalCode: "10001"
```

### Creating a PizzaOrder

```yaml
apiVersion: pizza.bilalashraf.xyz/v1
kind: PizzaOrder
metadata:
  name: k8s-cpu-alert-pizza
spec:
  placeOrder: true
  customer:
    firstName: "Pizza"
    lastName: "Lover"
    email: "pizza@example.com"
  address:
    street: "123 Main St"
    city: "Anytown"
    region: "NY"
    postalCode: "10001"
    phone: "1234567890"
  pizzas:
    - size: "large"
      toppings:
        - "pepperoni"
  paymentSecret:
    name: dominos-payment-secret
```

## Monitoring

The controller logs important events and status updates. You can monitor it using:

```bash
# View controller logs
kubectl logs -f deployment/pizza-controller

# Check PizzaOrder status
kubectl get pizzaorders
kubectl describe pizzaorder k8s-cpu-alert-pizza
```

## Troubleshooting

- **Controller not starting**: Check RBAC permissions and CRD installation
- **Order placement failing**: Verify payment information and Dominos API connectivity
- **Status not updating**: Ensure the controller has permissions to update PizzaOrder status

## Development

### Local Development

```bash
# Run the controller locally
go run pizza-controller.go
```

### Adding Features

The controller is designed to be extensible. Common enhancements include:

- Adding support for more pizza customization options
- Implementing additional payment methods
- Creating a web UI for order management
- Adding metrics for Prometheus monitoring