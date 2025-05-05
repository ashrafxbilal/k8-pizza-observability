// Local test script for the Azure Function
// This script simulates the HTTP request that would be sent to the function

const fs = require('fs');
const path = require('path');

// Determine which version of the function to test
const useDebugVersion = true;
const functionModule = useDebugVersion 
  require('./index-mock.js');

// Create a mock context object
const context = {
  log: {
    // Standard logging
    info: console.log,
    error: console.error,
    warn: console.warn,
    verbose: console.log
  },
  // Add the standard log function that combines all levels
  log: function() {
    console.log(...arguments);
  },
  // Will be set by the function
  res: null
};

// Create a mock request object with the same payload from the curl command
const req = {
  headers: {
    'Content-Type': 'application/json'
  },
  body: {
    "receiver": "pizza-webhook",
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "HighCPUUsage",
          "severity": "warning"
        },
        "annotations": {
          "description": "CPU usage is above 80% for 5 minutes on instance-123",
          "summary": "High CPU usage detected"
        }
      }
    ],
    "groupLabels": {
      "alertname": "HighCPUUsage"
    },
    "commonLabels": {
      "alertname": "HighCPUUsage",
      "severity": "warning"
    },
    "commonAnnotations": {
      "description": "CPU usage is above 80% for 5 minutes on instance-123",
      "summary": "High CPU usage detected"
    },
    "externalURL": "http://prometheus:9093"
  }
};

// Set environment variables for testing
process.env.CUSTOMER_FIRST_NAME = 'Test';
process.env.CUSTOMER_LAST_NAME = 'User';
process.env.CUSTOMER_EMAIL = 'test@example.com';
process.env.CUSTOMER_PHONE = '1234567890';
process.env.DELIVERY_STREET = '123 Test St';
process.env.DELIVERY_CITY = 'Testville';
process.env.DELIVERY_STATE = 'TS';
process.env.DELIVERY_ZIP = '12345';
process.env.STORE_ID = '1234';
process.env.PIZZA_TYPE = 'pepperoni';
process.env.PIZZA_SIZE = 'large';
process.env.PAYMENT_TYPE = 'creditcard';
process.env.PAYMENT_NUMBER = '4111111111111111';
process.env.PAYMENT_EXPIRATION = '01/25';
process.env.PAYMENT_CVV = '123';
process.env.PAYMENT_ZIP = '12345';
process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/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';

// Run the function
async function runTest() {
  console.log('\n===== STARTING LOCAL TEST =====\n');
  console.log('Testing with payload:', JSON.stringify(req.body, null, 2));
  console.log('\n==============================\n');
  
  try {
    // Call the function with our mock context and request
    await functionModule(context, req);
    
    // Output the response
    console.log('\n===== FUNCTION RESPONSE =====\n');
    console.log('Status:', context.res.status);
    console.log('Body:', JSON.stringify(context.res.body, null, 2));
    console.log('\n============================\n');
  } catch (error) {
    console.error('\n===== TEST FAILED =====\n');
    console.error('Error:', error);
    console.error('\n=====================\n');
  }
}

// Run the test
runTest().catch(console.error);

// Troubleshooting tips
console.log('\n===== TROUBLESHOOTING TIPS =====\n');
console.log('1. If you see "Cannot find module \'dominos\'", run: npm install dominos');
console.log('2. If you see "Cannot find module \'axios\'", run: npm install axios');
console.log('3. Check that all environment variables are set correctly');
console.log('4. For Slack integration issues, verify the webhook URL');
console.log('5. For Dominos API issues, check the API documentation or use the debug version');
console.log('\n===============================\n');