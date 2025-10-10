const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const apiKeyScopeService = require('./apiKeyScopeService');

class ApiKeyService {
  constructor() {
    this.keysFilePath = path.join(__dirname, '..', 'config', 'api-keys.json');
    this.keys = null;
    this.lastLoaded = null;
  }

  async loadKeys() {
    try {
      const data = await fs.readFile(this.keysFilePath, 'utf8');
      this.keys = JSON.parse(data);
      this.lastLoaded = new Date();
      return this.keys;
    } catch (error) {
      console.error('Error loading API keys:', error);
      throw new Error('Failed to load API keys');
    }
  }

  async saveKeys() {
    try {
      await fs.writeFile(this.keysFilePath, JSON.stringify(this.keys, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving API keys:', error);
      throw new Error('Failed to save API keys');
    }
  }

  async ensureKeysLoaded() {
    if (!this.keys || !this.lastLoaded) {
      await this.loadKeys();
    }
  }

  generateApiKey() {
    return crypto.randomBytes(16).toString('hex');
  }

  async hashKey(key) {
    return await bcrypt.hash(key, this.keys.settings.hashRounds);
  }

  async validateKey(providedKey, clientIP = null) {
    await this.ensureKeysLoaded();
    
    for (const keyData of this.keys.keys) {
      if (!keyData.isActive) continue;
      
      try {
        const isValid = await bcrypt.compare(providedKey, keyData.keyHash);
        if (isValid) {
          // Check IP whitelist if enabled and IP provided
          if (this.keys.settings.ipWhitelistEnabled && clientIP && keyData.allowedIPs && keyData.allowedIPs.length > 0) {
            if (!this.isIPAllowed(clientIP, keyData.allowedIPs)) {
              console.warn(`IP ${clientIP} not allowed for API key ${keyData.id}`);
              continue;
            }
          }

          // Update last used timestamp
          keyData.lastUsed = new Date().toISOString();
          await this.saveKeys();
          
          return {
            id: keyData.id,
            name: keyData.name,
            scope: keyData.scope || this.keys.settings.defaultScope,
            allowedIPs: keyData.allowedIPs || []
          };
        }
      } catch (error) {
        console.error('Error validating API key:', error);
        continue;
      }
    }
    
    return null;
  }

  async createKey(name, description = '', scope = null, allowedIPs = []) {
    await this.ensureKeysLoaded();
    
    if (this.keys.keys.length >= this.keys.settings.maxKeys) {
      throw new Error('Maximum number of API keys reached');
    }

    // Validate scope
    const finalScope = scope || this.keys.settings.defaultScope;
    if (!apiKeyScopeService.validateScope(finalScope)) {
      throw new Error(`Invalid scope: ${finalScope}`);
    }

    const apiKey = this.generateApiKey();
    const keyHash = await this.hashKey(apiKey);
    
    const newKey = {
      id: `key-${Date.now()}`,
      name,
      keyHash,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true,
      scope: finalScope,
      allowedIPs: Array.isArray(allowedIPs) ? allowedIPs : [],
      description
    };

    this.keys.keys.push(newKey);
    await this.saveKeys();

    return {
      id: newKey.id,
      name: newKey.name,
      key: apiKey, // Only returned on creation
      createdAt: newKey.createdAt,
      scope: newKey.scope,
      allowedIPs: newKey.allowedIPs,
      description: newKey.description
    };
  }

  async revokeKey(keyId) {
    await this.ensureKeysLoaded();
    
    const keyIndex = this.keys.keys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) {
      throw new Error('API key not found');
    }

    this.keys.keys[keyIndex].isActive = false;
    await this.saveKeys();

    return {
      id: keyId,
      revoked: true,
      revokedAt: new Date().toISOString()
    };
  }

  async regenerateKey(keyId) {
    await this.ensureKeysLoaded();
    
    const keyIndex = this.keys.keys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) {
      throw new Error('API key not found');
    }

    const apiKey = this.generateApiKey();
    const keyHash = await this.hashKey(apiKey);
    
    this.keys.keys[keyIndex].keyHash = keyHash;
    this.keys.keys[keyIndex].lastUsed = null;
    await this.saveKeys();

    return {
      id: keyId,
      name: this.keys.keys[keyIndex].name,
      key: apiKey, // Only returned on regeneration
      regeneratedAt: new Date().toISOString()
    };
  }

