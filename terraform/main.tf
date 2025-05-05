provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
  client_id       = var.client_id
  client_secret   = var.client_secret
}

resource "azurerm_resource_group" "k8s" {
  name     = var.resource_group_name
  location = var.location
  
  tags = {
    environment = var.environment
  }
}

resource "azurerm_log_analytics_workspace" "pizza-log" {
  name                = "aks-log-workspace"
  location            = azurerm_resource_group.k8s.location
  resource_group_name = azurerm_resource_group.k8s.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_kubernetes_cluster" "k8s" {
  name                = var.cluster_name
  location            = azurerm_resource_group.k8s.location
  resource_group_name = azurerm_resource_group.k8s.name
  dns_prefix          = var.dns_prefix

  default_node_pool {
    name       = "default"
    node_count = var.node_count
    vm_size    = var.vm_size
    auto_scaling_enabled = true
    min_count  = var.min_node_count
    max_count  = var.max_node_count
  }

  identity {
    type = "SystemAssigned"
  }

    oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.pizza-log.id
  }
  

  tags = {
    environment = var.environment
  }
}