# Use the official Azure Functions image
FROM mcr.microsoft.com/azure-functions/node:4-node16

# Copy function code
COPY . /home/site/wwwroot

# Copy the unencrypted settings file
COPY container.settings.json /home/site/wwwroot/local.settings.json

# Expose port
EXPOSE 7071

# Set environment variables
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=node