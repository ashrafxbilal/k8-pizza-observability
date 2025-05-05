// Azure Function to handle Prometheus alerts and create Kubernetes PizzaOrder resources
const axios = require('axios');
const KubernetesClient = require('./k8s-client');

module.exports = async function (context, req) {
    context.log('Pizza order webhook triggered');
    
    try {
        // Validate request body
        if (!req.body) {
            context.log.error('Request body is missing');
            context.res = {
                status: 400,
                body: { message: "Request body is required" }
            };
            return;
        }
        
        // Log the entire request for debugging
        context.log('Request headers:', req.headers);
        context.log('Request body:', JSON.stringify(req.body, null, 2));
        
        // Handle status check requests
        if (req.method === 'GET' && req.query.resource) {
            return await handleStatusCheck(context, req);
        }

        // Handle Slack confirmation
        if (req.body.confirmationSource === 'slack' && req.body.orderConfirmed) {
            return await handleSlackConfirmation(context, req);
        }
        
        // Parse the alert from Prometheus AlertManager
        const alertData = req.body;
        
        // Validate alert data structure
        if (!alertData.alerts || !Array.isArray(alertData.alerts) || alertData.alerts.length === 0) {
            context.log.error('Invalid alert data structure');
            context.res = {
                status: 400,
                body: { message: "Invalid alert data structure", expectedFormat: "{ alerts: [{ status, labels, annotations }] }" }
            };
            return;
        }

        // Check if this is a high CPU alert
        const isHighCPUAlert = alertData.alerts.some(alert => 
            alert.labels && 
            alert.labels.alertname === 'HighCPUUsage' && 
            alert.status === 'firing'
        );

        if (!isHighCPUAlert) {
            context.log('Not a high CPU alert or alert resolved. No pizza needed.');
            context.res = {
                status: 200,
                body: { message: "Alert received but no action taken" }
            };
            return;
        }

        // Log environment variables (without sensitive data)
        context.log('Environment variables:', {
            CUSTOMER_FIRST_NAME: process.env.CUSTOMER_FIRST_NAME,
            CUSTOMER_LAST_NAME: process.env.CUSTOMER_LAST_NAME,
            CUSTOMER_EMAIL: process.env.CUSTOMER_EMAIL ? '***@***' : undefined,
            CUSTOMER_PHONE: process.env.CUSTOMER_PHONE ? '***' : undefined,
            DELIVERY_STREET: process.env.DELIVERY_STREET ? '***' : undefined,
            DELIVERY_CITY: process.env.DELIVERY_CITY,
            DELIVERY_STATE: process.env.DELIVERY_STATE,
            DELIVERY_ZIP: process.env.DELIVERY_ZIP ? '***' : undefined,
            STORE_ID: process.env.STORE_ID,
            PIZZA_TYPE: process.env.PIZZA_TYPE,
            PIZZA_SIZE: process.env.PIZZA_SIZE,
            PAYMENT_SECRET_NAME: process.env.PAYMENT_SECRET_NAME,
            K8S_NAMESPACE: process.env.K8S_NAMESPACE,
            SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL ? '***' : undefined
        });

        // Get configuration from environment variables
        const config = {
            customerInfo: {
                firstName: process.env.CUSTOMER_FIRST_NAME || 'Pizza',
                lastName: process.env.CUSTOMER_LAST_NAME || 'Lover',
                email: process.env.CUSTOMER_EMAIL || 'pizza@example.com',
                phone: process.env.CUSTOMER_PHONE || '1234567890',
                address: {
                    Street: process.env.DELIVERY_STREET || '123 Main St',
                    City: process.env.DELIVERY_CITY || 'Anytown',
                    Region: process.env.DELIVERY_STATE || 'NY',
                    PostalCode: process.env.DELIVERY_ZIP || '10001'
                }
            },
            storeID: process.env.STORE_ID || '1234',
            orderDetails: {
                pizzaType: process.env.PIZZA_TYPE || 'pepperoni',
                size: process.env.PIZZA_SIZE || 'large'
            },
            slackWebhookUrl: process.env.SLACK_WEBHOOK_URL
        };

        // Check if Slack integration is enabled
        if (config.slackWebhookUrl) {
            try {
                // Send Slack notification for confirmation
                await sendSlackNotification(config.slackWebhookUrl, alertData, config);
                context.log('Slack notification sent for confirmation');
                context.res = {
                    status: 200,
                    body: { message: "Alert received, Slack notification sent for confirmation" }
                };
            } catch (slackError) {
                context.log.error('Error sending Slack notification:', slackError);
                context.res = {
                    status: 500,
                    body: { 
                        message: "Error sending Slack notification", 
                        error: slackError.message,
                        stack: slackError.stack
                    }
                };
            }
        } else {
            try {
                // Create PizzaOrder resource directly
                const k8sClient = new KubernetesClient();
                const orderResult = await k8sClient.createPizzaOrder(config, alertData);
                context.log('PizzaOrder resource created:', orderResult);
                context.res = {
                    status: 200,
                    body: { 
                        message: "PizzaOrder resource created successfully", 
                        resourceName: orderResult.name,
                        namespace: orderResult.namespace
                    }
                };
            } catch (orderError) {
                context.log.error('Error creating PizzaOrder resource:', orderError);
                context.res = {
                    status: 500,
                    body: { 
                        message: "Error creating PizzaOrder resource", 
                        error: orderError.message,
                        stack: orderError.stack
                    }
                };
            }
        }
    } catch (error) {
        context.log.error('Unhandled error processing alert:', error);
        context.res = {
            status: 500,
            body: { 
                message: "Unhandled error processing alert", 
                error: error.message,
                stack: error.stack
            }
        };
    }
};

