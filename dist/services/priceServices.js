import { ApiClient } from './apiClient.js';
import { format, parse } from 'date-fns';
export class PriceServices {
    static async fetchTrainPrices(fromStation, toStation, date, trainClass = 'SL') {
        const rapidApiKey = process.env.RAPIDAPI_KEY;
        const indianRailwaysHost = process.env.INDIAN_RAILWAYS_API_HOST;
        console.log('[Train API] Fetching trains:', { from: fromStation.code, to: toStation.code, date, trainClass, hasApiKey: !!rapidApiKey, hasHost: !!indianRailwaysHost });
        if (!rapidApiKey || !indianRailwaysHost) {
            console.warn('[Train API] RapidAPI credentials not configured for trains');
            return [];
        }
        try {
            const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyyMMdd');
            console.log('[Train API] Request params:', { fromStationCode: fromStation.code, toStationCode: toStation.code, dateOfJourney: formattedDate });
            const response = await ApiClient.get(`https://${indianRailwaysHost}/api/v2/TrainBetweenStations`, {
                fromStationCode: fromStation.code,
                toStationCode: toStation.code,
                dateOfJourney: formattedDate
            }, {
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': indianRailwaysHost
            }, true // use cache
            );
            console.log('[Train API] Response:', { success: response.success, hasData: !!response.data, error: response.error });
            if (response.success && response.data) {
                const parsed = this.parseTrainResponse(response.data, fromStation, toStation, trainClass, date);
                console.log('[Train API] Parsed', parsed.length, 'trains');
                return parsed;
            }
        }
        catch (error) {
            console.error('[Train API] Fetch failed:', error);
        }
        console.log('[Train API] Returning empty array');
        return [];
    }
    static parseTrainResponse(data, fromStation, toStation, trainClass, date) {
        const getTrainAmenities = (cls) => {
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
        return trains.slice(0, 10).map((train) => {
            const basePrice = train.price || 800;
            const adjustedPrice = Math.round(basePrice * (classPriceMultiplier[trainClass] || 1.0));
            // Generate IRCTC booking URL
            const bookingUrl = `https://www.irctc.co.in/nget/train-search?from=${fromStation.code}&to=${toStation.code}&date=${date}&class=${trainClass}`;
            return {
                id: `train-${train.trainNumber || train.train_no}-${Date.now()}`,
                provider: 'IRCTC',
                type: 'train',
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
    static async fetchBusPrices(fromStation, toStation, date) {
        const redBusApiKey = process.env.REDBUS_API_KEY;
        console.log('[Bus API] Fetching buses:', { from: fromStation.code, to: toStation.code, date, hasApiKey: !!redBusApiKey });
        if (!redBusApiKey) {
            console.warn('[Bus API] RedBus API key not configured for buses');
            return [];
        }
        try {
            const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyyMMdd');
            console.log('[Bus API] Request params:', { source: fromStation.code, destination: toStation.code, dateOfJourney: formattedDate });
            const response = await ApiClient.post('https://api.redbus.in/search', {
                source: fromStation.code,
                destination: toStation.code,
                dateOfJourney: formattedDate
            }, {
                'Authorization': `Bearer ${redBusApiKey}`
            }, true // use cache
            );
            console.log('[Bus API] Response:', { success: response.success, hasData: !!response.data, error: response.error });
            if (response.success && response.data) {
                const parsed = this.parseBusResponse(response.data, fromStation, toStation, date);
                console.log('[Bus API] Parsed', parsed.length, 'buses');
                return parsed;
            }
        }
        catch (error) {
            console.error('[Bus API] Fetch failed:', error);
        }
        console.log('[Bus API] Returning empty array');
        return [];
    }
    static parseBusResponse(data, fromStation, toStation, date) {
        const amenities = ['AC', 'WiFi', 'Charging Points', 'Water Bottle', 'Blanket', 'Recliner Seats'];
        const buses = data.buses || data.data || [];
        return buses.slice(0, 15).map((bus) => {
            // Generate RedBus booking URL
            const bookingUrl = `https://www.redbus.in/bus-ticket-booking?from=${fromStation.code}&to=${toStation.code}&onward=${date}`;
            return {
                id: `bus-${bus.id || bus.busId}-${Date.now()}`,
                provider: 'RedBus',
                type: 'bus',
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
    static async fetchFlightPrices(fromAirport, toAirport, date, flightClass = 'e') {
        const aviationStackKey = process.env.AVIATION_STACK_API_KEY;
        console.log('[Flight API] Fetching flights:', { from: fromAirport.code, to: toAirport.code, date, flightClass, hasApiKey: !!aviationStackKey });
        if (!aviationStackKey) {
            console.warn('[Flight API] Aviation Stack API key not configured for flights');
            return [];
        }
        try {
            const formattedDate = format(parse(date, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');
            console.log('[Flight API] Request params:', { access_key: '***', dep_iata: fromAirport.code, arr_iata: toAirport.code, flight_date: formattedDate });
            const response = await ApiClient.get('http://api.aviationstack.com/v1/flights', {
                access_key: aviationStackKey,
                dep_iata: fromAirport.code,
                arr_iata: toAirport.code,
                flight_date: formattedDate
            }, {}, true // use cache
            );
            console.log('[Flight API] Response:', { success: response.success, hasData: !!response.data, error: response.error });
            if (response.success && response.data) {
                const parsed = this.parseFlightResponse(response.data, fromAirport, toAirport, flightClass, date);
                console.log('[Flight API] Parsed', parsed.length, 'flights');
                return parsed;
            }
        }
        catch (error) {
            console.error('[Flight API] Fetch failed:', error);
        }
        console.log('[Flight API] Returning empty array');
        return [];
    }
    static parseFlightResponse(data, fromAirport, toAirport, flightClass, date) {
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
        return flights.slice(0, 15).map((flight) => {
            const baseFare = flight.price?.amount || flight.price || 5000;
            const adjustedPrice = Math.round(baseFare * (classPriceMultiplier[flightClass] || 1.0));
            // Generate airline booking URL based on airline
            const airlineName = flight.airline?.name || flight.airlineName || '';
            const bookingUrl = this.generateFlightBookingUrl(airlineName, fromAirport.code, toAirport.code, date);
            return {
                id: `flight-${flight.flight?.iata || flight.flightNumber}-${Date.now()}`,
                provider: 'Aviation Stack',
                type: 'flight',
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
                class: classNames[flightClass] || 'Economy',
                amenities: ['AC', 'In-flight Entertainment', 'Meals', 'Baggage Allowance'],
                bookingUrl
            };
        });
    }
    static generateFlightBookingUrl(airline, from, to, date) {
        const airlineLower = airline.toLowerCase();
        // Map airlines to their booking URLs
        if (airlineLower.includes('air india')) {
            return `https://www.airindia.com/in/flights?from=${from}&to=${to}&date=${date}`;
        }
        else if (airlineLower.includes('indigo')) {
            return `https://www.goindigo.in/?from=${from}&to=${to}&date=${date}`;
        }
        else if (airlineLower.includes('spicejet')) {
            return `https://www.spicejet.com/?from=${from}&to=${to}&date=${date}`;
        }
        else if (airlineLower.includes('vistara')) {
            return `https://www.airvistara.com/?from=${from}&to=${to}&date=${date}`;
        }
        else if (airlineLower.includes('goair')) {
            return `https://www.goair.in/?from=${from}&to=${to}&date=${date}`;
        }
        // Default to a generic flight search
        return `https://www.google.com/travel/flights?q=flights%20from%20${from}%20to%20${to}%20on%20${date}`;
    }
    static async fetchAllPrices(fromLocations, toLocations, date, flightClass = 'e', trainClass = 'SL') {
        // Run all API requests in parallel for optimal speed
        const allPromises = [];
        if (fromLocations.train.length > 0 && toLocations.train.length > 0) {
            allPromises.push(this.fetchTrainPrices(fromLocations.train[0], toLocations.train[0], date, trainClass));
        }
        if (fromLocations.bus.length > 0 && toLocations.bus.length > 0) {
            allPromises.push(this.fetchBusPrices(fromLocations.bus[0], toLocations.bus[0], date));
        }
        if (fromLocations.flight.length > 0 && toLocations.flight.length > 0) {
            allPromises.push(this.fetchFlightPrices(fromLocations.flight[0], toLocations.flight[0], date, flightClass));
        }
        // Use Promise.allSettled to ensure all requests complete even if some fail
        const results = await Promise.allSettled(allPromises);
        // Return all successful results, filter by availability
        return results
            .filter((result) => result.status === 'fulfilled')
            .flatMap(result => result.value)
            .filter(option => option.availability);
    }
}
