const fs = require('fs');
const path = require('path');

class ApiKeyScopeService {
  constructor() {
    this.scopesPath = path.join(__dirname, '../config/api-key-scopes.json');
    this.scopes = this.loadScopes();
  }

  loadScopes() {
    try {
      const data = fs.readFileSync(this.scopesPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading API key scopes:', error);
      return { scopes: {}, defaultScope: 'read', ownerScopes: [] };
    }
  }

  reloadScopes() {
    this.scopes = this.loadScopes();
  }

  getAllScopes() {
    return this.scopes.scopes;
  }

  getScope(scopeName) {
    return this.scopes.scopes[scopeName];
  }

  isOwnerScope(scopeName) {
    return this.scopes.ownerScopes.includes(scopeName);
  }

  validateScope(scopeName) {
    return !!this.scopes.scopes[scopeName];
  }

  hasPermission(scopeName, method, endpoint) {
    const scope = this.getScope(scopeName);
    if (!scope) return false;

    // Check if method is allowed
    if (!scope.permissions.includes(method.toUpperCase())) {
      return false;
    }

    // Check if endpoint is allowed
    return this.isEndpointAllowed(scope.endpoints, endpoint);
  }

  isEndpointAllowed(allowedEndpoints, requestEndpoint) {
    if (allowedEndpoints.includes('*')) {
      return true;
    }

    return allowedEndpoints.some(allowedEndpoint => {
      if (allowedEndpoint === '*') return true;
      
      // Convert to regex pattern
      const pattern = allowedEndpoint
        .replace(/\*/g, '.*')
        .replace(/\//g, '\\/');
      
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(requestEndpoint);
    });
  }

  getDefaultScope() {
    return this.scopes.defaultScope;
  }

  getOwnerScopes() {
    return this.scopes.ownerScopes;
  }

  requiresOwnerRole(scopeName) {
    const scope = this.getScope(scopeName);
    return scope ? scope.requiresOwner === true : false;
  }

  // Get scope information for API documentation
  getScopeInfo(scopeName) {
    const scope = this.getScope(scopeName);
    if (!scope) return null;

    return {
      name: scope.name,
      description: scope.description,
      permissions: scope.permissions,
      endpoints: scope.endpoints,
      requiresOwner: scope.requiresOwner || false
    };
  }

  // Get all available scopes for API key creation
  getAvailableScopes() {
    return Object.keys(this.scopes.scopes).map(scopeName => ({
      name: scopeName,
      ...this.getScopeInfo(scopeName)
    }));
  }
}

module.exports = new ApiKeyScopeService();