/**
 * Handle status check requests for PizzaOrder resources
 * @param {Object} context - Azure Function context
 * @param {Object} req - HTTP request
 * @returns {Promise<void>}
 */
async function handleStatusCheck(context, req) {
    const resourceName = req.query.resource;
    const namespace = req.query.namespace || 'default';
    
    try {
        const k8sClient = new KubernetesClient();
        const status = await k8sClient.getPizzaOrderStatus(resourceName, namespace);
        
        context.res = {
            status: 200,
            body: status
        };
    } catch (error) {
        context.log.error(`Error getting status for resource ${resourceName}:`, error);
        context.res = {
            status: 500,
            body: { 
                message: `Error getting status for resource ${resourceName}`, 
                error: error.message,
                stack: error.stack
            }
        };
    }
}

/**
 * Handle Slack confirmation to create PizzaOrder resource
 * @param {Object} context - Azure Function context
 * @param {Object} req - HTTP request
 * @returns {Promise<void>}
 */
async function handleSlackConfirmation(context, req) {
    const alertDetails = req.body.alertDetails;
    
    // Extract configuration from alert details
    const config = {
        customerInfo: {
            firstName: process.env.CUSTOMER_FIRST_NAME || 'Pizza',
            lastName: process.env.CUSTOMER_LAST_NAME || 'Lover',
            email: process.env.CUSTOMER_EMAIL || 'pizza@example.com',
            phone: process.env.CUSTOMER_PHONE || '1234567890',
            address: {
                Street: process.env.DELIVERY_STREET || '123 Main St',
                City: process.env.DELIVERY_CITY || 'Anytown',
                Region: process.env.DELIVERY_STATE || 'NY',
                PostalCode: process.env.DELIVERY_ZIP || '10001'
            }
        },
        storeID: process.env.STORE_ID || '1234',
        orderDetails: {
            pizzaType: getPizzaTypeFromAlertDetails(alertDetails) || process.env.PIZZA_TYPE || 'pepperoni',
            size: getPizzaSizeFromAlertDetails(alertDetails) || process.env.PIZZA_SIZE || 'large'
        }
    };
    
    try {
        // Create PizzaOrder resource
        const k8sClient = new KubernetesClient();
        const orderResult = await k8sClient.createPizzaOrder(config, { alerts: [{ labels: { alertname: 'HighCPUUsage' } }] });
        context.log('PizzaOrder resource created from Slack confirmation:', orderResult);
        
        context.res = {
            status: 200,
            body: { 
                message: "PizzaOrder resource created successfully from Slack confirmation", 
                resourceName: orderResult.name,
                namespace: orderResult.namespace
            }
        };
    } catch (error) {
        context.log.error('Error creating PizzaOrder resource from Slack confirmation:', error);
        context.res = {
            status: 500,
            body: { 
                message: "Error creating PizzaOrder resource from Slack confirmation", 
                error: error.message,
                stack: error.stack
            }
        };
    }
}

