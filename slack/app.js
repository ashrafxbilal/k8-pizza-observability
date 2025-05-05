// Slack App for Pizza Order Confirmation with Kubernetes Integration
const { App } = require('@slack/bolt');
const axios = require('axios');

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Store active polling intervals
const activePolls = new Map();

// Handle the "Order Pizza" button click
app.action('order', async ({ body, ack, say }) => {
  // Acknowledge the button click
  await ack();

  // Extract the original message details
  const originalMessage = body.message;
  const alertDetails = originalMessage.attachments[0].fields;

  // Send a confirmation message
  await say({
    text: `:pizza: Pizza order confirmed! :pizza:`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":pizza: *Pizza order confirmed!* :pizza:"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Your pizza is being ordered now via Kubernetes. It will be delivered to the address specified in the alert."
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Type:* ${getPizzaType(alertDetails)}`
          },
          {
            type: "mrkdwn",
            text: `*Size:* ${getPizzaSize(alertDetails)}`
          },
          {
            type: "mrkdwn",
            text: `*Delivery Address:* ${getDeliveryAddress(alertDetails)}`
          }
        ]
      }
    ]
  });

  // Call the Azure Function to create PizzaOrder resource
  try {
    const response = await axios.post(process.env.AZURE_FUNCTION_URL, {
      confirmationSource: 'slack',
      alertDetails: alertDetails,
      orderConfirmed: true,
      createK8sResource: true
    });

    // Send resource creation confirmation
    const resourceMessage = await say({
      text: `PizzaOrder resource created successfully!`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*PizzaOrder resource created successfully!*`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Resource Name:* ${response.data.resourceName}`
            },
            {
              type: "mrkdwn",
              text: `*Namespace:* ${response.data.namespace}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "_Waiting for order processing..._"
          }
        }
      ]
    });

    // Start polling for order status updates
    startOrderStatusPolling(response.data.resourceName, response.data.namespace, say, resourceMessage.ts);
  } catch (error) {
    console.error('Error creating PizzaOrder resource:', error);
    await say({
      text: `:x: Error creating PizzaOrder resource: ${error.message}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:x: *Error creating PizzaOrder resource*: ${error.message}`
          }
        }
      ]
    });
  }
});

// Handle the "Cancel" button click
app.action('cancel', async ({ body, ack, say }) => {
  // Acknowledge the button click
  await ack();

  // Send a cancellation message
  await say({
    text: "Pizza order cancelled.",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":x: *Pizza order cancelled.* Your servers will have to manage without pizza for now."
        }
      }
    ]
  });
});

/**
 * Start polling for order status updates
 * @param {string} resourceName - Name of the PizzaOrder resource
 * @param {string} namespace - Namespace of the PizzaOrder resource
 * @param {Function} say - Slack say function for sending messages
 * @param {string} threadTs - Thread timestamp for updating the message
 */
async function startOrderStatusPolling(resourceName, namespace, say, threadTs) {
  console.log(`Starting status polling for ${resourceName} in namespace ${namespace}`);
  
  // Clear any existing polling for this resource
  if (activePolls.has(resourceName)) {
    clearInterval(activePolls.get(resourceName));
  }
  
  // Create a new polling interval
  const pollInterval = setInterval(async () => {
    try {
      // Get the current status of the PizzaOrder resource
      const response = await axios.get(`${process.env.AZURE_FUNCTION_URL}?resource=${resourceName}&namespace=${namespace}`);
      const status = response.data;
      
      console.log(`Status update for ${resourceName}:`, status);
      
      // Check if the order has been delivered
      if (status.delivered) {
        // Stop polling
        clearInterval(activePolls.get(resourceName));
        activePolls.delete(resourceName);
        
        // Send delivery confirmation
        await say({
          text: `:white_check_mark: Your pizza has been delivered!`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `:white_check_mark: *Your pizza has been delivered!*`
              }
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Order ID:* ${status.orderId}`
                },
                {
                  type: "mrkdwn",
                  text: `*Price:* $${status.price}`
                },
                {
                  type: "mrkdwn",
                  text: `*Delivered:* ${formatTimestamp(status.tracker?.delivered)}`
                }
              ]
            }
          ]
        });
      } 
      // Check if the order has been placed
      else if (status.placed && status.orderId) {
        // Update with current status
        let statusText = "Order placed";
        let statusEmoji = ":pizza:";
        
        // Determine the current stage of the order
        if (status.tracker?.outForDelivery) {
          statusText = "Out for delivery";
          statusEmoji = ":truck:";
        } else if (status.tracker?.qualityCheck) {
          statusText = "Quality check";
          statusEmoji = ":white_check_mark:";
        } else if (status.tracker?.bake) {
          statusText = "Baking";
          statusEmoji = ":fire:";
        } else if (status.tracker?.prep) {
          statusText = "Preparation";
          statusEmoji = ":cook:";
        }
        
        // Send status update
        await say({
          text: `${statusEmoji} Order status update: ${statusText}`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${statusEmoji} *Order status update:* ${statusText}`
              }
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*Order ID:* ${status.orderId}`
                },
                {
                  type: "mrkdwn",
                  text: `*Price:* $${status.price}`
                }
              ]
            },
            {
              type: "section",
              fields: getTrackerFields(status.tracker)
            }
          ]
        });
      }
      // Order not yet placed
      else {
        await say({
          text: `:hourglass: Waiting for order to be processed...`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `:hourglass: *Waiting for order to be processed...*`
              }
            }
          ]
        });
      }
    } catch (error) {
      console.error(`Error polling status for ${resourceName}:`, error);
    }
  }, 60000); // Poll every minute
  
  // Store the polling interval
  activePolls.set(resourceName, pollInterval);
}

/**
 * Format tracker fields for Slack message
 * @param {Object} tracker - Tracker object from PizzaOrder status
 * @returns {Array} - Array of field objects for Slack message
 */
function getTrackerFields(tracker) {
  if (!tracker) return [];
  
  const fields = [];
  
  if (tracker.prep) {
    fields.push({
      type: "mrkdwn",
      text: `*Prep:* ${formatTimestamp(tracker.prep)}`
    });
  }
  
  if (tracker.bake) {
    fields.push({
      type: "mrkdwn",
      text: `*Bake:* ${formatTimestamp(tracker.bake)}`
    });
  }
  
  if (tracker.qualityCheck) {
    fields.push({
      type: "mrkdwn",
      text: `*Quality Check:* ${formatTimestamp(tracker.qualityCheck)}`
    });
  }
  
  if (tracker.outForDelivery) {
    fields.push({
      type: "mrkdwn",
      text: `*Out For Delivery:* ${formatTimestamp(tracker.outForDelivery)}`
    });
  }
  
  return fields;
}

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  } catch (error) {
    return timestamp;
  }
}

// Helper functions to extract information from alert details
function getPizzaType(fields) {
  const pizzaField = fields.find(field => field.title === 'Pizza Type');
  return pizzaField ? pizzaField.value : 'pepperoni';
}

function getPizzaSize(fields) {
  const sizeField = fields.find(field => field.title === 'Size');
  return sizeField ? sizeField.value : 'large';
}

function getDeliveryAddress(fields) {
  const addressField = fields.find(field => field.title === 'Delivery Address');
  return addressField ? addressField.value : 'Default Address';
}

// Start the app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack Pizza Order app with Kubernetes integration is running!');
})();