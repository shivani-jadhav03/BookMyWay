import { ApiClient } from './apiClient.js';
import { format, parse } from 'date-fns';
import type { TravelOption, LocationSearchResult } from '../types/index.js';

export class PriceServices {
  static async fetchTrainPrices(
    fromStation: LocationSearchResult,
    toStation: LocationSearchResult,
    date: string,
    trainClass: string = 'SL'
  ): Promise<TravelOption[]> {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    const indianRailwaysHost = process.env.INDIAN_RAILWAYS_API_HOST;

    if (!rapidApiKey || !indianRailwaysHost) {
      console.warn('RapidAPI credentials not configured for trains');
      return [];
    }

    try {
      const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyyMMdd');
      
      const response = await ApiClient.get(
        `https://${indianRailwaysHost}/api/v2/TrainBetweenStations`,
        {
          fromStationCode: fromStation.code,
          toStationCode: toStation.code,
          dateOfJourney: formattedDate
        },
        {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': indianRailwaysHost
        },
        true // use cache
      );

      if (response.success && response.data) {
        return this.parseTrainResponse(response.data, fromStation, toStation, trainClass, date);
      }
    } catch (error) {
      console.error('RapidAPI train fetch failed:', error);
    }

    return [];
  }

  private static parseTrainResponse(
    data: any,
    fromStation: LocationSearchResult,
    toStation: LocationSearchResult,
    trainClass: string,
    date: string
  ): TravelOption[] {
    const getTrainAmenities = (cls: string) => {
      const baseAmenities = ['Charging Point', 'Reading Light'];
      switch (cls) {
        case '1A':
          return [...baseAmenities, 'AC', 'Bed Sheet', 'Pillow', 'Blanket', 'Meals'];
        case '2A':
          return [...baseAmenities, 'AC', 'Bed Sheet', 'Pillow', 'Blanket'];
        case '3A':
          return [...baseAmenities, 'AC', 'Bed Sheet', 'Pillow'];
        case '3E':
          return [...baseAmenities, 'AC'];
        case 'CC':
          return [...baseAmenities, 'AC'];
        case 'SL':
          return [...baseAmenities, 'Fan'];
        default:
          return baseAmenities;
      }
    };

    const classPriceMultiplier = {
      '2S': 0.3,
      'SL': 1.0,
      '3E': 1.8,
      'CC': 2.2,
      '3A': 2.8,
      '2A': 4.5,
      '1A': 8.0
    };

    const trains = data.data || data.trains || [];
    
    return trains.slice(0, 10).map((train: any) => {
      const basePrice = train.price || 800;
      const adjustedPrice = Math.round(basePrice * (classPriceMultiplier[trainClass as keyof typeof classPriceMultiplier] || 1.0));
      
      // Generate IRCTC booking URL
      const bookingUrl = `https://www.irctc.co.in/nget/train-search?from=${fromStation.code}&to=${toStation.code}&date=${date}&class=${trainClass}`;
      
      return {
        id: `train-${train.trainNumber || train.train_no}-${Date.now()}`,
        provider: 'IRCTC',
        type: 'train' as const,
        from: {
          code: fromStation.code,
          name: fromStation.name,
          time: train.departureTime || train.departure || '00:00'
        },
        to: {
          code: toStation.code,
          name: toStation.name,
          time: train.arrivalTime || train.arrival || '00:00'
        },
        duration: train.duration || train.travelTime || 'N/A',
        price: {
          amount: adjustedPrice,
          currency: 'INR'
        },
        availability: train.availability !== 'NA',
        bookingReference: train.trainNumber || train.train_no,
        class: trainClass,
        operator: train.trainName || train.name || 'Express',
        amenities: getTrainAmenities(trainClass),
        bookingUrl
      };
    });
  }

