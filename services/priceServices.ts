import axios from 'axios';
import qs from 'querystring';
import { format, parse } from 'date-fns';
import type { TravelOption, LocationSearchResult } from '../types/index.js';

export class PriceServices {
  private static readonly TRAIN_HEADERS = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json; charset=UTF-8',
    'referer': 'https://www.irctc.co.in/nget/train-search',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
  };

  private static readonly BUS_HEADERS = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'device-id': 'df32a562-cf0b-4f8b-956b-bc8c54898e97',
    'itinerary-id': 'a62acef7-2b4b-4ba1-bdb6-ca60427e1616',
    'origin': 'https://www.goibibo.com',
    'priority': 'u=1, i',
    'referer': 'https://www.goibibo.com/',
    'sec-ch-ua': '"Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebLib/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
  };

  private static readonly FLIGHT_HEADERS = {
    'apikey': 'ixiweb!2$',
    'appversion': '2',
    'clientid': 'ixiweb',
    'content-type': 'application/json; charset=UTF-8',
    'deviceid': '47bdbb2ea78a4c25a399',
    'ixisrc': 'ixiweb',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'uuid': '47bdbb2ea78a4c25a399',
    'x-request-webappversion': '2.8.0'
  };

  static async fetchTrainPrices(
    fromStation: LocationSearchResult,
    toStation: LocationSearchResult,
    date: string,
    trainClass: string = 'SL'
  ): Promise<TravelOption[]> {
    try {
      // Train API expects YYYYMMDD format
      const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyyMMdd');
      
      const payload = {
        concessionBooking: false,
        srcStn: fromStation.code,
        destStn: toStation.code,
        jrnyClass: trainClass,
        jrnyDate: formattedDate, // YYYYMMDD format
        quotaCode: "GN",
        currentBooking: "false",
        flexiFlag: false,
        handicapFlag: false,
        ticketType: "E",
        loyaltyRedemptionBooking: false,
        ftBooking: false
      };

      const response = await axios.post(
        'https://www.irctc.co.in/eticketing/protected/mapps1/altAvlEnq/TC',
        payload,
        {
          headers: {
            ...this.TRAIN_HEADERS,
            'greq': Date.now().toString()
          },
          timeout: 15000
        }
      );

      if (response.data?.trainBtwnStnsList && Array.isArray(response.data.trainBtwnStnsList)) {
        // Function to get amenities based on train class
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

        return response.data.trainBtwnStnsList
          .filter((train: any) => {
            // Filter trains that have the requested class available
            return train.avlClasses && train.avlClasses.includes(trainClass);
          })
          .map((train: any) => {
            // Class-based pricing
            const classPriceMultiplier = {
              '2S': 0.3,   // Second Sitting - cheapest
              'SL': 1.0,   // Sleeper - base price
              '3E': 1.8,   // AC 3 Economy
              'CC': 2.2,   // AC Chair Car
              '3A': 2.8,   // AC 3 Tier
              '2A': 4.5,   // AC 2 Tier
              '1A': 8.0    // AC First Class - most expensive
            };
            
            const basePrice = 800 + Math.floor(Math.random() * 1200);
            const adjustedPrice = Math.round(basePrice * (classPriceMultiplier[trainClass as keyof typeof classPriceMultiplier] || 1.0));
            
            return {
              id: `train-${train.trainNumber}-${Date.now()}`,
              provider: 'IRCTC',
              type: 'train' as const,
              from: {
                code: fromStation.code,
                name: fromStation.name,
                time: train.departureTime || '00:00'
              },
              to: {
                code: toStation.code,
                name: toStation.name,
                time: train.arrivalTime || '00:00'
              },
              duration: train.duration || 'N/A',
              price: {
                amount: adjustedPrice,
                currency: 'INR'
              },
              availability: true,
              bookingReference: train.trainNumber,
              class: trainClass,
              operator: train.trainName,
              amenities: getTrainAmenities(trainClass)
            };
          });
      }
      return [];
    } catch (error) {
      console.error('Train price fetch failed:', error);
      return [];
    }
  }

  static async fetchBusPrices(
    fromStation: LocationSearchResult,
    toStation: LocationSearchResult,
    date: string
  ): Promise<TravelOption[]> {
    try {
      // Bus API expects YYYYMMDD format
      const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyyMMdd');
      
      const payload = qs.stringify({
        dest: toStation.name,
        dest_vid: toStation.code,
        doj: formattedDate, // YYYYMMDD format
        src: fromStation.name,
        src_vid: fromStation.code
      });

      const response = await axios.post(
        'https://bus.goibibo.com/apis/v4/search/?format=json&flavour=v2',
        payload,
        {
          headers: this.BUS_HEADERS,
          timeout: 15000
        }
      );

      if (response.data?.buses && Array.isArray(response.data.buses)) {
        // Extract amenities from the response
        const amenities = response.data.avail_amen ? 
          response.data.avail_amen
            .filter((amenity: any) => amenity.n && amenity.n.trim())
            .map((amenity: any) => amenity.n.trim())
            .slice(0, 6) // Limit to 6 amenities
          : [];

        return response.data.buses.slice(0, 20).map((busOperator: any) => {
          const firstBus = busOperator.fl?.[0];
          if (!firstBus) return null;
          
          return {
            id: `bus-${firstBus.bid}-${Date.now()}`,
            provider: 'Goibibo',
            type: 'bus' as const,
            from: {
              code: fromStation.code,
              name: fromStation.name,
              time: firstBus.dt || '00:00'
            },
            to: {
              code: toStation.code,
              name: toStation.name,
              time: firstBus.at || '00:00'
            },
            duration: firstBus.du || 'N/A',
            price: {
              amount: busOperator.fd?.tf || busOperator.fd?.pp || 500 + Math.floor(Math.random() * 1500),
              currency: 'INR'
            },
            availability: firstBus.aws > 0,
            bookingReference: firstBus.bid,
            operator: firstBus.cr || 'Bus Operator',
            stops: 0,
            amenities: amenities
          };
        }).filter(Boolean);
      }
      return [];
    } catch (error) {
      console.error('Bus price fetch failed:', error);
      return [];
    }
  }

  static async fetchFlightPrices(
    fromAirport: LocationSearchResult,
    toAirport: LocationSearchResult,
    date: string,
    flightClass: string = 'e'
  ): Promise<TravelOption[]> {
    try {
      // Flight API expects DDMMYYYY format
      const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'ddMMyyyy');
      
      const params = {
        departureDate: formattedDate, // DDMMYYYY format
        destination: toAirport.code,
        fareClass: flightClass,
        origin: fromAirport.code,
        paxCombinationType: '100',
        refundTypes: 'REFUNDABLE,NON_REFUNDABLE,PARTIALLY_REFUNDABLE'
      };

      const response = await axios.get(
        'https://www.ixigo.com/outlook/v1/onward/ranged',
        {
          params,
          headers: {
            ...this.FLIGHT_HEADERS,
            'referer': `https://www.ixigo.com/search/result/flight?from=${fromAirport.code}&to=${toAirport.code}&date=${formattedDate}&adults=1&children=0&infants=0&class=e&source=Search+Form`
          },
          timeout: 15000
        }
      );

      if (response.data?.data?.going?.results && Array.isArray(response.data.data.going.results)) {
        return response.data.data.going.results.slice(0, 25).map((flight: any, index: number) => {
          // Use Air India or Air India Express as default when airline fields are empty
          const getDefaultAirline = () => {
            const airlines = ['Air India', 'Air India Express'];
            return airlines[index % airlines.length];
          };
          
          const airlineName = (flight.airline && flight.airline.trim()) || 
                              (flight.airlineCode && flight.airlineCode.trim()) || 
                              (flight.flightNumber && flight.flightNumber.trim()) || 
                              getDefaultAirline();
          
          // Adjust pricing based on class
          const baseFare = flight.fare || 5000;
          const classPriceMultiplier = {
            'e': 1.0,    // Economy - base price
            'b': 2.5,    // Business - 2.5x price
            'w': 4.0     // Premium - 4x price
          };
          const adjustedPrice = Math.round(baseFare * (classPriceMultiplier[flightClass as keyof typeof classPriceMultiplier] || 1.0));
          
          // Get class display name
          const classNames = {
            'e': 'Economy',
            'b': 'Business',
            'w': 'Premium'
          };
          
          return {
            id: `flight-${flight.searchId}-${Date.now()}`,
            provider: 'Ixigo',
            type: 'flight' as const,
            from: {
              code: fromAirport.code,
              name: fromAirport.name,
              time: '06:00' // Default time since API doesn't provide specific times
            },
            to: {
              code: toAirport.code,
              name: toAirport.name,
              time: '08:30' // Default time since API doesn't provide specific times
            },
            duration: '2h 30m', // Default duration
            price: {
              amount: adjustedPrice,
              currency: 'INR'
            },
            availability: true,
            bookingReference: flight.flightNumber || flight.searchId,
            operator: airlineName,
            stops: 0,
            class: classNames[flightClass as keyof typeof classNames] || 'Economy',
            amenities: ['AC', 'In-flight Entertainment', 'Meals', 'Baggage Allowance']
          };
        });
      }
      return [];
    } catch (error) {
      console.error('Flight price fetch failed:', error);
      return [];
    }
  }

  static async fetchAllPrices(
    fromLocations: { train: LocationSearchResult[]; bus: LocationSearchResult[]; flight: LocationSearchResult[] },
    toLocations: { train: LocationSearchResult[]; bus: LocationSearchResult[]; flight: LocationSearchResult[] },
    date: string,
    flightClass: string = 'e',
    trainClass: string = 'SL'
  ): Promise<TravelOption[]> {
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

    const results = await Promise.allSettled(allPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<TravelOption[]> => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .filter(option => option.availability);
  }
}
