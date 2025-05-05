# Security Considerations for Kubernetes Pizza Observability

This document outlines important security considerations for the Kubernetes Pizza Observability project, particularly when sharing or deploying the code.

## Sensitive Information Management

### Credentials and Secrets

This project contains several types of sensitive information that should NEVER be committed to version control:

1. **Terraform State and Variables**
   - `terraform.tfstate` contains sensitive Azure credentials and infrastructure details
   - `terraform.tfvars` contains Azure subscription IDs, tenant IDs, and service principal credentials
   - Use a secure backend for Terraform state (Azure Storage, HashiCorp Consul)

2. **Environment Files**
   - `.env` files contain Slack tokens and signing secrets
   - `local.settings.json` and `container.settings.json` contain Azure Function configuration
   - Use the provided `.env.example` and `*.settings.json.example` files as templates

3. **Kubernetes Secrets**
   - `dominos-payment-secret.yaml` contains payment information
   - Use the provided `dominos-payment-secret.example.yaml` as a template

### Best Practices

1. **Use Environment Templates**
   - Copy the `.example` files and fill in your actual credentials
   - Keep the actual configuration files local and never commit them

2. **Utilize .gitignore**
   - A `.gitignore` file has been provided to prevent accidental commits of sensitive files
   - Verify that sensitive files are properly excluded before pushing

3. **Secrets Management in Production**
   - For production deployments, consider using:
     - Azure Key Vault for Azure-related secrets
     - Kubernetes Secrets for cluster configuration
     - HashiCorp Vault for comprehensive secrets management

4. **Rotate Credentials Regularly**
   - Implement a process for regular rotation of:
     - Service principal credentials
     - API keys and tokens
     - Webhook URLs

## Secure Development Workflow

1. **Local Development**
   - Use local environment files for development
   - Never share your local configuration files

2. **CI/CD Pipeline**
   - Use secure environment variables in your CI/CD pipeline
   - Never print secrets in logs
   - Consider using dedicated security scanning tools

3. **Code Review**
   - Implement a thorough code review process
   - Verify no credentials are hardcoded or committed

## Reporting Security Issues

If you discover a security vulnerability in this project, please report it responsibly by:

1. **Do not** create a public GitHub issue
2. Contact the project maintainers directly
3. Provide details of the vulnerability and steps to reproduce

## Additional Resources

- [Azure Security Best Practices](https://docs.microsoft.com/en-us/azure/security/fundamentals/best-practices-and-patterns)
- [Kubernetes Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Terraform Security Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/security.html)