  static async fetchBusPrices(
    fromStation: LocationSearchResult,
    toStation: LocationSearchResult,
    date: string
  ): Promise<TravelOption[]> {
    const redBusApiKey = process.env.REDBUS_API_KEY;

    if (!redBusApiKey) {
      console.warn('RedBus API key not configured for buses');
      return [];
    }

    try {
      const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyyMMdd');
      
      const response = await ApiClient.post(
        'https://api.redbus.in/search',
        {
          source: fromStation.code,
          destination: toStation.code,
          dateOfJourney: formattedDate
        },
        {
          'Authorization': `Bearer ${redBusApiKey}`
        },
        true // use cache
      );

      if (response.success && response.data) {
        return this.parseBusResponse(response.data, fromStation, toStation, date);
      }
    } catch (error) {
      console.error('RedBus API fetch failed:', error);
    }

    return [];
  }

  private static parseBusResponse(
    data: any,
    fromStation: LocationSearchResult,
    toStation: LocationSearchResult,
    date: string
  ): TravelOption[] {
    const amenities = ['AC', 'WiFi', 'Charging Points', 'Water Bottle', 'Blanket', 'Recliner Seats'];
    const buses = data.buses || data.data || [];
    
    return buses.slice(0, 15).map((bus: any) => {
      // Generate RedBus booking URL
      const bookingUrl = `https://www.redbus.in/bus-ticket-booking?from=${fromStation.code}&to=${toStation.code}&onward=${date}`;
      
      return {
        id: `bus-${bus.id || bus.busId}-${Date.now()}`,
        provider: 'RedBus',
        type: 'bus' as const,
        from: {
          code: fromStation.code,
          name: fromStation.name,
          time: bus.departureTime || bus.departure || '00:00'
        },
        to: {
          code: toStation.code,
          name: toStation.name,
          time: bus.arrivalTime || bus.arrival || '00:00'
        },
        duration: bus.duration || bus.travelTime || 'N/A',
        price: {
          amount: bus.price || bus.fare || 500,
          currency: 'INR'
        },
        availability: bus.availableSeats > 0,
        bookingReference: bus.id || bus.busId,
        operator: bus.operatorName || bus.operator || 'Bus Operator',
        stops: bus.stops || 0,
        amenities: amenities.slice(0, 4 + Math.floor(Math.random() * 2)),
        bookingUrl
      };
    });
  }

  static async fetchFlightPrices(
    fromAirport: LocationSearchResult,
    toAirport: LocationSearchResult,
    date: string,
    flightClass: string = 'e'
  ): Promise<TravelOption[]> {
    const aviationStackKey = process.env.AVIATION_STACK_API_KEY;

    if (!aviationStackKey) {
      console.warn('Aviation Stack API key not configured for flights');
      return [];
    }

    try {
      const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');
      
      const response = await ApiClient.get(
        'http://api.aviationstack.com/v1/flights',
        {
          access_key: aviationStackKey,
          dep_iata: fromAirport.code,
          arr_iata: toAirport.code,
          flight_date: formattedDate
        },
        {},
        true // use cache
      );

      if (response.success && response.data) {
        return this.parseFlightResponse(response.data, fromAirport, toAirport, flightClass, date);
      }
    } catch (error) {
      console.error('Aviation Stack API fetch failed:', error);
    }

    return [];
  }

