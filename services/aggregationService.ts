import { LocationResolver } from './locationResolver.js';
import { PriceServices } from './priceServices.js';
import type { SearchRequest, TravelOption, SearchResponse, ProviderResponse } from '../types/index.js';

export class AggregationService {
  static async searchTravelOptions(searchParams: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const [fromLocations, toLocations] = await Promise.allSettled([
        LocationResolver.resolveAllLocations(searchParams.from),
        LocationResolver.resolveAllLocations(searchParams.to)
      ]);

      if (fromLocations.status === 'rejected') {
        errors.push(`Failed to resolve departure location: ${searchParams.from}`);
      }

      if (toLocations.status === 'rejected') {
        errors.push(`Failed to resolve destination location: ${searchParams.to}`);
      }

      if (fromLocations.status === 'rejected' || toLocations.status === 'rejected') {
        return {
          success: false,
          data: {
            options: [],
            searchParams,
            timestamp: new Date().toISOString()
          },
          errors
        };
      }

      const fromLocs = fromLocations.value;
      const toLocs = toLocations.value;

      const hasValidRoutes = 
        (fromLocs.train.length > 0 && toLocs.train.length > 0) ||
        (fromLocs.bus.length > 0 && toLocs.bus.length > 0) ||
        (fromLocs.flight.length > 0 && toLocs.flight.length > 0);

      if (!hasValidRoutes) {
        errors.push('No valid transport routes found between specified locations');
        return {
          success: false,
          data: {
            options: [],
            searchParams,
            timestamp: new Date().toISOString()
          },
          errors
        };
      }

      const travelOptions = await PriceServices.fetchAllPrices(fromLocs, toLocs, searchParams.date, searchParams.flightClass, searchParams.trainClass);

      const sortedOptions = this.sortAndFilterOptions(travelOptions);

      const processingTime = Date.now() - startTime;
      console.log(`Search completed in ${processingTime}ms, found ${sortedOptions.length} options`);

      return {
        success: true,
        data: {
          options: sortedOptions,
          searchParams,
          timestamp: new Date().toISOString()
        },
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Aggregation service error:', error);
      errors.push('Internal server error during search');
      
      return {
        success: false,
        data: {
          options: [],
          searchParams,
          timestamp: new Date().toISOString()
        },
        errors
      };
    }
  }

  private static sortAndFilterOptions(options: TravelOption[]): TravelOption[] {
    return options
      .filter(option => option.availability && option.price.amount > 0)
      .sort((a, b) => {
        if (a.price.amount !== b.price.amount) {
          return a.price.amount - b.price.amount;
        }
        
        const timeA = this.parseTime(a.from.time);
        const timeB = this.parseTime(b.from.time);
        return timeA - timeB;
      })
      .slice(0, 50);
  }

  private static parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  static async getProviderStatus(): Promise<ProviderResponse[]> {
    const testLocation = 'Mumbai';
    const testDate = new Date().toISOString().split('T')[0];

    const [trainTest, busTest, flightTest] = await Promise.allSettled([
      LocationResolver.resolveTrainStations(testLocation),
      LocationResolver.resolveBusStations(testLocation),
      LocationResolver.resolveAirports(testLocation)
    ]);

    return [
      {
        provider: 'IRCTC (Trains)',
        success: trainTest.status === 'fulfilled' && trainTest.value.length > 0,
        error: trainTest.status === 'rejected' ? 'Service unavailable' : undefined
      },
      {
        provider: 'Goibibo (Buses)',
        success: busTest.status === 'fulfilled' && busTest.value.length > 0,
        error: busTest.status === 'rejected' ? 'Service unavailable' : undefined
      },
      {
        provider: 'Ixigo (Flights)',
        success: flightTest.status === 'fulfilled' && flightTest.value.length > 0,
        error: flightTest.status === 'rejected' ? 'Service unavailable' : undefined
      }
    ];
  }

  static validateSearchParams(params: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.from || typeof params.from !== 'string' || params.from.trim().length < 2) {
      errors.push('From location is required and must be at least 2 characters');
    }

    if (!params.to || typeof params.to !== 'string' || params.to.trim().length < 2) {
      errors.push('To location is required and must be at least 2 characters');
    }

    if (!params.date || typeof params.date !== 'string') {
      errors.push('Date is required');
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(params.date)) {
        errors.push('Date must be in YYYY-MM-DD format');
      } else {
        const searchDate = new Date(params.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (searchDate < today) {
          errors.push('Date cannot be in the past');
        }
        
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 120);
        if (searchDate > maxDate) {
          errors.push('Date cannot be more than 120 days in the future');
        }
      }
    }

    if (params.returnDate) {
      if (typeof params.returnDate !== 'string') {
        errors.push('Return date must be a string');
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(params.returnDate)) {
          errors.push('Return date must be in YYYY-MM-DD format');
        } else if (params.date) {
          const departureDate = new Date(params.date);
          const returnDate = new Date(params.returnDate);
          if (returnDate <= departureDate) {
            errors.push('Return date must be after departure date');
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
