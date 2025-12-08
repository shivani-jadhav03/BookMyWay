class ResultsPageHandler {
    constructor() {
        this.searchResults = null;
        this.currentSort = {
            flights: 'price-asc',
            trains: 'price-asc',
            buses: 'price-asc'
        };
        
        this.showCount = {
            flight: 9,
            train: 9,
            bus: 9
        };
        
        this.init();
    }

    async init() {
        this.updateSearchDetails();
        this.setupSortListeners();

        // Clear cache to get more results
        sessionStorage.removeItem('searchResults');
        await this.performSearch();
    }

    updateSearchDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const origin = urlParams.get('origin') || 'Unknown Origin';
        const destination = urlParams.get('destination') || 'Unknown Destination';
        const departure = urlParams.get('departure') || 'Unknown Date';
        const returnDate = urlParams.get('return') || 'One Way';
        const transportType = urlParams.get('transport') || 'all';

        document.getElementById('search-title').textContent = `${this.capitalizeWords(origin)} to ${this.capitalizeWords(destination)}`;
        document.getElementById('search-details').textContent =
            `Departure: ${this.formatDate(departure)} | Return: ${returnDate !== 'One Way' ? this.formatDate(returnDate) : returnDate} | Transport: ${this.capitalizeFirst(transportType)}`;
    }

    async performSearch() {
        const urlParams = new URLSearchParams(window.location.search);
        const flightClassSelect = document.getElementById('flight-class');
        const trainClassSelect = document.getElementById('train-class');
        const selectedFlightClass = flightClassSelect ? flightClassSelect.value : 'e';
        const selectedTrainClass = trainClassSelect ? trainClassSelect.value : 'SL';
        
        const searchParams = {
            from: urlParams.get('origin'),
            to: urlParams.get('destination'),
            date: urlParams.get('departure'),
            returnDate: urlParams.get('return') || undefined,
            flightClass: selectedFlightClass,
            trainClass: selectedTrainClass
        };

        this.showLoadingState();

        try {
            this.searchResults = await TravelSearchAPI.searchTravelOptions(searchParams);
            this.displayResults();
            sessionStorage.setItem('searchResults', JSON.stringify(this.searchResults));
        } catch (error) {
            this.showErrorState(error.message);
        }
    }

    async performSearchWithClasses() {
        const urlParams = new URLSearchParams(window.location.search);
        const flightClassSelect = document.getElementById('flight-class');
        const trainClassSelect = document.getElementById('train-class');
        const selectedFlightClass = flightClassSelect ? flightClassSelect.value : 'e';
        const selectedTrainClass = trainClassSelect ? trainClassSelect.value : 'SL';
        
        const searchParams = {
            from: urlParams.get('origin'),
            to: urlParams.get('destination'),
            date: urlParams.get('departure'),
            returnDate: urlParams.get('return') || undefined,
            flightClass: selectedFlightClass,
            trainClass: selectedTrainClass
        };

        console.log('Performing search with classes:', { flightClass: selectedFlightClass, trainClass: selectedTrainClass });
        console.log('Search params:', searchParams);

        // Reset show counts when performing new search
        this.showCount = {
            flight: 9,
            train: 9,
            bus: 9
        };

        try {
            this.searchResults = await TravelSearchAPI.searchTravelOptions(searchParams);
            console.log('Search results:', this.searchResults);
            this.displayResults();
            sessionStorage.setItem('searchResults', JSON.stringify(this.searchResults));
        } catch (error) {
            console.error('Search error:', error);
            this.showErrorState(error.message);
        }
    }

    showLoadingState() {
        const sections = ['flights-section', 'trains-section', 'buses-section'];
        sections.forEach(sectionId => {
            const container = document.querySelector(`#${sectionId} .grid`);
            if (container) {
                UIManager.showLoading(container, 'Searching for travel options...');
            }
        });

        const comparisonBody = document.getElementById('comparison-body');
        if (comparisonBody) {
            UIManager.showLoading(comparisonBody, 'Analyzing options...');
        }
    }

    showErrorState(message) {
        const sections = ['flights-section', 'trains-section', 'buses-section'];
        sections.forEach(sectionId => {
            const container = document.querySelector(`#${sectionId} .grid`);
            if (container) {
                UIManager.showError(container, `Failed to load travel options: ${message}`);
            }
        });

        const comparisonBody = document.getElementById('comparison-body');
        if (comparisonBody) {
            UIManager.showError(comparisonBody, 'Unable to generate comparison');
        }
    }

    displayResults() {
        if (!this.searchResults || !this.searchResults.success) {
            this.showErrorState(this.searchResults?.errors?.join(', ') || 'Search failed');
            return;
        }

        const options = this.searchResults.data.options || [];
        const groupedOptions = this.groupOptionsByType(options);

        this.renderTransportSection('flight', groupedOptions.flight || []);
        this.renderTransportSection('train', groupedOptions.train || []);
        this.renderTransportSection('bus', groupedOptions.bus || []);

        this.updateComparisonTable(groupedOptions);
        this.filterSectionsByTransportType(groupedOptions);
    }

    groupOptionsByType(options) {
        return options.reduce((groups, option) => {
            const type = option.type;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(option);
            return groups;
        }, {});
    }

    renderTransportSection(type, options) {
        const container = document.getElementById(`${type}-cards`);
        if (!container) return;

        if (options.length === 0) {
            UIManager.showNoResults(container, `No ${type} options available for your route.`);
            return;
        }

        const sortedOptions = this.sortOptions(options, this.currentSort[`${type}s`]);
        container.innerHTML = '';

        // Show only the specified number of items
        const itemsToShow = Math.min(this.showCount[type], sortedOptions.length);
        const visibleOptions = sortedOptions.slice(0, itemsToShow);
        
        visibleOptions.forEach(option => {
            const card = this.createTravelCard(option);
            container.appendChild(card);
        });

        // Add "Show More" button if there are more items
        if (sortedOptions.length > this.showCount[type]) {
            const showMoreButton = this.createShowMoreButton(type, sortedOptions.length - this.showCount[type]);
            container.appendChild(showMoreButton);
        }
    }

    createTravelCard(option) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 border-l-4 border-blue-500';

        const availabilityBadge = option.availability
            ? '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Available</span>'
            : '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Not Available</span>';

        card.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <i class="${UIManager.getTransportIcon(option.type)} text-blue-600 text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">${option.operator || option.provider}</h3>
                        <p class="text-sm text-gray-500">${option.class || option.type.toUpperCase()}</p>
                    </div>
                </div>
                ${availabilityBadge}
            </div>
            
            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-center">
                        <p class="text-lg font-bold text-gray-800">${UIManager.formatTime(option.from.time)}</p>
                        <p class="text-sm text-gray-500">${option.from.name}</p>
                    </div>
                    <div class="flex-1 mx-4">
                        <div class="flex items-center">
                            <div class="flex-1 h-px bg-gray-300"></div>
                            <div class="mx-2 text-xs text-gray-500">${option.duration}</div>
                            <div class="flex-1 h-px bg-gray-300"></div>
                        </div>
                        ${option.stops !== undefined ? `<p class="text-center text-xs text-gray-400 mt-1">${option.stops} stops</p>` : ''}
                    </div>
                    <div class="text-center">
                        <p class="text-lg font-bold text-gray-800">${UIManager.formatTime(option.to.time)}</p>
                        <p class="text-sm text-gray-500">${option.to.name}</p>
                    </div>
                </div>
            </div>

            ${option.amenities && option.amenities.length > 0 ? `
            <div class="mt-4 pt-3 border-t border-gray-100">
                <p class="text-sm font-medium text-gray-600 mb-2">Amenities:</p>
                <div class="flex flex-wrap gap-1">
                    ${option.amenities.map(amenity => `
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                            <i class="fas fa-check-circle mr-1 text-blue-500"></i>
                            ${amenity}
                        </span>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                    <p class="text-2xl font-bold text-blue-600">${UIManager.formatPrice(option.price.amount)}</p>
                </div>
                <button 
                    class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-300 ${!option.availability ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${!option.availability ? 'disabled' : ''}
                    onclick="handleBooking('${option.id}')"
                >
                    ${option.availability ? 'Book Now' : 'Not Available'}
                </button>
            </div>
        `;

        return card;
    }

    createShowMoreButton(type, remainingCount) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'col-span-full flex justify-center mt-6';
        
        const button = document.createElement('button');
        button.className = 'px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-300 flex items-center gap-2';
        button.innerHTML = `
            <i class="fas fa-chevron-down"></i>
            Show ${remainingCount} More ${type.charAt(0).toUpperCase() + type.slice(1)}${remainingCount > 1 ? 's' : ''}
        `;
        
        button.addEventListener('click', () => {
            this.showCount[type] += 9; // Show 9 more items
            if (this.searchResults) {
                const groupedOptions = this.groupOptionsByType(this.searchResults.data.options || []);
                this.renderTransportSection(type, groupedOptions[type] || []);
            }
        });
        
        buttonContainer.appendChild(button);
        return buttonContainer;
    }

    updateComparisonTable(groupedOptions) {
        const tableBody = document.getElementById('comparison-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        const transportTypes = ['flight', 'train', 'bus'];
        let bestOverallPrice = Infinity;
        let bestOverallType = null;

        const comparisonData = transportTypes.map(type => {
            const options = groupedOptions[type] || [];
            if (options.length === 0) return null;

            const fastest = options.reduce((prev, current) =>
                this.parseDuration(prev.duration) < this.parseDuration(current.duration) ? prev : current
            );
            const cheapest = options.reduce((prev, current) =>
                prev.price.amount < current.price.amount ? prev : current
            );
            const avgPrice = options.reduce((sum, option) => sum + option.price.amount, 0) / options.length;

            if (cheapest.price.amount < bestOverallPrice) {
                bestOverallPrice = cheapest.price.amount;
                bestOverallType = type;
            }

            return { type, fastest, cheapest, avgPrice, options };
        }).filter(Boolean);

        comparisonData.forEach(data => {
            const isBest = data.type === bestOverallType;
            const row = document.createElement('tr');
            row.className = `${isBest ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`;

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <i class="${UIManager.getTransportIcon(data.type)} mr-2 text-gray-600"></i>
                        <span class="font-medium text-gray-900">${this.capitalizeFirst(data.type)}s</span>
                        ${isBest ? '<i class="fas fa-crown ml-2 text-yellow-500" title="Best Value"></i>' : ''}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    ${data.fastest.operator || data.fastest.provider}<br>
                    <span class="text-gray-500">${data.fastest.duration}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    ${data.cheapest.operator || data.cheapest.provider}<br>
                    <span class="text-blue-600 font-semibold">${UIManager.formatPrice(data.cheapest.price.amount)}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    ${UIManager.formatPrice(Math.round(data.avgPrice))}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    ${data.fastest.duration}
                </td>
            `;

            tableBody.appendChild(row);
        });

        if (comparisonData.length === 0) {
            UIManager.showNoResults(tableBody, 'No travel options available for comparison.');
        }
    }

    setupSortListeners() {
        ['flight', 'train', 'bus'].forEach(type => {
            const sortSelect = document.getElementById(`${type}-sort`);
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.currentSort[`${type}s`] = e.target.value;
                    if (this.searchResults) {
                        const groupedOptions = this.groupOptionsByType(this.searchResults.data.options || []);
                        this.renderTransportSection(type, groupedOptions[type] || []);
                    }
                });
            }
        });

        // Add flight class listener
        const flightClassSelect = document.getElementById('flight-class');
        if (flightClassSelect) {
            flightClassSelect.addEventListener('change', async (e) => {
                const selectedClass = e.target.value;
                console.log('Flight class changed to:', selectedClass);
                
                // Show loading state
                const flightContainer = document.getElementById('flight-cards');
                if (flightContainer) {
                    flightContainer.innerHTML = '<div class="col-span-full text-center py-8"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p class="mt-4 text-gray-600">Updating flight prices...</p></div>';
                }
                
                // Perform new search with selected class
                await this.performSearchWithClasses();
            });
        }

        // Add train class listener
        const trainClassSelect = document.getElementById('train-class');
        if (trainClassSelect) {
            trainClassSelect.addEventListener('change', async (e) => {
                const selectedClass = e.target.value;
                console.log('Train class changed to:', selectedClass);
                
                // Show loading state
                const trainContainer = document.getElementById('train-cards');
                if (trainContainer) {
                    trainContainer.innerHTML = '<div class="col-span-full text-center py-8"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p class="mt-4 text-gray-600">Updating train prices...</p></div>';
                }
                
                // Perform new search with selected class
                await this.performSearchWithClasses();
            });
        }
    }

    sortOptions(options, sortType) {
        const sorted = [...options];

        switch (sortType) {
            case 'price-asc':
                return sorted.sort((a, b) => a.price.amount - b.price.amount);
            case 'price-desc':
                return sorted.sort((a, b) => b.price.amount - a.price.amount);
            case 'duration-asc':
                return sorted.sort((a, b) => this.parseDuration(a.duration) - this.parseDuration(b.duration));
            case 'departure-asc':
                return sorted.sort((a, b) => this.parseTime(a.from.time) - this.parseTime(b.from.time));
            default:
                return sorted;
        }
    }

    filterSectionsByTransportType(groupedOptions = {}) {
        const urlParams = new URLSearchParams(window.location.search);
        const transportType = urlParams.get('transport') || 'all';

        const sections = {
            'flights-section': {
                urlAllowed: transportType === 'all' || transportType === 'flight',
                hasData: (groupedOptions.flight || []).length > 0
            },
            'trains-section': {
                urlAllowed: transportType === 'all' || transportType === 'railway',
                hasData: (groupedOptions.train || []).length > 0
            },
            'buses-section': {
                urlAllowed: transportType === 'all' || transportType === 'bus',
                hasData: (groupedOptions.bus || []).length > 0
            }
        };

        Object.entries(sections).forEach(([sectionId, config]) => {
            const section = document.getElementById(sectionId);
            if (section) {
                // Show section only if URL allows it AND there's data available
                const shouldShow = config.urlAllowed && config.hasData;
                section.style.display = shouldShow ? 'block' : 'none';
            }
        });
    }

    parseDuration(duration) {
        if (!duration || duration === 'N/A') return 999999;

        const match = duration.match(/(\d+)h?\s*(\d+)?m?/i);
        if (!match) return 999999;

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        return hours * 60 + minutes;
    }

    parseTime(timeString) {
        if (!timeString || timeString === 'N/A' || timeString === '00:00') return 0;

        const [time, period] = timeString.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let hour24 = hours;
        if (period) {
            if (period.toUpperCase() === 'PM' && hours !== 12) hour24 += 12;
            if (period.toUpperCase() === 'AM' && hours === 12) hour24 = 0;
        }

        return hour24 * 60 + (minutes || 0);
    }

    formatDate(dateString) {
        if (!dateString || dateString === 'Unknown Date') return dateString;

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    capitalizeWords(str) {
        if (!str) return '';
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    async handleBooking(optionId) {
        // Check if user is logged in
        if (!authManager.isUserLoggedIn()) {
            authManager.showMessage('Please login to book tickets', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        // Find the option by ID
        const option = this.findOptionById(optionId);
        if (!option) {
            alert('Travel option not found. Please try again.');
            return;
        }

        // Get search parameters
        const urlParams = new URLSearchParams(window.location.search);
        const searchDate = urlParams.get('departure');
        
        if (!searchDate) {
            alert('Search date not found. Please try again.');
            return;
        }

        // Format date from YYYY-MM-DD to DDMMYYYY for trains/flights
        const formattedDate = this.formatDateForBooking(searchDate);
        // Format date from YYYY-MM-DD to YYYYMMDD for buses  
        const formattedDateBus = this.formatDateForBusBooking(searchDate);

        // Show booking confirmation with user info
        const currentUser = authManager.getCurrentUser();
        authManager.showMessage(`Redirecting to booking for ${currentUser.fullName}...`, 'success');

        // Log booking intent before redirecting
        try {
            await fetch('/api/analytics/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'booking',
                    userEmail: currentUser.email,
                    userName: currentUser.fullName,
                    metadata: {
                        optionId,
                        transport: option.type,
                        provider: option.operator || option.provider,
                        from: option.from.name,
                        to: option.to.name,
                        travelDate: searchDate
                    }
                })
            });
        } catch (error) {
            console.warn('Failed to record booking event', error);
        }

        // Redirect based on transport type
        switch (option.type) {
            case 'train':
                const trainUrl = `https://www.ixigo.com/search/result/train/${option.from.code}/${option.to.code}/${formattedDate}//1/0/0/0/ALL`;
                window.open(trainUrl, '_blank');
                break;
            case 'flight':
                const flightUrl = `https://www.ixigo.com/search/result/flight?from=${option.from.code}&to=${option.to.code}&date=${formattedDate}&adults=1&children=0&infants=0&class=b&source=Search+Form`;
                window.open(flightUrl, '_blank');
                break;
            case 'bus':
                const busUrl = `https://www.goibibo.com/bus/search?bid=bus-${option.from.name.toLowerCase().replace(/\s+/g, '')}-${option.to.name.toLowerCase().replace(/\s+/g, '')}-${formattedDateBus}-0-0-0-0-GICC1798-GICC1744`;
                window.open(busUrl, '_blank');
                break;
            default:
                alert('Unknown transport type. Please try again.');
        }
    }

    findOptionById(optionId) {
        if (!this.searchResults || !this.searchResults.data || !this.searchResults.data.options) {
            return null;
        }
        
        return this.searchResults.data.options.find(option => option.id === optionId);
    }

    formatDateForBooking(dateString) {
        // Convert from YYYY-MM-DD to DDMMYYYY
        const dateParts = dateString.split('-');
        if (dateParts.length !== 3) {
            return dateString;
        }
        
        const [year, month, day] = dateParts;
        return `${day}${month}${year}`;
    }

    formatDateForBusBooking(dateString) {
        // Convert from YYYY-MM-DD to YYYYMMDD
        const dateParts = dateString.split('-');
        if (dateParts.length !== 3) {
            return dateString;
        }
        
        const [year, month, day] = dateParts;
        return `${year}${month}${day}`;
    }
}

window.handleBooking = function (optionId) {
    if (window.resultsPageHandler) {
        window.resultsPageHandler.handleBooking(optionId);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResultsPageHandler;
}