  private static parseFlightResponse(
    data: any,
    fromAirport: LocationSearchResult,
    toAirport: LocationSearchResult,
    flightClass: string,
    date: string
  ): TravelOption[] {
    const classNames = {
      'e': 'Economy',
      'b': 'Business',
      'w': 'Premium'
    };
    const classPriceMultiplier = {
      'e': 1.0,
      'b': 2.5,
      'w': 4.0
    };
    
    const flights = data.data || data.flights || [];
    
    return flights.slice(0, 15).map((flight: any) => {
      const baseFare = flight.price?.amount || flight.price || 5000;
      const adjustedPrice = Math.round(baseFare * (classPriceMultiplier[flightClass as keyof typeof classPriceMultiplier] || 1.0));
      
      // Generate airline booking URL based on airline
      const airlineName = flight.airline?.name || flight.airlineName || '';
      const bookingUrl = this.generateFlightBookingUrl(airlineName, fromAirport.code, toAirport.code, date);
      
      return {
        id: `flight-${flight.flight?.iata || flight.flightNumber}-${Date.now()}`,
        provider: 'Aviation Stack',
        type: 'flight' as const,
        from: {
          code: fromAirport.code,
          name: fromAirport.name,
          time: flight.departure?.time || flight.departureTime || '06:00'
        },
        to: {
          code: toAirport.code,
          name: toAirport.name,
          time: flight.arrival?.time || flight.arrivalTime || '08:30'
        },
        duration: flight.duration || flight.flightTime || '2h 30m',
        price: {
          amount: adjustedPrice,
          currency: flight.price?.currency || 'INR'
        },
        availability: flight.flight_status === 'active' || flight.status === 'scheduled',
        bookingReference: flight.flight?.iata || flight.flightNumber || flight.id,
        operator: airlineName || 'Airline',
        stops: flight.stops || 0,
        class: classNames[flightClass as keyof typeof classNames] || 'Economy',
        amenities: ['AC', 'In-flight Entertainment', 'Meals', 'Baggage Allowance'],
        bookingUrl
      };
    });
  }

  private static generateFlightBookingUrl(airline: string, from: string, to: string, date: string): string {
    const airlineLower = airline.toLowerCase();
    
    // Map airlines to their booking URLs
    if (airlineLower.includes('air india')) {
      return `https://www.airindia.com/in/flights?from=${from}&to=${to}&date=${date}`;
    } else if (airlineLower.includes('indigo')) {
      return `https://www.goindigo.in/?from=${from}&to=${to}&date=${date}`;
    } else if (airlineLower.includes('spicejet')) {
      return `https://www.spicejet.com/?from=${from}&to=${to}&date=${date}`;
    } else if (airlineLower.includes('vistara')) {
      return `https://www.airvistara.com/?from=${from}&to=${to}&date=${date}`;
    } else if (airlineLower.includes('goair')) {
      return `https://www.goair.in/?from=${from}&to=${to}&date=${date}`;
    }
    
    // Default to a generic flight search
    return `https://www.google.com/travel/flights?q=flights%20from%20${from}%20to%20${to}%20on%20${date}`;
  }

  static async fetchAllPrices(
    fromLocations: { train: LocationSearchResult[]; bus: LocationSearchResult[]; flight: LocationSearchResult[] },
    toLocations: { train: LocationSearchResult[]; bus: LocationSearchResult[]; flight: LocationSearchResult[] },
    date: string,
    flightClass: string = 'e',
    trainClass: string = 'SL'
  ): Promise<TravelOption[]> {
    // Run all API requests in parallel for optimal speed
    const allPromises: Promise<TravelOption[]>[] = [];

    if (fromLocations.train.length > 0 && toLocations.train.length > 0) {
      allPromises.push(
        this.fetchTrainPrices(fromLocations.train[0], toLocations.train[0], date, trainClass)
      );
    }

    if (fromLocations.bus.length > 0 && toLocations.bus.length > 0) {
      allPromises.push(
        this.fetchBusPrices(fromLocations.bus[0], toLocations.bus[0], date)
      );
    }

    if (fromLocations.flight.length > 0 && toLocations.flight.length > 0) {
      allPromises.push(
        this.fetchFlightPrices(fromLocations.flight[0], toLocations.flight[0], date, flightClass)
      );
    }

    // Use Promise.allSettled to ensure all requests complete even if some fail
    const results = await Promise.allSettled(allPromises);
    
    // Return all successful results, filter by availability
    return results
      .filter((result): result is PromiseFulfilledResult<TravelOption[]> => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .filter(option => option.availability);
  }
}
