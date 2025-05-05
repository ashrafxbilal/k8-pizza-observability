// Kubernetes client for Azure Function to create PizzaOrder resources
const k8s = require('@kubernetes/client-node');

class KubernetesClient {
    constructor() {
        try {
            // Try to load the in-cluster config if running inside Kubernetes
            this.kc = new k8s.KubeConfig();
            this.kc.loadFromCluster();
            console.log('Loaded Kubernetes config from cluster');
        } catch (error) {
            // Fall back to loading from default location (~/.kube/config)
            this.kc = new k8s.KubeConfig();
            this.kc.loadFromDefault();
            console.log('Loaded Kubernetes config from default location');
        }

        // Create the Custom Objects API client
        this.k8sApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
    }

    /**
     * Create a PizzaOrder custom resource in Kubernetes
     * @param {Object} config - Configuration for the pizza order
     * @param {Object} alertData - Alert data from Prometheus
     * @returns {Promise<Object>} - The created PizzaOrder resource
     */
    async createPizzaOrder(config, alertData) {
        const timestamp = Date.now();
        const name = `cpu-alert-${timestamp}`;
        
        // Format the pizza order resource
        const pizzaOrder = {
            apiVersion: 'pizza.bilalashraf.xyz/v1',
            kind: 'PizzaOrder',
            metadata: {
                name: name,
                namespace: process.env.K8S_NAMESPACE || 'default',
                labels: {
                    'app.kubernetes.io/created-by': 'k8s-pizza-observability',
                    'alert-name': alertData.alerts[0]?.labels?.alertname || 'unknown',
                    'alert-timestamp': timestamp.toString()
                }
            },
            spec: {
                placeOrder: true,
                customer: {
                    firstName: config.customerInfo.firstName,
                    lastName: config.customerInfo.lastName,
                    email: config.customerInfo.email
                },
                address: {
                    street: config.customerInfo.address.Street,
                    city: config.customerInfo.address.City,
                    region: config.customerInfo.address.Region,
                    postalCode: config.customerInfo.address.PostalCode,
                    phone: config.customerInfo.phone
                },
                pizzas: [
                    {
                        size: this._mapPizzaSize(config.orderDetails.size),
                        toppings: [config.orderDetails.pizzaType]
                    }
                ],
                paymentSecret: {
                    name: process.env.PAYMENT_SECRET_NAME || 'dominos-payment-secret'
                }
            }
        };

        try {
            const response = await this.k8sApi.createNamespacedCustomObject(
                'pizza.bilalashraf.xyz', // group
                'v1', // version
                process.env.K8S_NAMESPACE || 'default', // namespace
                'pizzaorders', // plural
                pizzaOrder // body
            );

            console.log(`Created PizzaOrder resource: ${name}`);
            return {
                name: name,
                namespace: process.env.K8S_NAMESPACE || 'default',
                resource: response.body
            };
        } catch (error) {
            console.error('Error creating PizzaOrder resource:', error);
            throw error;
        }
    }

    /**
     * Get the status of a PizzaOrder resource
     * @param {string} name - Name of the PizzaOrder resource
     * @param {string} namespace - Namespace of the PizzaOrder resource
     * @returns {Promise<Object>} - The status of the PizzaOrder resource
     */
    async getPizzaOrderStatus(name, namespace = 'default') {
        try {
            const response = await this.k8sApi.getNamespacedCustomObject(
                'pizza.bilalashraf.xyz',
                'v1',
                namespace,
                'pizzaorders',
                name
            );

            const resource = response.body;
            return {
                name: resource.metadata.name,
                status: resource.status || {},
                placed: resource.status?.placed || false,
                delivered: resource.status?.delivered || false,
                price: resource.status?.price || 'Unknown',
                orderId: resource.status?.orderId || 'Unknown',
                store: resource.status?.store || {},
                tracker: resource.status?.tracker || {}
            };
        } catch (error) {
            console.error(`Error getting PizzaOrder status for ${name}:`, error);
            throw error;
        }
    }

    /**
     * Map pizza size from Azure Function format to PizzaOrder format
     * @param {string} size - Size from Azure Function config
     * @returns {string} - Size for PizzaOrder resource
     */
    _mapPizzaSize(size) {
        const sizeMap = {
            'small': 'small',
            'medium': 'medium',
            'large': 'large',
            'x-large': 'large'
        };

        return sizeMap[size.toLowerCase()] || 'large';
    }
}

module.exports = KubernetesClient;