/**
 * Send Slack notification for pizza order confirmation
 * @param {string} webhookUrl - Slack webhook URL
 * @param {Object} alertData - Alert data from Prometheus
 * @param {Object} config - Configuration for the pizza order
 * @returns {Promise<Object>} - Response from Slack API
 */
async function sendSlackNotification(webhookUrl, alertData, config) {
    console.log('Sending Slack notification...');
    
    try {
        // Format the alert information
        const alertInfo = alertData.alerts.map(alert => {
            return {
                title: alert.labels.alertname,
                value: alert.annotations.description,
                short: false
            };
        });
        
        // Create the Slack message payload
        const message = {
            text: "🍕 High CPU Alert - Pizza Time? 🍕",
            attachments: [
                {
                    color: "#ff0000",
                    title: "Kubernetes Cluster CPU Alert",
                    fields: [
                        ...alertInfo,
                        {
                            title: "Pizza Type",
                            value: config.orderDetails.pizzaType,
                            short: true
                        },
                        {
                            title: "Size",
                            value: config.orderDetails.size,
                            short: true
                        },
                        {
                            title: "Delivery Address",
                            value: `${config.customerInfo.address.Street}, ${config.customerInfo.address.City}, ${config.customerInfo.address.Region} ${config.customerInfo.address.PostalCode}`,
                            short: false
                        }
                    ],
                    actions: [
                        {
                            name: "order",
                            text: "Order Pizza",
                            type: "button",
                            style: "primary",
                            value: "order"
                        },
                        {
                            name: "cancel",
                            text: "Cancel",
                            type: "button",
                            style: "danger",
                            value: "cancel"
                        }
                    ],
                    callback_id: "pizza_order",
                    footer: "K8s Pizza Observability",
                    ts: Math.floor(Date.now() / 1000)
                }
            ]
        };
        
        console.log('Slack message payload:', JSON.stringify(message, null, 2));
        
        // Send the message to Slack
        console.log('Posting to Slack webhook...');
        const response = await axios.post(webhookUrl, message);
        console.log('Slack API response:', response.data);
        
        return response.data;
    } catch (error) {
        console.error('Error in sendSlackNotification function:', error);
        throw error;
    }
}

/**
 * Extract pizza type from alert details
 * @param {Array} alertDetails - Alert details from Slack
 * @returns {string} - Pizza type
 */
function getPizzaTypeFromAlertDetails(alertDetails) {
    if (!alertDetails || !Array.isArray(alertDetails)) {
        return null;
    }
    
    const pizzaField = alertDetails.find(field => field.title === 'Pizza Type');
    return pizzaField ? pizzaField.value : null;
}

/**
 * Extract pizza size from alert details
 * @param {Array} alertDetails - Alert details from Slack
 * @returns {string} - Pizza size
 */
function getPizzaSizeFromAlertDetails(alertDetails) {
    if (!alertDetails || !Array.isArray(alertDetails)) {
        return null;
    }
    
    const sizeField = alertDetails.find(field => field.title === 'Size');
    return sizeField ? sizeField.value : null;
}