// Slack App for Pizza Order Confirmation
const { App } = require('@slack/bolt');
const axios = require('axios');

// Initialize the Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

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
          text: "Your pizza is being ordered now. It will be delivered to the address specified in the alert."
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

  // Call the Azure Function to place the order
  try {
    const response = await axios.post(process.env.AZURE_FUNCTION_URL, {
      confirmationSource: 'slack',
      alertDetails: alertDetails,
      orderConfirmed: true
    });

    // Send order confirmation details
    if (response.data && response.data.orderDetails) {
      await say({
        text: `Order placed successfully! Order ID: ${response.data.orderDetails.orderId}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Order placed successfully!*`
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Order ID:* ${response.data.orderDetails.orderId}`
              },
              {
                type: "mrkdwn",
                text: `*Price:* $${response.data.orderDetails.price}`
              },
              {
                type: "mrkdwn",
                text: `*Estimated Delivery:* ${response.data.orderDetails.estimatedDeliveryTime}`
              }
            ]
          }
        ]
      });
    }
  } catch (error) {
    console.error('Error placing order:', error);
    await say({
      text: `:x: Error placing order: ${error.message}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:x: *Error placing order*: ${error.message}`
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

// Helper functions to extract information from alert details
function getPizzaType(fields) {
  const pizzaField = fields.find(field => field.title === 'Pizza Type');
  return pizzaField ? pizzaField.value : 'onion';
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
  console.log('⚡️ Slack Pizza Order app is running!');
})();