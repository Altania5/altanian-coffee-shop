import { getAdvancedEspressoAI } from '../ai/AdvancedEspressoAI';

class AIDataCollectionService {
  constructor() {
    this.collectionEnabled = true;
    this.batchSize = 10;
    this.pendingData = this.loadPendingData();
    this.collectionStats = this.loadCollectionStats();
  }

  // Load pending data from localStorage
  loadPendingData() {
    try {
      const saved = localStorage.getItem('ai-pending-data');
      if (!saved) return [];
      
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading pending data:', error);
      // Clean up corrupted data
      localStorage.removeItem('ai-pending-data');
      return [];
    }
  }

  // Save pending data to localStorage
  savePendingData() {
    try {
      localStorage.setItem('ai-pending-data', JSON.stringify(this.pendingData));
    } catch (error) {
      console.error('Error saving pending data:', error);
    }
  }

  // Load collection stats from localStorage
  loadCollectionStats() {
    try {
      const saved = localStorage.getItem('ai-collection-stats');
      return saved ? JSON.parse(saved) : {
        totalCollected: 0,
        lastCollection: null,
        averageQuality: 0,
        mostCommonIssues: []
      };
    } catch (error) {
      console.error('Error loading collection stats:', error);
      return {
        totalCollected: 0,
        lastCollection: null,
        averageQuality: 0,
        mostCommonIssues: []
      };
    }
  }

  // Save collection stats to localStorage
  saveCollectionStats() {
    try {
      localStorage.setItem('ai-collection-stats', JSON.stringify(this.collectionStats));
    } catch (error) {
      console.error('Error saving collection stats:', error);
    }
  }

  // Collect data from a coffee log entry
  async collectShotData(shotData) {
    console.log('🔍 Data collection attempt:', { 
      collectionEnabled: this.collectionEnabled, 
      shotData: shotData ? 'present' : 'missing',
      shotDataKeys: shotData ? Object.keys(shotData) : []
    });
    
    if (!this.collectionEnabled || !shotData) {
      console.log('❌ Data collection skipped:', { collectionEnabled: this.collectionEnabled, shotData: !!shotData });
      return;
    }

    try {
      // Validate required fields
      if (!this.validateShotData(shotData)) {
        console.warn('❌ Invalid shot data for AI collection:', shotData);
        console.warn('Required fields check:', {
          grindSize: shotData.grindSize,
          inWeight: shotData.inWeight,
          outWeight: shotData.outWeight,
          extractionTime: shotData.extractionTime,
          shotQuality: shotData.shotQuality,
          tasteProfile: shotData.tasteProfile
        });
        return;
      }

      // Enrich data with additional context
      const enrichedData = await this.enrichShotData(shotData);
      
      // Add to pending batch
      this.pendingData.push(enrichedData);
      this.savePendingData(); // Save to localStorage
      
      console.log(`✅ Shot data validated and enriched. Pending: ${this.pendingData.length}/${this.batchSize}`);
      
      // Process batch if full
      if (this.pendingData.length >= this.batchSize) {
        console.log('🔄 Processing full batch...');
        await this.processBatch();
      }

      console.log(`📊 Collected shot data for AI training (${this.pendingData.length}/${this.batchSize})`);
      
    } catch (error) {
      console.error('Error collecting shot data:', error);
    }
  }

  // Validate shot data for AI training
  validateShotData(shotData) {
    const requiredFields = [
      'grindSize', 'inWeight', 'outWeight', 'extractionTime', 
      'shotQuality', 'tasteProfile'
    ];

    return requiredFields.every(field => {
      const value = shotData[field];
      return value !== undefined && value !== null && value !== '';
    });
  }

