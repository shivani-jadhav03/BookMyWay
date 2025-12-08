class Dashboard {
    constructor() {
        this.summary = null;
        this.init();
    }

    init() {
        this.ensureAdmin().then((allowed) => {
            if (allowed) {
                this.loadSummary();
            }
        });
        const refreshButton = document.getElementById('refreshDashboard');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.loadSummary());
        }
    }

    async ensureAdmin() {
        try {
            const response = await fetch('/api/auth/profile');
            if (!response.ok) throw new Error('Not authorized');
            const result = await response.json();
            const role = result?.profile?.role || 'user';
            if (role !== 'admin') {
                alert('Admin access required to view this dashboard.');
                window.location.href = 'index.html';
                return false;
            }
            return true;
        } catch (error) {
            alert('Please login as admin to access the dashboard.');
            window.location.href = 'login.html';
            return false;
        }
    }

    async loadSummary() {
        this.showLoadingStates();
        try {
            const response = await fetch('/api/analytics/summary');
            if (!response.ok) {
                throw new Error('Failed to fetch analytics summary');
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Unable to load dashboard');
            }
            this.summary = result.data;
            this.renderSummary();
            this.renderTables();
        } catch (error) {
            this.showErrorState(error.message);
        }
    }

    renderSummary() {
        const { counts, uniqueUsers, lastUpdated } = this.summary;
        document.getElementById('signupCount').textContent = counts.signups;
        document.getElementById('loginCount').textContent = counts.logins;
        document.getElementById('bookingCount').textContent = counts.bookings;
        document.getElementById('uniqueUsers').textContent = uniqueUsers;
        document.getElementById('lastUpdated').textContent = `Updated ${this.timeAgo(lastUpdated)}`;
    }

    renderTables() {
        const { recent } = this.summary;
        this.renderTable('signupTable', recent.signups, 'signup');
        this.renderTable('loginTable', recent.logins, 'login');
        this.renderTable('bookingTable', recent.bookings, 'booking');
    }

    renderTable(containerId, events, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!events || events.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-circle-notch"></i> No ${type} events yet</div>`;
            return;
        }

        const rows = events.map(event => {
            const meta = event.metadata || {};
            const detail = this.formatDetails(type, meta);
            return `
                <tr>
                    <td style="width: 32px;"><span class="badge ${type}">${type}</span></td>
                    <td>${event.userName || 'Unknown'}<br><small style="color:#94a3b8;">${event.userEmail || 'No email'}</small></td>
                    <td>${detail}</td>
                    <td>${new Date(event.timestamp).toLocaleString()}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 70px;">Type</th>
                            <th>User</th>
                            <th>Details</th>
                            <th>When</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    formatDetails(type, meta) {
        if (type === 'booking') {
            const route = meta.from && meta.to ? `${meta.from} → ${meta.to}` : 'Route unknown';
            const provider = meta.provider || 'Partner';
            const transport = meta.transport ? meta.transport.toUpperCase() : 'N/A';
            return `${route}<br><small style="color:#94a3b8;">${provider} • ${transport}</small>`;
        }
        if (type === 'login') {
            return 'Session started';
        }
        if (type === 'signup') {
            return 'New account created';
        }
        return '';
    }

    showLoadingStates() {
        ['signupTable', 'loginTable', 'bookingTable'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
            }
        });
    }

    showErrorState(message) {
        ['signupTable', 'loginTable', 'bookingTable'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = `<div class="empty-state" style="color:#f87171;"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
            }
        });
    }

    timeAgo(timestamp) {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
