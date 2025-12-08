import axios from 'axios';
import type { LocationSearchResult } from '../types/index.js';

export class LocationResolver {
  private static readonly TRAIN_HEADERS = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'apikey': 'ixiweb!2$',
    'clientid': 'ixiweb',
    'content-type': 'application/json; charset=UTF-8',
    'deviceid': '47bdbb2ea78a4c25a399',
    'ixisrc': 'ixiweb',
    'referer': 'https://www.ixigo.com/trains',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'uuid': '47bdbb2ea78a4c25a399'
  };

  private static readonly BUS_HEADERS = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'origin': 'https://www.goibibo.com',
    'referer': 'https://www.goibibo.com/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
  };

  private static readonly FLIGHT_HEADERS = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'apikey': 'ixiweb!2$',
    'appversion': '2',
    'clientid': 'ixiweb',
    'content-type': 'application/json; charset=UTF-8',
    'deviceid': '47bdbb2ea78a4c25a399',
    'ixisrc': 'ixiweb',
    'referer': 'https://www.ixigo.com/flights',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'uuid': '47bdbb2ea78a4c25a399',
    'x-request-webappversion': '2.8.1'
  };

  static async resolveTrainStations(cityName: string): Promise<LocationSearchResult[]> {
    try {
      const response = await axios.get('https://www.ixigo.com/action/content/trainstation', {
        params: {
          searchFor: 'trainstationsLatLon',
          anchor: 'false',
          value: cityName.toLowerCase()
        },
        headers: this.TRAIN_HEADERS,
        timeout: 10000
      });

      if (Array.isArray(response.data)) {
        return response.data.map((station: any) => {
          const stationName = station.e || station.name;
          // Extract actual station code from name like "Pune Jn (PUNE)" -> "PUNE"
          const codeMatch = stationName.match(/\(([^)]+)\)$/);
          const actualCode = codeMatch ? codeMatch[1] : (station.a || station.code);
          
          return {
            code: actualCode,
            name: stationName,
            city: cityName,
            state: '',
            country: 'India'
          };
        });
      }
      return [];
    } catch (error) {
      console.error('Train station resolution failed:', error);
      return [];
    }
  }

  static async resolveBusStations(cityName: string): Promise<LocationSearchResult[]> {
    try {
      const response = await axios.get('https://ground-auto-suggest.goibibo.com/api/v1/bus/giautosuggest/search', {
        params: {
          version: 'v2',
          new: '1',
          query: cityName.toLowerCase(),
        },
        headers: this.BUS_HEADERS,
        timeout: 10000
      });

      if (response.data?.data?.documents && Array.isArray(response.data.data.documents)) {
        const stations = response.data.data.documents.map((station: any) => ({
          code: station.id,
          name: station.n || station.dn.split(',')[0], // Use short name like "Sangli" instead of "Sangli, Maharashtra"
          city: station.n || station.dn.split(',')[0],
          state: station.p,
        }));

        // Hardcoded logic for Ashta - always prioritize Ashta (sangli) in Maharashtra
        if (cityName.toLowerCase() === 'ashta') {
          const ashtaSangli = stations.find(station => 
            station.name.toLowerCase().includes('sangli') && 
            station.state === 'Maharashtra'
          );
          
          if (ashtaSangli) {
            // Put Ashta (sangli) first, then other Maharashtra stations, then others
            const otherStations = stations.filter(station => station !== ashtaSangli);
            return [ashtaSangli, ...otherStations.sort((a, b) => {
              if (a.state === 'Maharashtra' && b.state !== 'Maharashtra') return -1;
              if (b.state === 'Maharashtra' && a.state !== 'Maharashtra') return 1;
              return 0;
            })];
          }
        }

        // Sort to prioritize Maharashtra locations for better regional matching
        return stations.sort((a, b) => {
          // Prioritize Maharashtra stations
          if (a.state === 'Maharashtra' && b.state !== 'Maharashtra') return -1;
          if (b.state === 'Maharashtra' && a.state !== 'Maharashtra') return 1;
          
          // Prioritize exact name matches
          const cityLower = cityName.toLowerCase();
          const aNameMatch = a.name.toLowerCase() === cityLower;
          const bNameMatch = b.name.toLowerCase() === cityLower;
          if (aNameMatch && !bNameMatch) return -1;
          if (bNameMatch && !aNameMatch) return 1;
          
          return 0;
        });
      }
      return [];
    } catch (error) {
      console.error('Bus station resolution failed:', error);
      return [];
    }
  }

  static async resolveAirports(cityName: string): Promise<LocationSearchResult[]> {
    try {
      const response = await axios.get('https://www.ixigo.com/action/content/city', {
        params: {
          searchFor: 'airportSuggestions',
          value: cityName.toLowerCase(),
          nearByAirport: 'true'
        },
        headers: this.FLIGHT_HEADERS,
        timeout: 10000
      });

      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data
          .filter((airport: any) => {
            // Only include airports that are actually in the searched city
            const airportCity = (airport.cityName || '').toLowerCase();
            const searchCity = cityName.toLowerCase();
            return airportCity === searchCity || airportCity.includes(searchCity);
          })
          .map((airport: any) => ({
            code: airport.airportCode,
            name: airport.airportName,
            city: airport.cityName || cityName,
            state: airport.stateName,
            country: airport.countryName || 'India'
          }));
      }
      return [];
    } catch (error) {
      console.error('Airport resolution failed:', error);
      return [];
    }
  }

  static async resolveAllLocations(cityName: string) {
    const [trainStations, busStations, airports] = await Promise.allSettled([
      this.resolveTrainStations(cityName),
      this.resolveBusStations(cityName),
      this.resolveAirports(cityName)
    ]);

    return {
      train: trainStations.status === 'fulfilled' ? trainStations.value : [],
      bus: busStations.status === 'fulfilled' ? busStations.value : [],
      flight: airports.status === 'fulfilled' ? airports.value : []
    };
  }
}
