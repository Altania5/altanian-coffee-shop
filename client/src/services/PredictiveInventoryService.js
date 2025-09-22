class PredictiveInventoryService {
  constructor() {
    this.historicalData = [];
    this.predictions = new Map();
    this.seasonalFactors = new Map();
    this.weatherData = null;
    this.lastUpdate = null;
    this.updateInterval = 60 * 60 * 1000; // 1 hour
    
    this.init();
  }

  init() {
    this.setupSeasonalFactors();
    this.loadHistoricalData();
  }

  setupSeasonalFactors() {
    // Seasonal demand patterns for coffee shop items
    this.seasonalFactors.set('coffee_beans', {
      winter: 1.2,    // Higher coffee consumption in winter
      spring: 1.0,
      summer: 0.8,    // Lower coffee consumption in summer
      fall: 1.1
    });

    this.seasonalFactors.set('cold_drinks', {
      winter: 0.3,    // Very low cold drink consumption in winter
      spring: 0.7,
      summer: 1.5,    // High cold drink consumption in summer
      fall: 0.9
    });

    this.seasonalFactors.set('hot_drinks', {
      winter: 1.4,    // High hot drink consumption in winter
      spring: 1.0,
      summer: 0.6,    // Low hot drink consumption in summer
      fall: 1.2
    });

    this.seasonalFactors.set('pastries', {
      winter: 1.1,
      spring: 1.0,
      summer: 0.9,
      fall: 1.0
    });

    this.seasonalFactors.set('milk', {
      winter: 1.0,
      spring: 1.0,
      summer: 1.0,
      fall: 1.0
    });
  }

  async loadHistoricalData() {
    try {
      // This would typically fetch from your API
      // For now, we'll generate mock historical data
      this.historicalData = this.generateMockHistoricalData();
      this.lastUpdate = new Date();
    } catch (error) {
      console.error('Failed to load historical data:', error);
    }
  }

  generateMockHistoricalData() {
    const data = [];
    const now = new Date();
    
    // Generate 90 days of historical data
    for (let i = 90; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayOfWeek = date.getDay();
      const hour = Math.floor(Math.random() * 24);
      
      // Simulate different consumption patterns
      const baseConsumption = {
        'coffee_beans': 50,
        'milk': 30,
        'sugar': 20,
        'syrup': 15,
        'pastries': 25
      };

      const consumption = {};
      Object.keys(baseConsumption).forEach(item => {
        let consumption = baseConsumption[item];
        
        // Weekend effect
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          consumption *= 1.3;
        }
        
        // Time of day effect
        if (hour >= 7 && hour <= 9) {
          consumption *= 1.2; // Morning rush
        } else if (hour >= 12 && hour <= 14) {
          consumption *= 1.1; // Lunch rush
        } else if (hour >= 18 && hour <= 20) {
          consumption *= 1.15; // Evening rush
        }
        
        // Add some randomness
        consumption *= (0.8 + Math.random() * 0.4);
        
        consumption[item] = Math.round(consumption);
      });

      data.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        hour,
        consumption,
        weather: {
          temperature: 15 + Math.random() * 20,
          condition: ['clear', 'cloudy', 'rain'][Math.floor(Math.random() * 3)]
        }
      });
    }
    
    return data;
  }

  async updateWeatherData() {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=San Francisco&appid=${process.env.REACT_APP_WEATHER_API_KEY}&units=metric`
      );
      
      if (response.ok) {
        const data = await response.json();
        this.weatherData = {
          temperature: data.main.temp,
          condition: data.weather[0].main.toLowerCase(),
          humidity: data.main.humidity,
          windSpeed: data.wind.speed
        };
      }
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      this.weatherData = {
        temperature: 20,
        condition: 'clear',
        humidity: 50,
        windSpeed: 5
      };
    }
  }

  getSeasonalFactor(itemType, season) {
    const factors = this.seasonalFactors.get(itemType);
    return factors ? factors[season] : 1.0;
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  calculateMovingAverage(data, windowSize = 7) {
    if (data.length < windowSize) return data;
    
    const averages = [];
    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1);
      const average = window.reduce((sum, item) => sum + item, 0) / windowSize;
      averages.push(average);
    }
    
    return averages;
  }

  calculateTrend(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, index) => sum + val * index, 0);
    const sumXX = data.reduce((sum, val, index) => sum + index * index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  predictDemand(itemType, daysAhead = 7) {
    const historicalConsumption = this.historicalData.map(day => 
      day.consumption[itemType] || 0
    );

    if (historicalConsumption.length === 0) {
      return this.generateDefaultPrediction(daysAhead);
    }

    // Calculate moving average
    const movingAvg = this.calculateMovingAverage(historicalConsumption, 7);
    const recentAvg = movingAvg.length > 0 ? movingAvg[movingAvg.length - 1] : 0;

    // Calculate trend
    const trend = this.calculateTrend(movingAvg.slice(-14)); // Last 2 weeks

    // Get seasonal factor
    const season = this.getCurrentSeason();
    const seasonalFactor = this.getSeasonalFactor(itemType, season);

    // Weather factor
    let weatherFactor = 1.0;
    if (this.weatherData) {
      if (this.weatherData.temperature < 10) {
        weatherFactor = itemType.includes('hot') ? 1.2 : 0.8;
      } else if (this.weatherData.temperature > 25) {
        weatherFactor = itemType.includes('cold') ? 1.3 : 0.7;
      }
    }

    // Day of week factor
    const dayOfWeek = new Date().getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;

    // Generate predictions
    const predictions = [];
    for (let i = 1; i <= daysAhead; i++) {
      const baseDemand = recentAvg + (trend * i);
      const adjustedDemand = baseDemand * seasonalFactor * weatherFactor * weekendFactor;
      
      // Add some randomness for realistic predictions
      const randomFactor = 0.9 + Math.random() * 0.2;
      const finalDemand = Math.round(adjustedDemand * randomFactor);
      
      predictions.push({
        date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        predictedDemand: Math.max(0, finalDemand),
        confidence: this.calculateConfidence(historicalConsumption.length, i),
        factors: {
          seasonal: seasonalFactor,
          weather: weatherFactor,
          trend: trend,
          weekend: weekendFactor
        }
      });
    }

    return predictions;
  }

  calculateConfidence(dataLength, daysAhead) {
    // Confidence decreases with more days ahead and increases with more historical data
    const dataConfidence = Math.min(1.0, dataLength / 30); // Max confidence at 30+ days
    const timeConfidence = Math.max(0.5, 1.0 - (daysAhead * 0.1)); // Decreases by 10% per day
    return Math.round((dataConfidence * timeConfidence) * 100);
  }

  generateDefaultPrediction(daysAhead) {
    const predictions = [];
    for (let i = 1; i <= daysAhead; i++) {
      predictions.push({
        date: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        predictedDemand: 10, // Default demand
        confidence: 30, // Low confidence for default predictions
        factors: {
          seasonal: 1.0,
          weather: 1.0,
          trend: 0,
          weekend: 1.0
        }
      });
    }
    return predictions;
  }

  generateReorderRecommendations(currentInventory, predictions) {
    const recommendations = [];
    
    Object.keys(currentInventory).forEach(itemType => {
      const currentStock = currentInventory[itemType];
      const itemPredictions = predictions.get(itemType) || [];
      
      if (itemPredictions.length === 0) return;
      
      // Calculate average predicted demand for next 7 days
      const avgDemand = itemPredictions.slice(0, 7).reduce((sum, pred) => sum + pred.predictedDemand, 0) / 7;
      
      // Calculate days of stock remaining
      const daysRemaining = currentStock / avgDemand;
      
      // Generate recommendation
      let recommendation = {
        itemType,
        currentStock,
        avgDemand: Math.round(avgDemand),
        daysRemaining: Math.round(daysRemaining * 10) / 10,
        status: 'good',
        suggestedOrder: 0,
        urgency: 'low'
      };

      if (daysRemaining < 3) {
        recommendation.status = 'critical';
        recommendation.urgency = 'high';
        recommendation.suggestedOrder = Math.round(avgDemand * 7); // 1 week supply
      } else if (daysRemaining < 7) {
        recommendation.status = 'low';
        recommendation.urgency = 'medium';
        recommendation.suggestedOrder = Math.round(avgDemand * 5); // 5 days supply
      } else if (daysRemaining < 14) {
        recommendation.status = 'good';
        recommendation.urgency = 'low';
        recommendation.suggestedOrder = Math.round(avgDemand * 3); // 3 days supply
      }

      recommendations.push(recommendation);
    });

    return recommendations.sort((a, b) => {
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }

  async getInventoryPredictions(inventoryItems, daysAhead = 7) {
    try {
      // Update weather data
      await this.updateWeatherData();
      
      // Generate predictions for each item
      const predictions = new Map();
      
      inventoryItems.forEach(item => {
        const itemPredictions = this.predictDemand(item.name.toLowerCase(), daysAhead);
        predictions.set(item.name.toLowerCase(), itemPredictions);
      });

      // Generate reorder recommendations
      const currentInventory = {};
      inventoryItems.forEach(item => {
        currentInventory[item.name.toLowerCase()] = item.currentStock;
      });

      const recommendations = this.generateReorderRecommendations(currentInventory, predictions);

      return {
        predictions,
        recommendations,
        lastUpdated: new Date(),
        weatherData: this.weatherData,
        seasonalFactors: Object.fromEntries(this.seasonalFactors)
      };
    } catch (error) {
      console.error('Failed to generate inventory predictions:', error);
      throw error;
    }
  }

  getInventoryInsights(inventoryItems) {
    const insights = [];
    
    // Low stock insights
    const lowStockItems = inventoryItems.filter(item => item.currentStock < item.minLevel);
    if (lowStockItems.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockItems.length} items are below minimum stock level`,
        items: lowStockItems.map(item => item.name),
        priority: 'high'
      });
    }

    // High stock insights
    const highStockItems = inventoryItems.filter(item => item.currentStock > item.maxLevel);
    if (highStockItems.length > 0) {
      insights.push({
        type: 'info',
        title: 'High Stock Alert',
        message: `${highStockItems.length} items are above maximum stock level`,
        items: highStockItems.map(item => item.name),
        priority: 'medium'
      });
    }

    // Seasonal insights
    const season = this.getCurrentSeason();
    const seasonalItems = [];
    this.seasonalFactors.forEach((factors, itemType) => {
      if (factors[season] > 1.1) {
        seasonalItems.push(itemType);
      }
    });

    if (seasonalItems.length > 0) {
      insights.push({
        type: 'info',
        title: 'Seasonal Demand Increase',
        message: `${season} season typically increases demand for ${seasonalItems.length} item types`,
        items: seasonalItems,
        priority: 'medium'
      });
    }

    return insights;
  }
}

// Create singleton instance
const predictiveInventoryService = new PredictiveInventoryService();

export default predictiveInventoryService;
