class CustomerBehaviorAnalytics {
  constructor() {
    this.customerData = new Map();
    this.behaviorPatterns = new Map();
    this.insights = [];
    this.lastUpdate = null;
    this.updateInterval = 30 * 60 * 1000; // 30 minutes
    
    this.init();
  }

  init() {
    this.setupBehaviorPatterns();
    this.loadCustomerData();
  }

  setupBehaviorPatterns() {
    // Define common customer behavior patterns
    this.behaviorPatterns.set('morning_rush', {
      timeRange: { start: 7, end: 9 },
      description: 'Early morning coffee drinkers',
      characteristics: ['quick orders', 'premium drinks', 'high frequency']
    });

    this.behaviorPatterns.set('lunch_crowd', {
      timeRange: { start: 12, end: 14 },
      description: 'Lunch break customers',
      characteristics: ['food + drink', 'medium spend', 'regular frequency']
    });

    this.behaviorPatterns.set('afternoon_pickup', {
      timeRange: { start: 15, end: 17 },
      description: 'Afternoon energy boost seekers',
      characteristics: ['iced drinks', 'moderate spend', 'occasional frequency']
    });

    this.behaviorPatterns.set('evening_relaxation', {
      timeRange: { start: 18, end: 20 },
      description: 'Evening coffee enthusiasts',
      characteristics: ['specialty drinks', 'high spend', 'social visits']
    });

    this.behaviorPatterns.set('weekend_leisurely', {
      dayRange: [0, 6], // Sunday, Saturday
      description: 'Weekend leisure customers',
      characteristics: ['longer visits', 'experimental orders', 'higher spend']
    });
  }

  async loadCustomerData() {
    try {
      // This would typically fetch from your API
      // For now, we'll generate mock customer data
      this.customerData = this.generateMockCustomerData();
      this.lastUpdate = new Date();
    } catch (error) {
      console.error('Failed to load customer data:', error);
    }
  }

  generateMockCustomerData() {
    const customers = new Map();
    const customerTypes = ['regular', 'occasional', 'new', 'vip'];
    const drinkPreferences = ['espresso', 'latte', 'cappuccino', 'cold_brew', 'frappuccino'];
    
    // Generate 100 mock customers
    for (let i = 1; i <= 100; i++) {
      const customerType = customerTypes[Math.floor(Math.random() * customerTypes.length)];
      const totalOrders = this.generateOrderCount(customerType);
      const avgOrderValue = this.generateOrderValue(customerType);
      
      const customer = {
        id: `customer_${i}`,
        type: customerType,
        totalOrders,
        avgOrderValue,
        totalSpent: totalOrders * avgOrderValue,
        favoriteDrink: drinkPreferences[Math.floor(Math.random() * drinkPreferences.length)],
        visitFrequency: this.generateVisitFrequency(customerType),
        lastVisit: this.generateLastVisit(customerType),
        orderHistory: this.generateOrderHistory(totalOrders, customerType),
        preferences: this.generatePreferences(customerType),
        loyaltyScore: this.generateLoyaltyScore(customerType),
        churnRisk: this.generateChurnRisk(customerType, totalOrders)
      };
      
      customers.set(customer.id, customer);
    }
    
    return customers;
  }