  // Enrich shot data with additional context
  async enrichShotData(shotData) {
    const enriched = {
      ...shotData,
      
      // Add metadata
      collectedAt: new Date().toISOString(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      
      // Calculate derived values
      ratio: shotData.outWeight / shotData.inWeight,
      flowRate: shotData.outWeight / shotData.extractionTime,
      extractionYield: (shotData.outWeight * 0.12) / shotData.inWeight * 100,
      
      // Add environmental context
      timestamp: new Date().toISOString(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      
      // Add quality indicators
      isHighQuality: shotData.shotQuality >= 7,
      isLowQuality: shotData.shotQuality <= 4,
      qualityCategory: this.categorizeQuality(shotData.shotQuality),
      
      // Add taste analysis
      tasteBalance: this.calculateTasteBalance(shotData.tasteProfile),
      dominantFlavor: this.getDominantFlavor(shotData.tasteProfile),
      
      // Add technique analysis
      techniqueScore: this.calculateTechniqueScore(shotData),
      
      // Add improvement potential
      improvementPotential: this.calculateImprovementPotential(shotData)
    };

    return enriched;
  }

  // Process a batch of collected data
  async processBatch() {
    if (this.pendingData.length === 0) return;

    try {
      const ai = getAdvancedEspressoAI();
      
      // Add data to AI system
      for (const shotData of this.pendingData) {
        await ai.addUserData(shotData);
      }

      // Update collection stats
      const batchSize = this.pendingData.length;
      this.updateCollectionStats(this.pendingData);
      this.saveCollectionStats(); // Save stats to localStorage
      
      // Clear pending data
      this.pendingData = [];
      this.savePendingData(); // Save empty array to localStorage
      
      console.log(`✅ Processed batch of ${batchSize} shot data points`);
      
    } catch (error) {
      console.error('Error processing data batch:', error);
    }
  }

  // Update collection statistics
  updateCollectionStats(batchData) {
    this.collectionStats.totalCollected += batchData.length;
    this.collectionStats.lastCollection = new Date().toISOString();
    
    // Calculate average quality
    const totalQuality = batchData.reduce((sum, shot) => sum + shot.shotQuality, 0);
    this.collectionStats.averageQuality = totalQuality / batchData.length;
    
    // Identify common issues
    this.updateCommonIssues(batchData);
  }

  // Update common issues tracking
  updateCommonIssues(batchData) {
    const issues = [];
    
    batchData.forEach(shot => {
      if (shot.extractionTime < 22) issues.push('fast_extraction');
      if (shot.extractionTime > 35) issues.push('slow_extraction');
      if (shot.ratio < 1.8) issues.push('low_ratio');
      if (shot.ratio > 2.5) issues.push('high_ratio');
      if (shot.tasteProfile?.acidity >= 4 && shot.tasteProfile?.sweetness <= 2) {
        issues.push('sour_shot');
      }
      if (shot.tasteProfile?.bitterness >= 4 && shot.tasteProfile?.sweetness <= 2) {
        issues.push('bitter_shot');
      }
    });
    
    // Count issue frequency
    const issueCounts = {};
    issues.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
    
    // Update most common issues
    this.collectionStats.mostCommonIssues = Object.entries(issueCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));
  }

  // Utility methods
  categorizeQuality(quality) {
    if (quality >= 8) return 'excellent';
    if (quality >= 6) return 'good';
    if (quality >= 4) return 'fair';
    return 'poor';
  }

  calculateTasteBalance(tasteProfile) {
    if (!tasteProfile) return 0;
    
    const { sweetness, acidity, bitterness, body } = tasteProfile;
    const avg = (sweetness + acidity + bitterness + body) / 4;
    const variance = Math.pow(sweetness - avg, 2) + Math.pow(acidity - avg, 2) + 
                    Math.pow(bitterness - avg, 2) + Math.pow(body - avg, 2);
    
    return Math.max(0, 1 - variance / 4); // Higher = more balanced
  }

  getDominantFlavor(tasteProfile) {
    if (!tasteProfile) return 'balanced';
    
    const { sweetness, acidity, bitterness, body } = tasteProfile;
    const max = Math.max(sweetness, acidity, bitterness, body);
    
    if (sweetness === max) return 'sweet';
    if (acidity === max) return 'acidic';
    if (bitterness === max) return 'bitter';
    if (body === max) return 'full_body';
    return 'balanced';
  }

  calculateTechniqueScore(shotData) {
    let score = 0;
    
    // Base score from quality
    score += shotData.shotQuality * 0.3;
    
    // Bonus for good parameters
    if (shotData.extractionTime >= 22 && shotData.extractionTime <= 35) score += 1;
    if (shotData.ratio >= 1.8 && shotData.ratio <= 2.5) score += 1;
    if (shotData.temperature >= 90 && shotData.temperature <= 96) score += 0.5;
    
    // Bonus for advanced techniques
    if (shotData.usedWDT) score += 0.5;
    if (shotData.usedPuckScreen) score += 0.3;
    if (shotData.usedPreInfusion) score += 0.2;
    
    return Math.min(score, 10);
  }

  calculateImprovementPotential(shotData) {
    let potential = 0;
    
    // High potential for low quality shots
    if (shotData.shotQuality <= 4) potential += 3;
    else if (shotData.shotQuality <= 6) potential += 2;
    else if (shotData.shotQuality <= 8) potential += 1;
    
    // High potential for parameter issues
    if (shotData.extractionTime < 22 || shotData.extractionTime > 35) potential += 1;
    if (shotData.ratio < 1.8 || shotData.ratio > 2.5) potential += 1;
    
    // High potential for taste issues
    if (shotData.tasteProfile) {
      const { sweetness, acidity, bitterness } = shotData.tasteProfile;
      if (acidity >= 4 && sweetness <= 2) potential += 1;
      if (bitterness >= 4 && sweetness <= 2) potential += 1;
    }
    
    return Math.min(potential, 5);
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('ai-session-id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('ai-session-id', sessionId);
    }
    return sessionId;
  }

  // Force process pending data
  async flushPendingData() {
    if (this.pendingData.length > 0) {
      console.log(`🔄 Manually flushing ${this.pendingData.length} pending data points...`);
      await this.processBatch();
    } else {
      console.log('ℹ️ No pending data to flush');
    }
  }

  // Get collection statistics
  getCollectionStats() {
    return {
      ...this.collectionStats,
      pendingDataCount: this.pendingData.length,
      collectionEnabled: this.collectionEnabled
    };
  }

  // Enable/disable data collection
  setCollectionEnabled(enabled) {
    this.collectionEnabled = enabled;
    console.log(`📊 AI data collection ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Export collected data for analysis
  exportCollectedData() {
    const data = {
      stats: this.collectionStats,
      pendingData: this.pendingData,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `espresso-ai-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear all collected data
  clearCollectedData() {
    this.pendingData = [];
    this.collectionStats = {
      totalCollected: 0,
      lastCollection: null,
      averageQuality: 0,
      mostCommonIssues: []
    };
    console.log('🗑️ Cleared all collected AI data');
  }
}

// Singleton instance
let aiDataCollectionService = null;

export const getAIDataCollectionService = () => {
  if (!aiDataCollectionService) {
    aiDataCollectionService = new AIDataCollectionService();
  }
  return aiDataCollectionService;
};

export default AIDataCollectionService;
