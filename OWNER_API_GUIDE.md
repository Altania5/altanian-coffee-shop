# Owner API Management Guide for n8n Integration

## Overview

This guide shows how to effectively manage and use the Altanian Coffee Shop API as the owner, with a focus on n8n automation workflows for website editing, information gathering, and automated fixes.

## 1. Initial Setup

### Create Your Owner API Key

```bash
# Create a full-access API key for n8n
curl -X POST http://localhost:5002/api-keys \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Owner Key",
    "description": "Full access key for n8n automation",
    "scope": "full",
    "allowedIPs": ["your-n8n-server-ip"]
  }'
```

**Response:**
```json
{
  "success": true,
  "key": {
    "id": "key-1234567890",
    "name": "n8n Owner Key",
    "key": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
    "scope": "full",
    "allowedIPs": ["your-n8n-server-ip"],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Store API Key in n8n

1. **Environment Variables**: Add to n8n environment
   ```
   ALTANIAN_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   ALTANIAN_API_BASE_URL=http://localhost:5002
   ```

2. **Credentials**: Create HTTP Request credential in n8n
   - **Authentication**: Header Auth
   - **Header Name**: `x-api-key`
   - **Header Value**: `{{ $env.ALTANIAN_API_KEY }}`

## 2. n8n Workflow Templates

### A. Website Information Gathering Workflow

**Purpose**: Automatically collect and monitor website data

```json
{
  "name": "Website Data Collector",
  "nodes": [
    {
      "name": "Get Products",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/products",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Get Orders",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/orders",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Get Users",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/users",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Get Inventory",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/inventory",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Combine Data",
      "type": "n8n-nodes-base.merge",
      "parameters": {
        "mode": "combine"
      }
    },
    {
      "name": "Save to Google Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "parameters": {
        "operation": "append",
        "spreadsheetId": "your-spreadsheet-id",
        "sheetName": "Website Data",
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "timestamp": "={{ new Date().toISOString() }}",
            "products_count": "={{ $json.products.length }}",
            "orders_count": "={{ $json.orders.length }}",
            "users_count": "={{ $json.users.length }}",
            "inventory_items": "={{ $json.inventory.length }}"
          }
        }
      }
    }
  ]
}
```

### B. Automated Website Fixer Workflow

**Purpose**: Automatically fix common website issues

```json
{
  "name": "Website Auto-Fixer",
  "nodes": [
    {
      "name": "Check Low Inventory",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/inventory/unavailable/list",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Filter Low Stock",
      "type": "n8n-nodes-base.filter",
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "leftValue": "={{ $json.quantity }}",
              "rightValue": 10,
              "operator": {
                "type": "number",
                "operation": "lt"
              }
            }
          ],
          "combinator": "and"
        }
      }
    },
    {
      "name": "Update Product Availability",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.ALTANIAN_API_BASE_URL }}/products/{{ $json.productId }}/set-availability",
        "method": "POST",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "body": {
          "isAvailable": false
        }
      }
    },
    {
      "name": "Send Notification",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/notifications/broadcast",
        "method": "POST",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "body": {
          "title": "Inventory Alert",
          "message": "{{ $json.length }} products marked as unavailable due to low stock"
        }
      }
    }
  ]
}
```

### C. Website Editor Workflow

**Purpose**: Automatically update website content

```json
{
  "name": "Website Content Editor",
  "nodes": [
    {
      "name": "Get Current Products",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/products",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Update Product Prices",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{ $env.ALTANIAN_API_BASE_URL }}/products/update/{{ $json._id }}",
        "method": "PUT",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "body": {
          "price": "={{ $json.price * 1.05 }}",
          "description": "={{ $json.description + ' - Updated ' + new Date().toLocaleDateString() }}"
        }
      }
    },
    {
      "name": "Update Suggested Product",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/settings/suggested-product",
        "method": "PUT",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "body": {
          "productId": "={{ $json.products[0]._id }}"
        }
      }
    }
  ]
}
```

## 3. Advanced n8n Workflows

### A. Real-time Monitoring Dashboard

**Purpose**: Monitor website health and performance

```json
{
  "name": "Website Health Monitor",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      }
    },
    {
      "name": "Check API Health",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/api-keys/stats/usage",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Check Rate Limits",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/api-keys/stats/rate-limits",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Check Webhook Status",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/webhooks/stats/overview",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Create Dashboard Data",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const dashboardData = {\n  timestamp: new Date().toISOString(),\n  apiHealth: {\n    totalKeys: $input.first().json.totalKeys,\n    activeKeys: $input.first().json.activeKeys,\n    recentlyUsed: $input.first().json.recentlyUsed\n  },\n  rateLimits: $input.all()[1].json.stats,\n  webhooks: {\n    totalWebhooks: $input.all()[2].json.stats.totalWebhooks,\n    activeWebhooks: $input.all()[2].json.stats.activeWebhooks,\n    successRate: $input.all()[2].json.stats.totalSuccess / ($input.all()[2].json.stats.totalSuccess + $input.all()[2].json.stats.totalFailures) * 100\n  }\n};\n\nreturn [{ json: dashboardData }];"
      }
    },
    {
      "name": "Send to Dashboard",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://your-dashboard-api.com/metrics",
        "method": "POST",
        "body": "={{ $json }}"
      }
    }
  ]
}
```

### B. Automated Backup Workflow

**Purpose**: Regularly backup website data

```json
{
  "name": "Website Data Backup",
  "nodes": [
    {
      "name": "Daily Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "hours",
              "hoursInterval": 24
            }
          ]
        }
      }
    },
    {
      "name": "Backup Products",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/products",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Backup Users",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/users",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Backup Orders",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "{{ $env.ALTANIAN_API_BASE_URL }}/orders",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      }
    },
    {
      "name": "Create Backup File",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const backupData = {\n  timestamp: new Date().toISOString(),\n  products: $input.all()[0].json,\n  users: $input.all()[1].json,\n  orders: $input.all()[2].json\n};\n\nreturn [{ json: backupData }];"
      }
    },
    {
      "name": "Save to Google Drive",
      "type": "n8n-nodes-base.googleDrive",
      "parameters": {
        "operation": "upload",
        "name": "={{ 'backup-' + new Date().toISOString().split('T')[0] + '.json' }}",
        "parents": {
          "values": [
            {
              "name": "Website Backups"
            }
          ]
        },
        "binaryData": true,
        "fileContent": "={{ JSON.stringify($json, null, 2) }}"
      }
    }
  ]
}
```

## 4. API Key Management Best Practices

### A. Create Specialized API Keys for Different Tasks

```bash
# Read-only key for monitoring
curl -X POST http://localhost:5002/api-keys \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Monitor Key",
    "description": "Read-only access for monitoring workflows",
    "scope": "read",
    "allowedIPs": ["your-n8n-server-ip"]
  }'

