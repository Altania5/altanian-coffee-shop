import api from '../utils/api';
import locationService from './LocationService';

class SmartRecommendationService {
  constructor() {
    this.weatherData = null;
    this.userPreferences = null;
    this.lastUpdate = null;
    this.updateInterval = 30 * 60 * 1000; // 30 minutes
  }

  // Get current weather data
  async getWeatherData() {
    try {
      // Check if API key is available
      const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
      if (!apiKey) {
        console.warn('Weather API key not configured, using default weather data');
        return this.getDefaultWeatherData();
      }

      // Get user's location for weather data
      const location = await locationService.getLocationForWeather();
      
      // Using coordinates for more accurate weather data
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API request failed: ${response.status}`);
      }
      
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
      
      this.lastUpdate = Date.now();
      return this.weatherData;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      // Return default weather data
      return this.getDefaultWeatherData();
    }
  }

  // Get default weather data when API is unavailable
  getDefaultWeatherData() {
    return {
      temperature: 20,
      condition: 'clear',
      humidity: 50,
      windSpeed: 5,
      location: 'San Francisco'
    };
  }

  // Get user preferences from coffee logs and order history
  async getUserPreferences(userId) {
    try {
      const [logsResponse, ordersResponse] = await Promise.all([
        api.get('/coffeelogs'),
        api.get('/orders/history')
      ]);

      const logs = logsResponse.data.logs || [];
      const orders = ordersResponse.data.orders || [];

      // Analyze taste preferences from coffee logs
      const tasteProfile = this.analyzeTasteProfile(logs);
      
      // Analyze ordering patterns
      const orderingPatterns = this.analyzeOrderingPatterns(orders);
      
      // Analyze time-based preferences
      const timePreferences = this.analyzeTimePreferences(orders);

      this.userPreferences = {
        tasteProfile,
        orderingPatterns,
        timePreferences,
        favoriteDrinks: this.getFavoriteDrinks(orders),
        dietaryRestrictions: this.extractDietaryRestrictions(orders)
      };

      return this.userPreferences;
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  // Analyze taste profile from coffee logs
  analyzeTasteProfile(logs) {
    if (logs.length === 0) {
      return { sweetness: 3, acidity: 3, bitterness: 3, body: 3 };
    }

    const avgSweetness = logs.reduce((sum, log) => sum + (log.tasteProfile?.sweetness || 3), 0) / logs.length;
    const avgAcidity = logs.reduce((sum, log) => sum + (log.tasteProfile?.acidity || 3), 0) / logs.length;
    const avgBitterness = logs.reduce((sum, log) => sum + (log.tasteProfile?.bitterness || 3), 0) / logs.length;
    const avgBody = logs.reduce((sum, log) => sum + (log.tasteProfile?.body || 3), 0) / logs.length;

    return {
      sweetness: Math.round(avgSweetness * 10) / 10,
      acidity: Math.round(avgAcidity * 10) / 10,
      bitterness: Math.round(avgBitterness * 10) / 10,
      body: Math.round(avgBody * 10) / 10
    };
  }

  // Analyze ordering patterns
  analyzeOrderingPatterns(orders) {
    const patterns = {
      preferredSize: 'medium',
      preferredTemperature: 'hot',
      preferredMilk: 'regular',
      averageOrderValue: 0,
      orderFrequency: 'weekly'
    };

    if (orders.length === 0) return patterns;

    // Analyze size preferences
    const sizeCounts = {};
    const tempCounts = {};
    const milkCounts = {};
    let totalValue = 0;

    orders.forEach(order => {
      order.items?.forEach(item => {
        // Size analysis
        const size = item.customizations?.size?.name || 'medium';
        sizeCounts[size] = (sizeCounts[size] || 0) + 1;
        
        // Temperature analysis
        const temp = item.customizations?.temperature || 'hot';
        tempCounts[temp] = (tempCounts[temp] || 0) + 1;
        
        // Milk analysis
        const milk = item.customizations?.milk?.name || 'regular';
        milkCounts[milk] = (milkCounts[milk] || 0) + 1;
        
        totalValue += item.itemTotalPrice || 0;
      });
    });

    patterns.preferredSize = this.getMostFrequent(sizeCounts) || 'medium';
    patterns.preferredTemperature = this.getMostFrequent(tempCounts) || 'hot';
    patterns.preferredMilk = this.getMostFrequent(milkCounts) || 'regular';
    patterns.averageOrderValue = totalValue / orders.length;

    return patterns;
  }

  // Analyze time-based preferences
  analyzeTimePreferences(orders) {
    const timePatterns = {
      morningDrinks: [],
      afternoonDrinks: [],
      eveningDrinks: [],
      weekendPreferences: []
    };

    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const dayOfWeek = new Date(order.createdAt).getDay();
      
      order.items?.forEach(item => {
        const drinkName = item.productName;
        
        if (hour >= 6 && hour < 12) {
          timePatterns.morningDrinks.push(drinkName);
        } else if (hour >= 12 && hour < 18) {
          timePatterns.afternoonDrinks.push(drinkName);
        } else {
          timePatterns.eveningDrinks.push(drinkName);
        }
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          timePatterns.weekendPreferences.push(drinkName);
        }
      });
    });

    return timePatterns;
  }

  // Get favorite drinks
  getFavoriteDrinks(orders) {
    const drinkCounts = {};
    
    orders.forEach(order => {
      order.items?.forEach(item => {
        const drinkName = item.productName;
        drinkCounts[drinkName] = (drinkCounts[drinkName] || 0) + 1;
      });
    });

    return Object.entries(drinkCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([drink]) => drink);
  }

  // Extract dietary restrictions
  extractDietaryRestrictions(orders) {
    const restrictions = new Set();
    
    orders.forEach(order => {
      order.items?.forEach(item => {
        const milk = item.customizations?.milk?.name?.toLowerCase();
        if (milk && milk !== 'regular') {
          restrictions.add(milk);
        }
      });
    });

    return Array.from(restrictions);
  }

  // Get most frequent item from counts object
  getMostFrequent(counts) {
    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)?.[0];
  }

  // Get default preferences
  getDefaultPreferences() {
    return {
      tasteProfile: { sweetness: 3, acidity: 3, bitterness: 3, body: 3 },
      orderingPatterns: {
        preferredSize: 'medium',
        preferredTemperature: 'hot',
        preferredMilk: 'regular',
        averageOrderValue: 0,
        orderFrequency: 'weekly'
      },
      timePreferences: {
        morningDrinks: [],
        afternoonDrinks: [],
        eveningDrinks: [],
        weekendPreferences: []
      },
      favoriteDrinks: [],
      dietaryRestrictions: []
    };
  }

  // Generate smart recommendations
  async generateRecommendations(userId, currentTime = new Date()) {
    try {
      // Get fresh data if needed
      if (!this.weatherData || !this.lastUpdate || Date.now() - this.lastUpdate > this.updateInterval) {
        await this.getWeatherData();
      }

      if (!this.userPreferences) {
        await this.getUserPreferences(userId);
      }

      const hour = currentTime.getHours();
      const dayOfWeek = currentTime.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Generate recommendations based on multiple factors
      const recommendations = [];

      // Weather-based recommendations
      const weatherRecs = this.getWeatherBasedRecommendations();
      recommendations.push(...weatherRecs);

      // Time-based recommendations
      const timeRecs = this.getTimeBasedRecommendations(hour, isWeekend);
      recommendations.push(...timeRecs);

      // User preference recommendations
      const preferenceRecs = this.getPreferenceBasedRecommendations();
      recommendations.push(...preferenceRecs);

      // Remove duplicates and return top recommendations
      const uniqueRecs = this.removeDuplicateRecommendations(recommendations);
      
      return {
        recommendations: uniqueRecs.slice(0, 6), // Top 6 recommendations
        weather: this.weatherData,
        userPreferences: this.userPreferences,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return this.getDefaultRecommendations();
    }
  }

  // Weather-based recommendations
  getWeatherBasedRecommendations() {
    if (!this.weatherData) return [];

    const { temperature, condition } = this.weatherData;
    const recommendations = [];

    if (temperature < 15) {
      recommendations.push({
        type: 'weather',
        reason: 'Cold weather calls for warming drinks',
        drinks: ['Hot Chocolate', 'Cappuccino', 'Latte', 'Americano'],
        priority: 'high'
      });
    } else if (temperature > 25) {
      recommendations.push({
        type: 'weather',
        reason: 'Hot day - perfect for refreshing drinks',
        drinks: ['Iced Coffee', 'Cold Brew', 'Frappuccino', 'Iced Tea'],
        priority: 'high'
      });
    }

    if (condition === 'rain' || condition === 'drizzle') {
      recommendations.push({
        type: 'weather',
        reason: 'Rainy day comfort drinks',
        drinks: ['Hot Chocolate', 'Cappuccino', 'Chai Latte'],
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // Time-based recommendations
  getTimeBasedRecommendations(hour, isWeekend) {
    const recommendations = [];

    if (hour >= 6 && hour < 10) {
      recommendations.push({
        type: 'time',
        reason: 'Morning energy boost',
        drinks: ['Espresso', 'Americano', 'Cappuccino', 'Latte'],
        priority: 'high'
      });
    } else if (hour >= 10 && hour < 14) {
      recommendations.push({
        type: 'time',
        reason: 'Mid-morning pick-me-up',
        drinks: ['Cappuccino', 'Latte', 'Macchiato'],
        priority: 'medium'
      });
    } else if (hour >= 14 && hour < 18) {
      recommendations.push({
        type: 'time',
        reason: 'Afternoon refreshment',
        drinks: ['Iced Coffee', 'Cold Brew', 'Frappuccino'],
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'time',
        reason: 'Evening relaxation',
        drinks: ['Decaf Coffee', 'Hot Chocolate', 'Herbal Tea'],
        priority: 'low'
      });
    }

    if (isWeekend) {
      recommendations.push({
        type: 'time',
        reason: 'Weekend treat',
        drinks: ['Frappuccino', 'Specialty Latte', 'Hot Chocolate'],
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // Preference-based recommendations
  getPreferenceBasedRecommendations() {
    if (!this.userPreferences) return [];

    const recommendations = [];
    const { tasteProfile, favoriteDrinks, dietaryRestrictions } = this.userPreferences;

    // Recommend based on taste profile
    if (tasteProfile.sweetness > 3.5) {
      recommendations.push({
        type: 'preference',
        reason: 'Based on your sweet tooth',
        drinks: ['Hot Chocolate', 'Vanilla Latte', 'Caramel Macchiato'],
        priority: 'medium'
      });
    }

    if (tasteProfile.acidity > 3.5) {
      recommendations.push({
        type: 'preference',
        reason: 'Bright and acidic flavors',
        drinks: ['Americano', 'Cold Brew', 'Light Roast Coffee'],
        priority: 'medium'
      });
    }

    // Recommend dietary alternatives
    if (dietaryRestrictions.includes('oat')) {
      recommendations.push({
        type: 'preference',
        reason: 'Oat milk alternatives',
        drinks: ['Oat Milk Latte', 'Oat Milk Cappuccino'],
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // Remove duplicate recommendations
  removeDuplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter(rec => {
      const key = rec.drinks.join(',');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Get default recommendations
  getDefaultRecommendations() {
    return {
      recommendations: [
        {
          type: 'default',
          reason: 'Popular choice',
          drinks: ['Cappuccino', 'Latte', 'Americano'],
          priority: 'medium'
        }
      ],
      weather: null,
      userPreferences: null,
      generatedAt: new Date()
    };
  }
}

// Create singleton instance
const smartRecommendationService = new SmartRecommendationService();

export default smartRecommendationService;
