const API_BASE_URL = '/api';

class TravelSearchAPI {
    static async searchTravelOptions(searchParams) {
        const queryString = new URLSearchParams({
            from: searchParams.from,
            to: searchParams.to,
            date: searchParams.date,
            ...(searchParams.returnDate && { returnDate: searchParams.returnDate }),
            ...(searchParams.flightClass && { flightClass: searchParams.flightClass }),
            ...(searchParams.trainClass && { trainClass: searchParams.trainClass })
        }).toString();

        console.log('API Query String:', queryString);
        console.log('API URL:', `${API_BASE_URL}/search?${queryString}`);

        try {
            const response = await fetch(`${API_BASE_URL}/search?${queryString}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    static async getProviderStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/search/status`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Provider status check failed:', error);
            throw error;
        }
    }

    static async getHealthStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/search/health`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }
}

class UIManager {
    static showLoading(element, message = 'Searching...') {
        element.innerHTML = `
            <div class="flex items-center justify-center p-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span class="text-gray-600">${message}</span>
            </div>
        `;
    }

    static showError(element, message) {
        element.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <div class="flex items-center">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    <span>${message}</span>
                </div>
            </div>
        `;
    }

    static showNoResults(element, message = 'No travel options found for your search criteria.') {
        element.innerHTML = `
            <div class="text-center p-8 text-gray-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p class="text-lg">${message}</p>
                <p class="text-sm mt-2">Try adjusting your search criteria or check back later.</p>
            </div>
        `;
    }

    static formatPrice(amount, currency = 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    static formatTime(timeString) {
        if (!timeString || timeString === '00:00') return 'N/A';
        return timeString;
    }

    static getTransportIcon(type) {
        const icons = {
            train: 'fas fa-train',
            bus: 'fas fa-bus',
            flight: 'fas fa-plane'
        };
        return icons[type] || 'fas fa-map-marker-alt';
    }
}

class SearchFormHandler {
    constructor() {
        this.form = document.getElementById('searchForm');
        this.setupEventListeners();
        this.setMinDate();
    }

    setupEventListeners() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }

        const departureInput = document.getElementById('departure');
        const returnInput = document.getElementById('return');

        if (departureInput) {
            departureInput.addEventListener('change', () => {
                if (returnInput && departureInput.value) {
                    returnInput.min = departureInput.value;
                }
            });
        }
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        const departureInput = document.getElementById('departure');
        const returnInput = document.getElementById('return');

        if (departureInput) {
            departureInput.min = today;
            // Set today's date as default value if no value is set
            if (!departureInput.value) {
                departureInput.value = today;
            }
        }
        if (returnInput) {
            returnInput.min = today;
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(this.form);
        const searchParams = {
            from: formData.get('origin')?.trim(),
            to: formData.get('destination')?.trim(),
            date: formData.get('departure'),
            returnDate: formData.get('return') || undefined,
            transport: formData.get('transport') || 'all'
        };

        if (!this.validateSearchParams(searchParams)) {
            return;
        }

        this.showSearchProgress();

        try {
            const results = await TravelSearchAPI.searchTravelOptions(searchParams);
            this.redirectToResults(searchParams, results);
        } catch (error) {
            this.showSearchError(error.message);
        }
    }

    validateSearchParams(params) {
        if (!params.from || params.from.length < 2) {
            alert('Please enter a valid departure city (at least 2 characters)');
            return false;
        }

        if (!params.to || params.to.length < 2) {
            alert('Please enter a valid destination city (at least 2 characters)');
            return false;
        }

        if (params.from.toLowerCase() === params.to.toLowerCase()) {
            alert('Departure and destination cities cannot be the same');
            return false;
        }

        if (!params.date) {
            alert('Please select a departure date');
            return false;
        }

        const departureDate = new Date(params.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (departureDate < today) {
            alert('Departure date cannot be in the past');
            return false;
        }

        if (params.returnDate) {
            const returnDate = new Date(params.returnDate);
            if (returnDate <= departureDate) {
                alert('Return date must be after departure date');
                return false;
            }
        }

        return true;
    }

    showSearchProgress() {
        const submitButton = this.form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Searching...';
        }
    }