# Order management key
curl -X POST http://localhost:5002/api-keys \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Order Manager",
    "description": "Order management for automation",
    "scope": "orders:write",
    "allowedIPs": ["your-n8n-server-ip"]
  }'

# Product management key
curl -X POST http://localhost:5002/api-keys \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Product Manager",
    "description": "Product management for automation",
    "scope": "products:manage",
    "allowedIPs": ["your-n8n-server-ip"]
  }'
```

### B. Monitor API Usage

```bash
# Check API key usage statistics
curl -H "x-api-key: your-api-key" \
  http://localhost:5002/api-keys/stats/usage

# Check rate limit status
curl -H "x-api-key: your-api-key" \
  http://localhost:5002/api-keys/key-id/rate-limit

# Get all API keys
curl -H "x-auth-token: your-jwt-token" \
  http://localhost:5002/api-keys
```

## 5. Webhook Integration for Real-time Updates

### A. Create Webhooks for n8n

```bash
# Order webhook
curl -X POST http://localhost:5002/webhooks \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Order Webhook",
    "url": "https://your-n8n-instance.com/webhook/orders",
    "events": ["order.created", "order.updated", "order.completed"],
    "headers": {
      "Authorization": "Bearer your-n8n-webhook-token"
    }
  }'

# Inventory webhook
curl -X POST http://localhost:5002/webhooks \
  -H "x-auth-token: your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "n8n Inventory Webhook",
    "url": "https://your-n8n-instance.com/webhook/inventory",
    "events": ["inventory.low_stock", "product.updated"],
    "headers": {
      "Authorization": "Bearer your-n8n-webhook-token"
    }
  }'
