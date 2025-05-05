# Slack Integration for Pizza Ordering

## Overview

This directory contains the Slack app integration for the Kubernetes Pizza Observability project. The Slack app provides a user-friendly interface for receiving notifications about high CPU usage alerts and confirming pizza orders. It serves as an optional component that enhances the user experience by allowing team members to approve or reject pizza orders before they're placed.

## Features

- **Alert Notifications**: Receive real-time notifications in Slack when CPU usage exceeds thresholds
- **Order Confirmation**: Interactive buttons to approve or reject pizza orders
- **Order Tracking**: Updates on pizza order status (preparation, baking, delivery)
- **Custom Commands**: Slash commands for checking cluster status and manually triggering orders

## Architecture

The Slack app consists of:

1. **Bot Application**: A Node.js application that handles Slack events and interactions
2. **Event Subscriptions**: Configured to receive events from Slack
3. **Interactive Components**: Buttons and menus for user interactions
4. **Slash Commands**: Custom commands for direct user actions
5. **API Integration**: Communication with the Azure Function and Kubernetes API

## Setup

### Prerequisites

- Slack workspace with admin privileges
- Node.js 14.x or later
- npm or yarn
- Public URL for your Slack app (for development, you can use ngrok)

### Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" and select "From scratch"
3. Name your app (e.g., "Pizza Monitor") and select your workspace
4. Click "Create App"

### Configure App Features

#### Bot Token Scopes

1. In the left sidebar, click "OAuth & Permissions"
2. Under "Scopes", add the following Bot Token Scopes:
   - `chat:write`
   - `chat:write.public`
   - `commands`
   - `incoming-webhook`

#### Slash Commands

1. In the left sidebar, click "Slash Commands"
2. Click "Create New Command"
3. Fill in the details:
   - Command: `/pizza-status`
   - Request URL: `https://your-app-url.com/slack/commands`
   - Short Description: "Check pizza order status"
   - Click "Save"
4. Repeat for additional commands:
   - `/pizza-order`: "Manually trigger a pizza order"
   - `/cluster-status`: "Check Kubernetes cluster status"

#### Interactive Components

1. In the left sidebar, click "Interactive Components"
2. Toggle "Interactivity" to On
3. Set the Request URL to `https://your-app-url.com/slack/interactions`
4. Click "Save Changes"

#### Event Subscriptions

1. In the left sidebar, click "Event Subscriptions"
2. Toggle "Enable Events" to On
3. Set the Request URL to `https://your-app-url.com/slack/events`
4. Under "Subscribe to bot events", add:
   - `message.channels`
   - `app_mention`
5. Click "Save Changes"

#### Install App to Workspace (optional)

1. In the left sidebar, click "Install App"
2. Click "Install to Workspace"
3. Review the permissions and click "Allow"

### Environment Configuration

Create a `.env` file with the following variables:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
AZURE_FUNCTION_URL=https://your-function-url.azurewebsites.net/api/OrderPizza
KUBERNETES_API_URL=https://your-k8s-api
KUBERNETES_TOKEN=your-k8s-token
```

### Installation

```bash
# Install dependencies
npm install

# Start the app
npm start
```

## Development

### Local Testing with ngrok

For local development, you can use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm start

# In another terminal, expose your app
ngrok http 3000
```

Update your Slack app configuration with the ngrok URL.

### Customizing Messages

You can customize the notification messages by modifying the templates in the `messages` directory.

## Deployment

### Docker Deployment

```bash
# Build the Docker image
docker build -t pizza-slack-app .

# Run the container
docker run -d -p 3000:3000 --env-file .env pizza-slack-app
```

### Kubernetes Deployment

```bash
# Apply the Kubernetes manifest
kubectl apply -f kubernetes/slack-app-deployment.yaml
```

## Usage

### Receiving Notifications

When CPU usage exceeds the configured threshold, the Slack app will send a notification to the configured channel with options to approve or reject the pizza order.

### Using Slash Commands

- `/pizza-status`: Check the status of current pizza orders
- `/pizza-order`: Manually trigger a pizza order
- `/cluster-status`: Check the status of your Kubernetes cluster

## Troubleshooting

### Common Issues

- **App not receiving events**: Verify your Request URLs and Event Subscriptions
- **Authentication errors**: Check your bot token and signing secret
- **Connection issues**: Ensure your app can reach the Azure Function and Kubernetes API

### Logs

Check the application logs for detailed error information:

```bash
# View logs in Docker
docker logs pizza-slack-app

# View logs in Kubernetes
kubectl logs deployment/slack-app
```

## Security Considerations

- Store sensitive tokens and secrets securely (use Kubernetes Secrets in production)
- Validate Slack requests using the signing secret
- Implement proper authorization for Kubernetes API access
- Consider using HTTPS for all communications

## Contributing

Contributions to improve the Slack integration are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request