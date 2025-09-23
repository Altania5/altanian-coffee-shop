import locationService from './LocationService';

class DynamicPricingService {
  constructor() {
    this.basePrices = new Map();
    this.pricingRules = [];
    this.weatherData = null;
    this.currentTime = new Date();
    this.demandFactors = {
      timeOfDay: 1.0,
      dayOfWeek: 1.0,
      weather: 1.0,
      inventory: 1.0,
      events: 1.0
    };
    
    this.init();
  }

  init() {
    this.setupPricingRules();
    this.updateTime();
    
    // Update time every minute
    setInterval(() => {
      this.updateTime();
    }, 60000);
  }

  setupPricingRules() {
    this.pricingRules = [
      // Time-based pricing
      {
        type: 'time',
        condition: (time) => time.getHours() >= 7 && time.getHours() <= 9,
        multiplier: 1.15,
        description: 'Morning Rush (7-9 AM)'
      },
      {
        type: 'time',
        condition: (time) => time.getHours() >= 12 && time.getHours() <= 14,
        multiplier: 1.10,
        description: 'Lunch Rush (12-2 PM)'
      },
      {
        type: 'time',
        condition: (time) => time.getHours() >= 15 && time.getHours() <= 17,
        multiplier: 1.05,
        description: 'Afternoon Pick-me-up (3-5 PM)'
      },
      {
        type: 'time',
        condition: (time) => time.getHours() >= 18 && time.getHours() <= 20,
        multiplier: 1.08,
        description: 'Evening Rush (6-8 PM)'
      },
      {
        type: 'time',
        condition: (time) => time.getHours() >= 22 || time.getHours() <= 6,
        multiplier: 0.95,
        description: 'Late Night/Early Morning Discount'
      },

      // Day of week pricing
      {
        type: 'day',
        condition: (time) => time.getDay() === 0 || time.getDay() === 6,
        multiplier: 1.12,
        description: 'Weekend Premium'
      },
      {
        type: 'day',
        condition: (time) => time.getDay() === 1,
        multiplier: 0.98,
        description: 'Monday Blues Discount'
      },

      // Weather-based pricing
      {
        type: 'weather',
        condition: (weather) => weather && weather.temperature < 10,
        multiplier: 1.20,
        description: 'Cold Weather Premium'
      },
      {
        type: 'weather',
        condition: (weather) => weather && weather.temperature > 30,
        multiplier: 1.15,
        description: 'Hot Weather Premium'
      },
      {
        type: 'weather',
        condition: (weather) => weather && weather.condition === 'rain',
        multiplier: 1.10,
        description: 'Rainy Day Premium'
      },
      {
        type: 'weather',
        condition: (weather) => weather && weather.condition === 'clear' && weather.temperature >= 20 && weather.temperature <= 25,
        multiplier: 0.98,
        description: 'Perfect Weather Discount'
      },

      // Inventory-based pricing
      {
        type: 'inventory',
        condition: (item) => item && item.stockLevel < 10,
        multiplier: 1.25,
        description: 'Low Stock Premium'
      },
      {
        type: 'inventory',
        condition: (item) => item && item.stockLevel > 50,
        multiplier: 0.95,
        description: 'High Stock Discount'
      }
    ];
  }

  updateTime() {
    this.currentTime = new Date();
  }

  async updateWeatherData() {
    try {
      // Check if API key is available
      const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
      if (!apiKey) {
        console.warn('Weather API key not configured, using default weather data');
        this.weatherData = this.getDefaultWeatherData();
        return;
      }

      // Get user's location for weather data
      const location = await locationService.getLocationForWeather();
      
      // Fetch weather data using coordinates
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`
      );
      
      if (response.ok) {
        const data = await response.json();
        this.weatherData = {
          temperature: data.main.temp,
          condition: data.weather[0].main.toLowerCase(),
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          location: data.name,
          coordinates: { lat: location.lat, lon: location.lon },
          isDefaultLocation: location.isDefault
        };
      } else {
        throw new Error(`Weather API request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      // Use default weather data
      this.weatherData = this.getDefaultWeatherData();
    }
  }

  getDefaultWeatherData() {
    return {
      temperature: 20,
      condition: 'clear',
      humidity: 50,
      windSpeed: 5
    };
  }

  setBasePrice(productId, price) {
    this.basePrices.set(productId, price);
  }

  getBasePrice(productId) {
    return this.basePrices.get(productId) || 0;
  }

  calculateDynamicPrice(productId, inventoryData = null) {
    const basePrice = this.getBasePrice(productId);
    if (basePrice === 0) return 0;

    let finalMultiplier = 1.0;
    const appliedRules = [];

    // Apply time-based rules
    const timeRules = this.pricingRules.filter(rule => rule.type === 'time');
    for (const rule of timeRules) {
      if (rule.condition(this.currentTime)) {
        finalMultiplier *= rule.multiplier;
        appliedRules.push(rule);
      }
    }

    // Apply day-based rules
    const dayRules = this.pricingRules.filter(rule => rule.type === 'day');
    for (const rule of dayRules) {
      if (rule.condition(this.currentTime)) {
        finalMultiplier *= rule.multiplier;
        appliedRules.push(rule);
      }
    }

    // Apply weather-based rules
    if (this.weatherData) {
      const weatherRules = this.pricingRules.filter(rule => rule.type === 'weather');
      for (const rule of weatherRules) {
        if (rule.condition(this.weatherData)) {
          finalMultiplier *= rule.multiplier;
          appliedRules.push(rule);
        }
      }
    }

    // Apply inventory-based rules
    if (inventoryData) {
      const inventoryRules = this.pricingRules.filter(rule => rule.type === 'inventory');
      for (const rule of inventoryRules) {
        if (rule.condition(inventoryData)) {
          finalMultiplier *= rule.multiplier;
          appliedRules.push(rule);
        }
      }
    }

    // Apply demand factors
    finalMultiplier *= this.demandFactors.timeOfDay;
    finalMultiplier *= this.demandFactors.dayOfWeek;
    finalMultiplier *= this.demandFactors.weather;
    finalMultiplier *= this.demandFactors.inventory;
    finalMultiplier *= this.demandFactors.events;

    // Cap the multiplier to prevent extreme pricing
    finalMultiplier = Math.max(0.8, Math.min(1.5, finalMultiplier));

    const finalPrice = basePrice * finalMultiplier;

    return {
      basePrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      multiplier: finalMultiplier,
      appliedRules,
      priceChange: finalPrice - basePrice,
      priceChangePercent: ((finalPrice - basePrice) / basePrice) * 100
    };
  }