  generateOrderCount(customerType) {
    const ranges = {
      'regular': [20, 50],
      'occasional': [5, 15],
      'new': [1, 5],
      'vip': [30, 100]
    };
    const [min, max] = ranges[customerType];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateOrderValue(customerType) {
    const ranges = {
      'regular': [8, 15],
      'occasional': [5, 12],
      'new': [6, 10],
      'vip': [12, 25]
    };
    const [min, max] = ranges[customerType];
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  generateVisitFrequency(customerType) {
    const frequencies = {
      'regular': 'weekly',
      'occasional': 'monthly',
      'new': 'first_time',
      'vip': 'daily'
    };
    return frequencies[customerType];
  }

  generateLastVisit(customerType) {
    const daysAgo = {
      'regular': Math.floor(Math.random() * 7), // 0-7 days
      'occasional': Math.floor(Math.random() * 30), // 0-30 days
      'new': Math.floor(Math.random() * 14), // 0-14 days
      'vip': Math.floor(Math.random() * 3) // 0-3 days
    };
    
    const date = new Date();
    date.setDate(date.getDate() - daysAgo[customerType]);
    return date.toISOString();
  }

  generateOrderHistory(totalOrders, customerType) {
    const history = [];
    const drinks = ['espresso', 'latte', 'cappuccino', 'cold_brew', 'frappuccino', 'americano'];
    
    for (let i = 0; i < totalOrders; i++) {
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 90)); // Last 90 days
      
      history.push({
        date: orderDate.toISOString(),
        drink: drinks[Math.floor(Math.random() * drinks.length)],
        value: this.generateOrderValue(customerType),
        timeOfDay: this.generateTimeOfDay(customerType)
      });
    }
    
    return history.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  generateTimeOfDay(customerType) {
    const timePreferences = {
      'regular': ['morning', 'afternoon'],
      'occasional': ['lunch', 'evening'],
      'new': ['morning', 'lunch'],
      'vip': ['morning', 'afternoon', 'evening']
    };
    
    const times = timePreferences[customerType];
    return times[Math.floor(Math.random() * times.length)];
  }

  generatePreferences(customerType) {
    const preferences = {
      'regular': ['quick_service', 'consistent_quality'],
      'occasional': ['good_value', 'convenient_location'],
      'new': ['friendly_staff', 'good_atmosphere'],
      'vip': ['premium_service', 'exclusive_options', 'personalized_experience']
    };
    
    return preferences[customerType];
  }

  generateLoyaltyScore(customerType) {
    const ranges = {
      'regular': [70, 85],
      'occasional': [40, 60],
      'new': [20, 40],
      'vip': [85, 100]
    };
    const [min, max] = ranges[customerType];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateChurnRisk(customerType, totalOrders) {
    let baseRisk = {
      'regular': 0.1,
      'occasional': 0.3,
      'new': 0.5,
      'vip': 0.05
    }[customerType];
    
    // Adjust based on order frequency
    if (totalOrders < 5) baseRisk += 0.2;
    if (totalOrders > 20) baseRisk -= 0.1;
    
    return Math.min(1.0, Math.max(0.0, baseRisk + (Math.random() - 0.5) * 0.2));
  }

  analyzeCustomerSegments() {
    const segments = {
      'high_value': [],
      'frequent': [],
      'at_risk': [],
      'new_customers': [],
      'loyal': []
    };

    this.customerData.forEach(customer => {
      // High value customers (top 20% by total spent)
      if (customer.totalSpent > this.getPercentile(80, 'totalSpent')) {
        segments.high_value.push(customer);
      }

      // Frequent customers (top 20% by order count)
      if (customer.totalOrders > this.getPercentile(80, 'totalOrders')) {
        segments.frequent.push(customer);
      }

      // At-risk customers (high churn risk)
      if (customer.churnRisk > 0.7) {
        segments.at_risk.push(customer);
      }

      // New customers
      if (customer.type === 'new') {
        segments.new_customers.push(customer);
      }

      // Loyal customers (high loyalty score)
      if (customer.loyaltyScore > 80) {
        segments.loyal.push(customer);
      }
    });

    return segments;
  }

  getPercentile(percentile, field) {
    const values = Array.from(this.customerData.values())
      .map(customer => customer[field])
      .sort((a, b) => a - b);
    
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[index] || 0;
  }

  analyzeBehaviorPatterns() {
    const patterns = {
      'peak_hours': this.analyzePeakHours(),
      'popular_drinks': this.analyzePopularDrinks(),
      'spending_patterns': this.analyzeSpendingPatterns(),
      'visit_frequency': this.analyzeVisitFrequency(),
      'seasonal_trends': this.analyzeSeasonalTrends()
    };

    return patterns;
  }

  analyzePeakHours() {
    const hourCounts = new Array(24).fill(0);
    
    this.customerData.forEach(customer => {
      customer.orderHistory.forEach(order => {
        const hour = new Date(order.date).getHours();
        hourCounts[hour]++;
      });
    });

    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return peakHours;
  }

  analyzePopularDrinks() {
    const drinkCounts = {};
    
    this.customerData.forEach(customer => {
      customer.orderHistory.forEach(order => {
        drinkCounts[order.drink] = (drinkCounts[order.drink] || 0) + 1;
      });
    });

    return Object.entries(drinkCounts)
      .map(([drink, count]) => ({ drink, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  analyzeSpendingPatterns() {
    const spendingRanges = {
      'low': 0,
      'medium': 0,
      'high': 0
    };

    this.customerData.forEach(customer => {
      if (customer.avgOrderValue < 8) {
        spendingRanges.low++;
      } else if (customer.avgOrderValue < 15) {
        spendingRanges.medium++;
      } else {
        spendingRanges.high++;
      }
    });

    return spendingRanges;
  }

  analyzeVisitFrequency() {
    const frequencies = {};
    
    this.customerData.forEach(customer => {
      frequencies[customer.visitFrequency] = (frequencies[customer.visitFrequency] || 0) + 1;
    });

    return frequencies;
  }

  analyzeSeasonalTrends() {
    const monthlyData = new Array(12).fill(0);
    
    this.customerData.forEach(customer => {
      customer.orderHistory.forEach(order => {
        const month = new Date(order.date).getMonth();
        monthlyData[month]++;
      });
    });

    return monthlyData.map((count, month) => ({
      month: month + 1,
      count,
      monthName: new Date(2024, month, 1).toLocaleString('default', { month: 'long' })
    }));
  }

  generateInsights() {
    const insights = [];
    const segments = this.analyzeCustomerSegments();
    const patterns = this.analyzeBehaviorPatterns();

    // High-value customer insight
    if (segments.high_value.length > 0) {
      insights.push({
        type: 'opportunity',
        title: 'High-Value Customer Segment',
        message: `${segments.high_value.length} customers represent significant revenue potential`,
        data: {
          count: segments.high_value.length,
          avgSpent: segments.high_value.reduce((sum, c) => sum + c.totalSpent, 0) / segments.high_value.length,
          totalRevenue: segments.high_value.reduce((sum, c) => sum + c.totalSpent, 0)
        },
        recommendations: [
          'Implement VIP program for high-value customers',
          'Offer exclusive products or early access',
          'Provide personalized service and recommendations'
        ]
      });
    }

    // At-risk customer insight
    if (segments.at_risk.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Customer Retention Alert',
        message: `${segments.at_risk.length} customers are at risk of churning`,
        data: {
          count: segments.at_risk.length,
          avgChurnRisk: segments.at_risk.reduce((sum, c) => sum + c.churnRisk, 0) / segments.at_risk.length
        },
        recommendations: [
          'Send personalized retention offers',
          'Reach out with customer satisfaction surveys',
          'Offer loyalty rewards or discounts'
        ]
      });
    }

    // Peak hours insight
    const topPeakHour = patterns.peak_hours[0];
    if (topPeakHour && topPeakHour.count > 0) {
      insights.push({
        type: 'info',
        title: 'Peak Business Hours',
        message: `Peak activity occurs at ${topPeakHour.hour}:00 with ${topPeakHour.count} orders`,
        data: {
          peakHour: topPeakHour.hour,
          orderCount: topPeakHour.count
        },
        recommendations: [
          'Ensure adequate staffing during peak hours',
          'Consider dynamic pricing during high-demand periods',
          'Optimize menu for quick service during rush times'
        ]
      });
    }

    // Popular drinks insight
    const topDrink = patterns.popular_drinks[0];
    if (topDrink && topDrink.count > 0) {
      insights.push({
        type: 'success',
        title: 'Most Popular Drink',
        message: `${topDrink.drink} is the most ordered item with ${topDrink.count} orders`,
        data: {
          drink: topDrink.drink,
          orderCount: topDrink.count
        },
        recommendations: [
          'Ensure adequate inventory for popular items',
          'Consider promoting complementary products',
          'Use popular items to drive traffic and upsells'
        ]
      });
    }

    return insights;
  }

  getCustomerRecommendations(customerId) {
    const customer = this.customerData.get(customerId);
    if (!customer) return [];

    const recommendations = [];

    // Based on order history
    const recentOrders = customer.orderHistory.slice(0, 5);
    const drinkFrequency = {};
    recentOrders.forEach(order => {
      drinkFrequency[order.drink] = (drinkFrequency[order.drink] || 0) + 1;
    });

    const mostOrderedDrink = Object.entries(drinkFrequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    if (mostOrderedDrink) {
      recommendations.push({
        type: 'product',
        title: 'Try Something New',
        message: `Since you love ${mostOrderedDrink}, you might enjoy our seasonal specials`,
        priority: 'medium'
      });
    }

    // Based on spending pattern
    if (customer.avgOrderValue < 10) {
      recommendations.push({
        type: 'upsell',
        title: 'Upgrade Your Experience',
        message: 'Try our premium drinks for a special treat',
        priority: 'low'
      });
    }

    // Based on visit frequency
    if (customer.visitFrequency === 'occasional') {
      recommendations.push({
        type: 'engagement',
        title: 'Come Back Soon',
        message: 'We miss you! Come visit us for your favorite coffee',
        priority: 'high'
      });
    }

    // Based on churn risk
    if (customer.churnRisk > 0.6) {
      recommendations.push({
        type: 'retention',
        title: 'Special Offer',
        message: 'Enjoy 20% off your next order as our valued customer',
        priority: 'high'
      });
    }

    return recommendations;
  }

  async getAnalyticsSummary() {
    try {
      const segments = this.analyzeCustomerSegments();
      const patterns = this.analyzeBehaviorPatterns();
      const insights = this.generateInsights();

      return {
        summary: {
          totalCustomers: this.customerData.size,
          highValueCustomers: segments.high_value.length,
          atRiskCustomers: segments.at_risk.length,
          avgOrderValue: this.calculateAverageOrderValue(),
          totalRevenue: this.calculateTotalRevenue()
        },
        segments,
        patterns,
        insights,
        lastUpdated: this.lastUpdate
      };
    } catch (error) {
      console.error('Failed to generate analytics summary:', error);
      throw error;
    }
  }

  calculateAverageOrderValue() {
    const totalValue = Array.from(this.customerData.values())
      .reduce((sum, customer) => sum + customer.avgOrderValue, 0);
    return Math.round((totalValue / this.customerData.size) * 100) / 100;
  }

  calculateTotalRevenue() {
    return Array.from(this.customerData.values())
      .reduce((sum, customer) => sum + customer.totalSpent, 0);
  }
}

// Create singleton instance
const customerBehaviorAnalytics = new CustomerBehaviorAnalytics();

export default customerBehaviorAnalytics;