    showSearchError(message) {
        const submitButton = this.form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-search"></i> Search';
        }
        alert(`Search failed: ${message}`);
    }

    redirectToResults(searchParams, results) {
        const queryParams = new URLSearchParams({
            origin: searchParams.from,
            destination: searchParams.to,
            departure: searchParams.date,
            transport: searchParams.transport,
            ...(searchParams.returnDate && { return: searchParams.returnDate })
        });

        sessionStorage.setItem('searchResults', JSON.stringify(results));
        window.location.href = `results.html?${queryParams.toString()}`;
    }
}

class RouteCardHandler {
    constructor() {
        this.setupRouteCards();
    }

    setupRouteCards() {
        // Remove invalid selector - just use event delegation
        document.addEventListener('click', (event) => {
            if (event.target.matches('button') && 
                (event.target.textContent.includes('Find Trains') || 
                 event.target.textContent.includes('Find Buses') || 
                 event.target.textContent.includes('Find Flights'))) {
                
                this.handleRouteCardClick(event);
            }
        });
    }

    handleRouteCardClick(event) {
        const card = event.target.closest('.bg-white');
        if (!card) return;

        const routeTitle = card.querySelector('h2')?.textContent;
        if (!routeTitle) return;

        const [from, to] = routeTitle.split(' to ').map(city => city.trim());
        const transportType = this.getTransportTypeFromButton(event.target.textContent);
        
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const searchParams = new URLSearchParams({
            origin: from,
            destination: to,
            departure: tomorrow.toISOString().split('T')[0],
            transport: transportType
        });

        window.location.href = `results.html?${searchParams.toString()}`;
    }

    getTransportTypeFromButton(buttonText) {
        if (buttonText.includes('Trains')) return 'railway';
        if (buttonText.includes('Buses')) return 'bus';
        if (buttonText.includes('Flights')) return 'flight';
        return 'all';
    }
}

class ProviderStatusChecker {
    constructor() {
        this.checkInterval = 5 * 60 * 1000; // 5 minutes
        this.startPeriodicCheck();
    }

    async checkProviderStatus() {
        try {
            const status = await TravelSearchAPI.getProviderStatus();
            this.updateStatusIndicator(status);
        } catch (error) {
            console.error('Provider status check failed:', error);
        }
    }

    updateStatusIndicator(statusData) {
        const indicator = document.getElementById('provider-status');
        if (!indicator) return;

        const activeProviders = statusData.data.providers.filter(p => p.success).length;
        const totalProviders = statusData.data.providers.length;

        indicator.innerHTML = `
            <div class="flex items-center text-sm">
                <div class="w-2 h-2 rounded-full mr-2 ${activeProviders > 0 ? 'bg-green-500' : 'bg-red-500'}"></div>
                <span>${activeProviders}/${totalProviders} providers active</span>
            </div>
        `;
    }

    startPeriodicCheck() {
        this.checkProviderStatus();
        setInterval(() => this.checkProviderStatus(), this.checkInterval);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SearchFormHandler();
    new RouteCardHandler();
    new ProviderStatusChecker();

    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === 'results.html') {
        window.resultsPageHandler = new ResultsPageHandler();
    }
});

window.TravelSearchAPI = TravelSearchAPI;
window.UIManager = UIManager;

// Ensure homepage refreshes when returning via browser back/forward (BFCache restore)
(function() {
    function shouldReloadOnPageshow(event) {
        try {
            const nav = performance.getEntriesByType('navigation')[0];
            const isBackForward = nav && nav.type === 'back_forward';
            return event.persisted || isBackForward;
        } catch (_) {
            return !!event.persisted;
        }
    }

    window.addEventListener('pageshow', function(event) {
        const page = window.location.pathname.split('/').pop() || 'index.html';
        const isHome = page === '' || page === 'index.html';
        if (isHome && shouldReloadOnPageshow(event)) {
            if (!sessionStorage.getItem('homeReloadedOnce')) {
                sessionStorage.setItem('homeReloadedOnce', '1');
                window.location.reload();
            } else {
                sessionStorage.removeItem('homeReloadedOnce');
            }
        }
    });
})();