  getPricingExplanation(productId, inventoryData = null) {
    const pricing = this.calculateDynamicPrice(productId, inventoryData);
    
    const explanation = {
      basePrice: pricing.basePrice,
      finalPrice: pricing.finalPrice,
      multiplier: pricing.multiplier,
      priceChange: pricing.priceChange,
      priceChangePercent: pricing.priceChangePercent,
      factors: []
    };

    // Add time factor
    const hour = this.currentTime.getHours();
    const day = this.currentTime.getDay();
    
    if (hour >= 7 && hour <= 9) {
      explanation.factors.push({
        type: 'time',
        description: 'Morning rush hour',
        impact: '+15%',
        color: '#DAA520'
      });
    } else if (hour >= 12 && hour <= 14) {
      explanation.factors.push({
        type: 'time',
        description: 'Lunch rush',
        impact: '+10%',
        color: '#DAA520'
      });
    } else if (hour >= 18 && hour <= 20) {
      explanation.factors.push({
        type: 'time',
        description: 'Evening rush',
        impact: '+8%',
        color: '#DAA520'
      });
    } else if (hour >= 22 || hour <= 6) {
      explanation.factors.push({
        type: 'time',
        description: 'Late night discount',
        impact: '-5%',
        color: '#8FBC8F'
      });
    }

    // Add day factor
    if (day === 0 || day === 6) {
      explanation.factors.push({
        type: 'day',
        description: 'Weekend premium',
        impact: '+12%',
        color: '#DAA520'
      });
    } else if (day === 1) {
      explanation.factors.push({
        type: 'day',
        description: 'Monday discount',
        impact: '-2%',
        color: '#8FBC8F'
      });
    }

    // Add weather factor
    if (this.weatherData) {
      if (this.weatherData.temperature < 10) {
        explanation.factors.push({
          type: 'weather',
          description: 'Cold weather premium',
          impact: '+20%',
          color: '#DAA520'
        });
      } else if (this.weatherData.temperature > 30) {
        explanation.factors.push({
          type: 'weather',
          description: 'Hot weather premium',
          impact: '+15%',
          color: '#DAA520'
        });
      } else if (this.weatherData.condition === 'rain') {
        explanation.factors.push({
          type: 'weather',
          description: 'Rainy day premium',
          impact: '+10%',
          color: '#DAA520'
        });
      } else if (this.weatherData.condition === 'clear' && 
                 this.weatherData.temperature >= 20 && 
                 this.weatherData.temperature <= 25) {
        explanation.factors.push({
          type: 'weather',
          description: 'Perfect weather discount',
          impact: '-2%',
          color: '#8FBC8F'
        });
      }
    }

    // Add inventory factor
    if (inventoryData) {
      if (inventoryData.stockLevel < 10) {
        explanation.factors.push({
          type: 'inventory',
          description: 'Low stock premium',
          impact: '+25%',
          color: '#CD5C5C'
        });
      } else if (inventoryData.stockLevel > 50) {
        explanation.factors.push({
          type: 'inventory',
          description: 'High stock discount',
          impact: '-5%',
          color: '#8FBC8F'
        });
      }
    }

    return explanation;
  }

  updateDemandFactor(factor, value) {
    if (this.demandFactors.hasOwnProperty(factor)) {
      this.demandFactors[factor] = value;
    }
  }

  getCurrentPricingInfo() {
    return {
      currentTime: this.currentTime,
      weatherData: this.weatherData,
      demandFactors: this.demandFactors,
      activeRules: this.pricingRules.filter(rule => {
        if (rule.type === 'time' || rule.type === 'day') {
          return rule.condition(this.currentTime);
        } else if (rule.type === 'weather' && this.weatherData) {
          return rule.condition(this.weatherData);
        }
        return false;
      })
    };
  }

  // Method to simulate demand changes (for testing)
  simulateDemandChange(factor, newValue) {
    this.updateDemandFactor(factor, newValue);
  }

  // Method to get pricing trends for analytics
  getPricingTrends(productId, hours = 24) {
    const trends = [];
    const now = new Date();
    
    for (let i = 0; i < hours; i++) {
      const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const tempTime = this.currentTime;
      this.currentTime = time;
      
      const pricing = this.calculateDynamicPrice(productId);
      trends.unshift({
        time: time.toISOString(),
        price: pricing.finalPrice,
        multiplier: pricing.multiplier,
        hour: time.getHours()
      });
      
      this.currentTime = tempTime;
    }
    
    return trends;
  }
}

// Create singleton instance
const dynamicPricingService = new DynamicPricingService();

export default dynamicPricingService;