  async listKeys() {
    await this.ensureKeysLoaded();
    
    return this.keys.keys.map(key => ({
      id: key.id,
      name: key.name,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
      scope: key.scope || this.keys.settings.defaultScope,
      allowedIPs: key.allowedIPs || [],
      description: key.description
    }));
  }

  async getKeyById(keyId) {
    await this.ensureKeysLoaded();
    
    const key = this.keys.keys.find(k => k.id === keyId);
    if (!key) {
      throw new Error('API key not found');
    }

    return {
      id: key.id,
      name: key.name,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
      scope: key.scope || this.keys.settings.defaultScope,
      allowedIPs: key.allowedIPs || [],
      description: key.description
    };
  }

  async getUsageStats() {
    await this.ensureKeysLoaded();
    
    const totalKeys = this.keys.keys.length;
    const activeKeys = this.keys.keys.filter(k => k.isActive).length;
    const inactiveKeys = totalKeys - activeKeys;
    
    const recentlyUsed = this.keys.keys.filter(k => {
      if (!k.lastUsed) return false;
      const lastUsed = new Date(k.lastUsed);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return lastUsed > thirtyDaysAgo;
    }).length;

    return {
      totalKeys,
      activeKeys,
      inactiveKeys,
      recentlyUsed,
      lastUpdated: new Date().toISOString()
    };
  }

  // IP validation methods
  isIPAllowed(clientIP, allowedIPs) {
    if (!clientIP || !Array.isArray(allowedIPs) || allowedIPs.length === 0) {
      return true; // No restrictions
    }

    return allowedIPs.some(allowedIP => {
      if (allowedIP === clientIP) return true;
      
      // Check CIDR notation
      if (allowedIP.includes('/')) {
        return this.isIPInCIDR(clientIP, allowedIP);
      }
      
      return false;
    });
  }

  isIPInCIDR(clientIP, cidr) {
    try {
      const [network, prefixLength] = cidr.split('/');
      const networkIP = this.ipToNumber(network);
      const clientIPNum = this.ipToNumber(clientIP);
      const mask = this.getMask(parseInt(prefixLength));
      
      return (clientIPNum & mask) === (networkIP & mask);
    } catch (error) {
      console.error('Error checking CIDR:', error);
      return false;
    }
  }

  ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  getMask(prefixLength) {
    return (0xFFFFFFFF << (32 - prefixLength)) >>> 0;
  }

  // Update API key IPs
  async updateKeyIPs(keyId, allowedIPs) {
    await this.ensureKeysLoaded();
    
    const keyIndex = this.keys.keys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) {
      throw new Error('API key not found');
    }

    this.keys.keys[keyIndex].allowedIPs = Array.isArray(allowedIPs) ? allowedIPs : [];
    await this.saveKeys();

    return {
      id: keyId,
      allowedIPs: this.keys.keys[keyIndex].allowedIPs,
      updatedAt: new Date().toISOString()
    };
  }

  // Update API key scope
  async updateKeyScope(keyId, scope) {
    await this.ensureKeysLoaded();
    
    if (!apiKeyScopeService.validateScope(scope)) {
      throw new Error(`Invalid scope: ${scope}`);
    }
    
    const keyIndex = this.keys.keys.findIndex(k => k.id === keyId);
    if (keyIndex === -1) {
      throw new Error('API key not found');
    }

    this.keys.keys[keyIndex].scope = scope;
    await this.saveKeys();

    return {
      id: keyId,
      scope: scope,
      updatedAt: new Date().toISOString()
    };
  }

  // Get available scopes
  getAvailableScopes() {
    return apiKeyScopeService.getAvailableScopes();
  }
}

module.exports = new ApiKeyService();
