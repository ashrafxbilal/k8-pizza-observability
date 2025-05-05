// Azure Function to order pizza when CPU usage is high (Debug Version)
const axios = require('axios');

// Mock the Dominos API for testing
// In production, you would use: const pizzaAPI = require('dominos');
const pizzaAPI = {
  Store: {
    find: async (options) => {
      console.log('Finding store with options:', options);
      return { storeID: process.env.STORE_ID || '1234' };
    }
  },
  Customer: function(info) {
    console.log('Creating customer with info:', info);
    this.info = info;
    return this;
  },
  Order: function(options) {
    console.log('Creating order with options:', options);
    this.customer = options.customer;
    this.storeID = options.storeID;
    this.items = [];
    this.payments = [];
    this.price = 19.99;
    
    this.addItem = function(item) {
      console.log('Adding item to order:', item);
      this.items.push(item);
    };
    
    this.place = async function() {
      console.log('Placing order with items:', this.items);
      console.log('Payment details:', this.payments);
      // In a real implementation, this would call the Dominos API
      return {
        orderId: 'TEST-' + Math.floor(Math.random() * 10000),
        estimatedDeliveryTime: '30-45 minutes'
      };
    };
    
    return this;
  },
  Item: function(options) {
    console.log('Creating item with options:', options);
    this.code = options.code;
    this.size = options.size;
    this.quantity = options.quantity;
    return this;
  }
};

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
            PAYMENT_TYPE: process.env.PAYMENT_TYPE,
            PAYMENT_NUMBER: process.env.PAYMENT_NUMBER ? '***' : undefined,
            PAYMENT_EXPIRATION: process.env.PAYMENT_EXPIRATION ? '***' : undefined,
            PAYMENT_CVV: process.env.PAYMENT_CVV ? '***' : undefined,
            PAYMENT_ZIP: process.env.PAYMENT_ZIP ? '***' : undefined,
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
                    street: process.env.DELIVERY_STREET || '123 Main St',
                    city: process.env.DELIVERY_CITY || 'Anytown',
                    region: process.env.DELIVERY_STATE || 'NY',
                    postalCode: process.env.DELIVERY_ZIP || '10001'
                }
            },
            storeID: process.env.STORE_ID || '1234',
            orderDetails: {
                pizzaType: process.env.PIZZA_TYPE || 'onion',
                size: process.env.PIZZA_SIZE || 'large'
            },
            paymentInfo: {
                type: process.env.PAYMENT_TYPE || 'creditcard',
                number: process.env.PAYMENT_NUMBER || '4111111111111111', // Test card number
                expiration: process.env.PAYMENT_EXPIRATION || '01/25',
                cvv: process.env.PAYMENT_CVV || '123',
                zip: process.env.PAYMENT_ZIP || '10001'
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
                // Order pizza directly
                const orderResult = await orderPizza(config);
                context.log('Pizza ordered successfully:', orderResult);
                context.res = {
                    status: 200,
                    body: { message: "Pizza ordered successfully", orderDetails: orderResult }
                };
            } catch (orderError) {
                context.log.error('Error ordering pizza:', orderError);
                context.res = {
                    status: 500,
                    body: { 
                        message: "Error ordering pizza", 
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

async function orderPizza(config) {
    console.log('Starting pizza order process');
    
    try {
        // Find the nearest store
        console.log('Finding nearest store...');
        const nearestStore = await pizzaAPI.Store.find({
            address: config.customerInfo.address
        });
        console.log('Found store:', nearestStore);
        
        // Create a new customer
        console.log('Creating customer...');
        const customer = new pizzaAPI.Customer(config.customerInfo);
        
        // Create a new order
        console.log('Creating order...');
        const order = new pizzaAPI.Order({
            customer: customer,
            storeID: nearestStore.storeID || config.storeID
        });
        
        // Add items to the order
        console.log('Adding items to order...');
        order.addItem(new pizzaAPI.Item({
            code: config.orderDetails.pizzaType,
            size: config.orderDetails.size,
            quantity: 1
        }));
        
        // Add payment information
        console.log('Adding payment information...');
        order.payments.push({
            type: config.paymentInfo.type,
            amount: order.price,
            cardNumber: config.paymentInfo.number,
            expiration: config.paymentInfo.expiration,
            securityCode: config.paymentInfo.cvv,
            postalCode: config.paymentInfo.zip
        });
        
        // Place the order
        console.log('Placing order...');
        const orderResult = await order.place();
        console.log('Order placed successfully:', orderResult);
        
        return {
            orderId: orderResult.orderId,
            price: order.price,
            estimatedDeliveryTime: orderResult.estimatedDeliveryTime
        };
    } catch (error) {
        console.error('Error in orderPizza function:', error);
        throw error;
    }
}

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
                            value: `${config.customerInfo.address.street}, ${config.customerInfo.address.city}, ${config.customerInfo.address.region} ${config.customerInfo.address.postalCode}`,
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