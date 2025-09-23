class LocationService {
  constructor() {
    this.currentLocation = null;
    this.locationPermission = null;
    this.locationError = null;
  }

  // Request location permission and get current location
  async requestLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        this.locationError = 'Geolocation is not supported by this browser';
        reject(new Error(this.locationError));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          this.locationPermission = 'granted';
          this.locationError = null;
          resolve(this.currentLocation);
        },
        (error) => {
          this.locationError = this.getErrorMessage(error.code);
          this.locationPermission = 'denied';
          reject(new Error(this.locationError));
        },
        options
      );
    });
  }

  // Get error message based on error code
  getErrorMessage(errorCode) {
    switch (errorCode) {
      case 1:
        return 'Location access denied by user';
      case 2:
        return 'Location information unavailable';
      case 3:
        return 'Location request timed out';
      default:
        return 'Unknown location error';
    }
  }

  // Check if location permission is granted
  async checkLocationPermission() {
    if (!navigator.permissions) {
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      this.locationPermission = permission.state;
      return permission.state;
    } catch (error) {
      console.warn('Permission API not supported:', error);
      return 'unknown';
    }
  }

  // Get location by city name (fallback)
  async getLocationByCity(cityName) {
    try {
      // Using a free geocoding service (you might want to use a more reliable one)
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${process.env.REACT_APP_WEATHER_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: data[0].lat,
          longitude: data[0].lon,
          city: data[0].name,
          country: data[0].country,
          state: data[0].state
        };
      } else {
        throw new Error('City not found');
      }
    } catch (error) {
      console.error('Error fetching location by city:', error);
      throw error;
    }
  }

  // Get current location or fallback to default
  async getCurrentLocation() {
    try {
      // First try to get user's current location
      if (this.locationPermission !== 'denied') {
        return await this.requestLocation();
      }
    } catch (error) {
      console.warn('Could not get current location:', error.message);
    }

    // Fallback to default location (San Francisco)
    return {
      latitude: 37.7749,
      longitude: -122.4194,
      city: 'San Francisco',
      country: 'US',
      state: 'CA',
      isDefault: true
    };
  }

  // Get location coordinates for weather API
  async getLocationForWeather() {
    try {
      const location = await this.getCurrentLocation();
      return {
        lat: location.latitude,
        lon: location.longitude,
        city: location.city || 'Unknown',
        isDefault: location.isDefault || false
      };
    } catch (error) {
      console.error('Error getting location for weather:', error);
      // Return default San Francisco coordinates
      return {
        lat: 37.7749,
        lon: -122.4194,
        city: 'San Francisco',
        isDefault: true
      };
    }
  }

  // Format location for display
  formatLocation(location) {
    if (location.city && location.country) {
      return `${location.city}, ${location.country}`;
    } else if (location.city) {
      return location.city;
    } else {
      return `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
    }
  }
}

// Create singleton instance
const locationService = new LocationService();
export default locationService;