```

### B. n8n Webhook Receiver

```json
{
  "name": "Order Webhook Receiver",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "orders",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Process Order",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const orderData = $json.data;\nconst event = $json.event;\n\n// Process based on event type\nswitch(event) {\n  case 'order.created':\n    // Send confirmation email\n    break;\n  case 'order.updated':\n    // Update tracking\n    break;\n  case 'order.completed':\n    // Send completion notification\n    break;\n}\n\nreturn [{ json: { processed: true, event, orderId: orderData.orderId } }];"
      }
    },
    {
      "name": "Log to Database",
      "type": "n8n-nodes-base.mysql",
      "parameters": {
        "operation": "insert",
        "table": "webhook_logs",
        "columns": "event, order_id, processed_at",
        "values": "={{ $json.event }}, {{ $json.orderId }}, {{ new Date().toISOString() }}"
      }
    }
  ]
}
```

## 6. Troubleshooting and Maintenance

### A. Common Issues and Solutions

1. **Rate Limit Exceeded**
   ```bash
   # Reset rate limit bucket
   curl -X POST http://localhost:5002/api-keys/key-id/reset-rate-limit \
     -H "x-auth-token: your-jwt-token"
   ```

2. **IP Whitelist Issues**
   ```bash
   # Update IP whitelist
   curl -X PUT http://localhost:5002/api-keys/key-id/ips \
     -H "x-auth-token: your-jwt-token" \
     -H "Content-Type: application/json" \
     -d '{"allowedIPs": ["new-ip-address"]}'
   ```

3. **Webhook Failures**
   ```bash
   # Test webhook
   curl -X POST http://localhost:5002/webhooks/webhook-id/test \
     -H "x-auth-token: your-jwt-token"
   
   # Check webhook logs
   curl -H "x-auth-token: your-jwt-token" \
     http://localhost:5002/webhooks/webhook-id/logs
   ```

### B. Regular Maintenance Tasks

1. **Weekly API Key Rotation**
   ```bash
   # Regenerate API key secret
   curl -X POST http://localhost:5002/api-keys/key-id/regenerate \
     -H "x-auth-token: your-jwt-token"
   ```

2. **Monthly Usage Review**
   ```bash
   # Get usage statistics
   curl -H "x-auth-token: your-jwt-token" \
     http://localhost:5002/api-keys/stats/usage
   ```

3. **Quarterly Security Audit**
   ```bash
   # Review all API keys
   curl -H "x-auth-token: your-jwt-token" \
     http://localhost:5002/api-keys
   
   # Check webhook status
   curl -H "x-auth-token: your-jwt-token" \
     http://localhost:5002/webhooks/stats/overview
   ```

## 7. Security Recommendations

1. **Use Specific Scopes**: Don't use `full` scope unless necessary
2. **IP Whitelisting**: Always restrict API keys to specific IPs
3. **Regular Rotation**: Rotate API keys monthly
4. **Monitor Usage**: Check rate limits and usage patterns regularly
5. **Webhook Security**: Use HTTPS endpoints and validate signatures
6. **Environment Variables**: Store sensitive data in n8n environment variables

## 8. Performance Optimization

1. **Batch Operations**: Use batch endpoints when available
2. **Caching**: Cache frequently accessed data in n8n
3. **Rate Limiting**: Respect rate limits to avoid throttling
4. **Error Handling**: Implement proper error handling in workflows
5. **Monitoring**: Set up alerts for failed workflows

This guide provides a comprehensive approach to managing your API with n8n, focusing on automation, monitoring, and maintenance tasks that will help you efficiently manage your coffee shop website.
