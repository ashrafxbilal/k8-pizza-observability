# Variables for AKS Terraform Configuration

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "k8s-pizza-rg"
}

variable "location" {
  description = "Azure region to deploy resources"
  type        = string
  default     = "eastus"
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
  default     = "k8s-pizza-cluster"
}

variable "dns_prefix" {
  description = "DNS prefix for the AKS cluster"
  type        = string
  default     = "k8spizza"
}

variable "node_count" {
  description = "Initial number of nodes in the default node pool"
  type        = number
  default     = 2
}

variable "min_node_count" {
  description = "Minimum number of nodes for auto-scaling"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Maximum number of nodes for auto-scaling"
  type        = number
  default     = 3
}

variable "vm_size" {
  description = "Size of the VM for nodes"
  type        = string
  default     = "Standard_B2ms"
}

variable "environment" {
  description = "Environment tag value"
  type        = string
  default     = "Pizza Observability"
}

# Variables for Azure Authentication
variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "tenant_id" {
  description = "Azure tenant ID"
  type        = string
}

variable "client_id" {
  description = "Azure client ID"
  type        = string
}

variable "client_secret" {
  description = "Azure client secret"
  type        = string
  sensitive   = true
}