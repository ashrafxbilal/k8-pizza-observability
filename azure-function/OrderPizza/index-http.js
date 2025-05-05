// Azure Function to order pizza when CPU usage is high (Production Version)
const axios = require('axios');
const pizzaAPI = require('dominos'); // Using the real Dominos API

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
                firstName: process.env.CUSTOMER_FIRST_NAME || 'Bilal',
                lastName: process.env.CUSTOMER_LAST_NAME || 'Ashraf',
                email: process.env.CUSTOMER_EMAIL || 'pizzalover@example.com',
                phone: process.env.CUSTOMER_PHONE || '1234567890',
                address: {
                    Street: process.env.DELIVERY_STREET || '123 main st',
                    City: process.env.DELIVERY_CITY || 'anytown',
                    Region: process.env.DELIVERY_STATE || 'nY',
                    PostalCode: process.env.DELIVERY_ZIP || '10001'
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
    context.log('Starting pizza order process with real Dominos API');
    
    try {
        // Create a customer object with the provided information
        context.log('Creating customer...');
        const customer = new pizzaAPI.Customer({
            firstName: config.customerInfo.firstName,
            lastName: config.customerInfo.lastName,
            email: config.customerInfo.email,
            phone: config.customerInfo.phone,
            address: config.customerInfo.address
        });
        
        // Find nearby stores
        context.log('Finding nearby stores...');
        const nearbyStores = await new pizzaAPI.NearbyStores(customer.address);
        
        // Find the closest delivery store
        context.log('Finding closest delivery store...');
        let storeID = config.storeID;
        let distance = 100;
        
        for (const store of nearbyStores.stores) {
            if (
                store.IsOnlineCapable &&
                store.IsDeliveryStore &&
                store.IsOpen &&
                store.ServiceIsOpen.Delivery &&
                store.MinDistance < distance
            ) {
                distance = store.MinDistance;
                storeID = store.StoreID;
                context.log(`Found closer store: ${storeID}, distance: ${distance}`);
            }
        }
        
        if (!storeID) {
            throw new Error('No open Dominos stores found for delivery');
        }
        
        // Create an order for the customer
        context.log('Creating order...');
        const order = new pizzaAPI.Order(customer);
        order.storeID = storeID;
        
        // Add pizza to the order
        // Using standard product codes from Dominos menu
        context.log('Adding pizza to order...');
        const pizza = new pizzaAPI.Item({
            code: '16SCREEN', // 16 inch hand tossed pizza
            options: {
                X: {'1/1': '1'}, // Normal sauce
                C: {'1/1': '1'}, // Normal cheese
                // Add toppings based on pizza type
                ...(config.orderDetails.pizzaType === 'onion' ? {P: {'1/1': '1'}} : {}),
                ...(config.orderDetails.pizzaType === 'cheese' ? {} : {}),
                ...(config.orderDetails.pizzaType === 'veggie' ? {K: {'1/1': '1'}, O: {'1/1': '1'}, G: {'1/1': '1'}} : {})
            },
            quantity: 1
        });
        
        order.addItem(pizza);
        
        // Validate the order
        context.log('Validating order...');
        await order.validate();
        
        // Price the order
        context.log('Pricing order...');
        await order.price();
        
        // Add payment information
        context.log('Adding payment information...');
        const payment = new pizzaAPI.Payment({
            amount: order.amountsBreakdown.customer,
            number: config.paymentInfo.number,
            expiration: config.paymentInfo.expiration,
            securityCode: config.paymentInfo.cvv,
            postalCode: config.paymentInfo.zip,
            tipAmount: 5 // Add a $5 tip for the delivery driver
        });
        
        order.payments.push(payment);
        
        // Place the order
        context.log('Placing order...');
        const orderResult = await order.place();
        context.log('Order placed successfully:', orderResult);
        
        return {
            orderId: orderResult.orderId,
            price: order.amountsBreakdown.customer,
            estimatedDeliveryTime: orderResult.estimatedDeliveryTime || '30-45 minutes',
            trackingUrl: orderResult.trackingUrl || 'https://www.dominos.com/en/pages/tracker'
        };
    } catch (error) {
        context.log.error('Error in orderPizza function:', error);
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