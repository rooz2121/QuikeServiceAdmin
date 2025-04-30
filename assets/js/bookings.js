// Quike Admin Panel - Bookings JavaScript

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the bookings page
    if (window.location.pathname.includes('bookings.html')) {
        // Load bookings data
        loadBookings(1, {});
    }
});

async function loadBookings(page = 1, filters = {}) {
    try {
        console.log('Loading bookings data...', filters);
        
        document.querySelector('#bookings-table tbody').innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="spinner-border" role="status"></div>
                    <p>Loading bookings data...</p>
                </td>
            </tr>
        `;
        
        // Default filters
        const limit = 10;
        const offset = (page - 1) * limit;
        
        // Start the query
        let query = supabaseClient
            .from('bookings')
            .select('*, worker:worker_id(name, service_category)', { count: 'exact' });
        
        // Apply filters
        if (filters.service) {
            query = query.eq('service_category', filters.service);
        }
        
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            query = query.gte('booking_date', fromDate.toISOString());
        }
        
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            query = query.lte('booking_date', toDate.toISOString());
        }
        
        // Paginate the query
        query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
        
        // Execute the query
        const { data: bookings, error, count } = await query;
        
        if (error) throw error;
        
        // Update UI with the fetched data
        await updateBookingsTable(bookings, count, page, limit);
        updateBookingsPagination(count, page, limit);
        
        // Add event listeners for form
        const bookingFilterForm = document.getElementById('booking-filter-form');
        if (bookingFilterForm) {
            bookingFilterForm.addEventListener('submit', function(e) {
                e.preventDefault();
                loadBookings(1, getBookingFilters());
            });
            
            // Reset filter button
            document.getElementById('reset-booking-filter')?.addEventListener('click', function() {
                document.getElementById('filter-booking-service').value = '';
                document.getElementById('filter-booking-status').value = '';
                document.getElementById('filter-booking-date-from').value = '';
                document.getElementById('filter-booking-date-to').value = '';
                loadBookings(1, {});
            });
        }
        
        // Export bookings button
        document.getElementById('export-bookings')?.addEventListener('click', function() {
            exportBookingsData();
        });
        
        console.log('Bookings loaded successfully:', bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.querySelector('#bookings-table tbody').innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading bookings: ${error.message || 'Unknown error'}
                </td>
            </tr>
        `;
    }
}

async function updateBookingsTable(bookings, count, page, limit) {
    const tableBody = document.querySelector('#bookings-table tbody');
    
    if (!bookings || bookings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <i class="fas fa-calendar-times me-2"></i>
                    No bookings found matching your criteria
                </td>
            </tr>
        `;
        return;
    }
    
    // Collect all unique user IDs from the bookings
    const userIds = [...new Set(bookings.map(booking => booking.user_id))];
    
    // Fetch user data for all users in one request
    const { data: users, error: userError } = await supabaseClient
        .from('user')
        .select('id, name, email')
        .in('id', userIds);
        
    if (userError) {
        console.warn('Error fetching user data:', userError);
    }
    
    // Create a map of user IDs to user data for easy lookup
    const userMap = {};
    if (users) {
        users.forEach(user => {
            userMap[user.id] = user;
        });
    }
    
    let html = '';
    bookings.forEach(booking => {
        const user = userMap[booking.user_id] || null;
        const userName = user ? user.name : (booking.user_id?.substring(0, 8) + '...' || 'Unknown');
        const workerName = booking.worker?.name || 'Unassigned';
        const service = booking.service_category + (booking.service_subcategory ? ` - ${booking.service_subcategory}` : '');
        
        html += `
            <tr>
                <td>${booking.id.substring(0, 8)}...</td>
                <td>${userName}</td>
                <td>${workerName}</td>
                <td>${service}</td>
                <td>${formatDate(booking.booking_date)}</td>
                <td>
                    <span class="badge bg-${getStatusColor(booking.status)}">
                        ${booking.status || 'Unknown'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary view-booking" data-booking-id="${booking.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Update the showing count text
    document.getElementById('showing-bookings-start').textContent = (page - 1) * limit + 1;
    document.getElementById('showing-bookings-end').textContent = Math.min(page * limit, count);
    document.getElementById('total-bookings-count').textContent = count;
    
    // Add event listeners
    addBookingTableEventListeners();
}

function updateBookingsPagination(count, currentPage, limit) {
    const pagination = document.getElementById('bookings-pagination');
    const totalPages = Math.ceil(count / limit);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    // Page numbers
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    pagination.innerHTML = html;
    
    // Add event listeners to pagination links
    document.querySelectorAll('#bookings-pagination .page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (!isNaN(page)) {
                loadBookings(page, getBookingFilters());
            }
        });
    });
}

function getBookingFilters() {
    // Get filter values from form
    const service = document.getElementById('filter-booking-service')?.value || '';
    const status = document.getElementById('filter-booking-status')?.value || '';
    const dateFrom = document.getElementById('filter-booking-date-from')?.value || '';
    const dateTo = document.getElementById('filter-booking-date-to')?.value || '';
    
    return {
        service,
        status,
        dateFrom,
        dateTo
    };
}

function addBookingTableEventListeners() {
    // View booking details
    document.querySelectorAll('.view-booking').forEach(button => {
        // Remove all existing click listeners using the cloneNode technique
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add the click listener to the new button
        newButton.addEventListener('click', function() {
            const bookingId = this.getAttribute('data-booking-id');
            console.log('View booking clicked for ID:', bookingId);
            viewBookingDetails(bookingId);
        });
    });
}

async function viewBookingDetails(bookingId) {
    try {
        console.log('Viewing booking details:', bookingId);
        
        // Fetch booking details including all fields
        const { data: booking, error } = await supabaseClient
            .from('bookings')
            .select('*, worker:worker_id(name, email, phone_no, service_category, experience)')
            .eq('id', bookingId)
            .single();
            
        if (error) throw error;
        
        if (!booking) {
            alert('Booking not found');
            return;
        }
        
        // Now separately fetch the user data from the public.user table
        const { data: userData, error: userError } = await supabaseClient
            .from('user')
            .select('name, email, phone_no')
            .eq('id', booking.user_id)
            .single();
            
        if (userError) {
            console.warn('Error fetching user data:', userError);
            // Continue with limited user info
        }
        
        // Check if modal exists in the DOM, if not, create it
        let modalEl = document.getElementById('bookingDetailModal');
        if (!modalEl) {
            // Create the modal element
            const modalHTML = `
                <div class="modal fade" id="bookingDetailModal" tabindex="-1" aria-labelledby="bookingDetailModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-lg modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="bookingDetailModalLabel">
                                    <i class="fas fa-calendar-check me-2"></i>Booking Details
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-4">
                                    <div class="col-md-12">
                                        <div class="booking-id-section text-center mb-3">
                                            <span class="badge bg-secondary p-2 px-3 mb-2">Booking ID</span>
                                            <p id="booking-modal-id" class="mb-0 fw-bold fs-5"></p>
                                        </div>
                                        
                                        <!-- Status Progress Bar -->
                                        <div class="booking-progress card shadow-sm p-3 mb-4 bg-light border-0 rounded">
                                            <div class="d-flex justify-content-between position-relative mb-1">
                                                <div class="progress-step" id="step-pending">
                                                    <div class="progress-step-circle shadow-sm">1</div>
                                                    <div class="progress-step-label">Pending</div>
                                                </div>
                                                <div class="progress-step" id="step-confirmed">
                                                    <div class="progress-step-circle shadow-sm">2</div>
                                                    <div class="progress-step-label">Confirmed</div>
                                                </div>
                                                <div class="progress-step" id="step-in-progress">
                                                    <div class="progress-step-circle shadow-sm">3</div>
                                                    <div class="progress-step-label">In Progress</div>
                                                </div>
                                                <div class="progress-step" id="step-completed">
                                                    <div class="progress-step-circle shadow-sm">4</div>
                                                    <div class="progress-step-label">Completed</div>
                                                </div>
                                                <div class="progress-bar-container">
                                                    <div class="progress">
                                                        <div class="progress-bar" id="booking-progress-bar" role="progressbar" style="width: 0%"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div id="booking-cancelled-overlay" class="d-none">
                                                <div class="cancelled-badge bg-danger text-white py-1 px-3 rounded shadow">
                                                    BOOKING CANCELLED
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6 class="border-bottom pb-2 mb-3">Booking Information</h6>
                                        <div class="card mb-3 shadow-sm">
                                            <div class="card-body p-3">
                                                <p><strong><i class="fas fa-tag me-2 text-muted"></i>Service:</strong> <span id="booking-modal-service" class="float-end"></span></p>
                                                <p><strong><i class="fas fa-clock me-2 text-muted"></i>Date & Time:</strong> <span id="booking-modal-datetime" class="float-end"></span></p>
                                                <p><strong><i class="fas fa-hourglass-half me-2 text-muted"></i>Duration:</strong> <span id="booking-modal-duration" class="float-end"></span> hours</p>
                                                <p><strong><i class="fas fa-map-marker-alt me-2 text-muted"></i>Address:</strong> <span id="booking-modal-address" class="float-end"></span></p>
                                                <p><strong><i class="fas fa-calendar me-2 text-muted"></i>Created:</strong> <span id="booking-modal-created" class="float-end"></span></p>
                                                <p><strong><i class="fas fa-info-circle me-2 text-muted"></i>Status:</strong> <span id="booking-modal-status" class="badge float-end"></span></p>
                                            </div>
                                        </div>
                                        
                                        <h6 class="border-bottom pb-2 mb-3">Location Coordinates</h6>
                                        <div class="booking-location card mb-3 shadow-sm">
                                            <div class="card-body p-3">
                                                <p><strong><i class="fas fa-map-pin me-2 text-muted"></i>Latitude:</strong> <span id="booking-modal-lat" class="float-end"></span></p>
                                                <p class="mb-0"><strong><i class="fas fa-map-pin me-2 text-muted"></i>Longitude:</strong> <span id="booking-modal-lng" class="float-end"></span></p>
                                            </div>
                                        </div>
                                        
                                        <h6 class="border-bottom pb-2 mb-3">Description/Notes</h6>
                                        <div class="booking-notes card mb-3 shadow-sm">
                                            <div class="card-body p-3">
                                                <p id="booking-modal-notes" class="mb-0"></p>
                                            </div>
                                        </div>
                                        
                                        <div id="booking-cancellation-section" class="d-none">
                                            <h6 class="border-bottom pb-2 mb-3 text-danger">Cancellation Reason</h6>
                                            <div class="card mb-3 shadow-sm border-danger">
                                                <div class="card-body p-3">
                                                    <p id="booking-modal-cancellation" class="mb-0 text-danger"></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="col-md-6">
                                        <div class="row">
                                            <div class="col-md-12 mb-4">
                                                <h6 class="border-bottom pb-2 mb-3">User Information</h6>
                                                <div class="card mb-3 shadow-sm">
                                                    <div class="card-body p-3">
                                                        <p><strong><i class="fas fa-user me-2 text-muted"></i>Name:</strong> <span id="booking-modal-user-name" class="float-end"></span></p>
                                                        <p><strong><i class="fas fa-envelope me-2 text-muted"></i>Email:</strong> <span id="booking-modal-user-email" class="float-end"></span></p>
                                                        <p class="mb-0"><strong><i class="fas fa-phone me-2 text-muted"></i>Phone:</strong> <span id="booking-modal-user-phone" class="float-end"></span></p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-12 mb-4">
                                                <h6 class="border-bottom pb-2 mb-3">Worker Information</h6>
                                                <div class="card mb-3 shadow-sm">
                                                    <div class="card-body p-3">
                                                        <p><strong><i class="fas fa-hard-hat me-2 text-muted"></i>Name:</strong> <span id="booking-modal-worker-name" class="float-end"></span></p>
                                                        <p><strong><i class="fas fa-tools me-2 text-muted"></i>Service:</strong> <span id="booking-modal-worker-service" class="float-end"></span></p>
                                                        <p><strong><i class="fas fa-award me-2 text-muted"></i>Experience:</strong> <span id="booking-modal-worker-experience" class="float-end"></span> years</p>
                                                        <p class="mb-0"><strong><i class="fas fa-phone me-2 text-muted"></i>Phone:</strong> <span id="booking-modal-worker-phone" class="float-end"></span></p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div id="booking-rating-section" class="col-md-12 d-none">
                                                <h6 class="border-bottom pb-2 mb-3">User Rating & Review</h6>
                                                <div class="card mb-3 shadow-sm">
                                                    <div class="card-body p-3">
                                                        <div class="text-center mb-3">
                                                            <div id="booking-modal-rating-stars"></div>
                                                            <span id="booking-modal-rating-value" class="badge bg-warning text-dark mt-2"></span>
                                                        </div>
                                                        <p class="fst-italic p-2 bg-light rounded" id="booking-modal-review"></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <style>
                    .booking-progress {
                        position: relative;
                        padding: 20px 0;
                    }
                    .progress-step {
                        z-index: 1;
                        text-align: center;
                    }
                    .progress-step-circle {
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        background-color: #e9ecef;
                        color: #6c757d;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 8px;
                        font-weight: bold;
                        border: 2px solid #dee2e6;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .progress-step.active .progress-step-circle {
                        background-color: #007bff;
                        color: white;
                        border-color: #007bff;
                        transform: scale(1.1);
                    }
                    .progress-step.complete .progress-step-circle {
                        background-color: #28a745;
                        color: white;
                        border-color: #28a745;
                    }
                    .progress-step-label {
                        font-size: 12px;
                        color: #6c757d;
                        font-weight: 500;
                    }
                    .progress-step.active .progress-step-label,
                    .progress-step.complete .progress-step-label {
                        font-weight: bold;
                        color: #212529;
                    }
                    .progress-bar-container {
                        position: absolute;
                        top: 38px;
                        left: 15px;
                        right: 15px;
                        z-index: 0;
                    }
                    .progress {
                        height: 4px;
                        background-color: #e9ecef;
                    }
                    #booking-cancelled-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(255,255,255,0.9);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 2;
                    }
                    .cancelled-badge {
                        transform: rotate(-15deg);
                        font-weight: bold;
                        font-size: 1.2rem;
                        letter-spacing: 1px;
                        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
                    }
                    .rating-star {
                        color: #ffc107;
                        font-size: 1.5rem;
                        margin: 0 2px;
                    }
                    .rating-star.empty {
                        color: #e9ecef;
                    }
                    
                    #bookingDetailModal .modal-content {
                        border-radius: 0.5rem;
                        overflow: hidden;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    }
                    #bookingDetailModal .modal-header {
                        background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);
                        color: white;
                        padding: 1rem 1.5rem;
                    }
                    #bookingDetailModal .modal-body {
                        padding: 1.5rem;
                    }
                    #bookingDetailModal .booking-id-section {
                        background-color: #f8f9fa;
                        padding: 1rem;
                        border-radius: 0.5rem;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                    }
                    #bookingDetailModal p {
                        margin-bottom: 0.5rem;
                    }
                    #bookingDetailModal .booking-notes {
                        background-color: #f8f9fa;
                        border-radius: 0.375rem;
                        padding: 1rem;
                    }
                    #bookingDetailModal h6 {
                        color: #4e73df;
                        font-weight: 600;
                        margin-bottom: 1rem;
                        display: flex;
                        align-items: center;
                    }
                    #bookingDetailModal h6::before {
                        content: '';
                        display: inline-block;
                        width: 4px;
                        height: 18px;
                        background-color: #4e73df;
                        margin-right: 0.5rem;
                        border-radius: 2px;
                    }
                    #bookingDetailModal .modal-footer {
                        border-top: 1px solid rgba(0, 0, 0, 0.05);
                        padding: 1rem 1.5rem;
                    }
                    #bookingDetailModal .btn-secondary {
                        background-color: #6c757d;
                        border: none;
                        padding: 0.5rem 1.5rem;
                        border-radius: 0.375rem;
                        font-weight: 500;
                        transition: all 0.2s;
                    }
                    #bookingDetailModal .btn-secondary:hover {
                        background-color: #5a6268;
                        transform: translateY(-1px);
                    }
                    #bookingDetailModal .card {
                        border: none;
                        box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
                        border-radius: 0.5rem;
                        margin-bottom: 1.5rem;
                        transition: all 0.3s ease;
                    }
                    #bookingDetailModal .card:hover {
                        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
                        transform: translateY(-2px);
                    }
                    #bookingDetailModal .card-body {
                        padding: 1.25rem;
                    }
                </style>
            `;
            
            // Append the modal to the body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modalEl = document.getElementById('bookingDetailModal');
        }
        
        // Define helper functions for setting element values
        const setElementText = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || 'N/A';
            } else {
                console.warn(`Element with ID ${id} not found`);
            }
        };
        
        const setElementClass = (id, className) => {
            const element = document.getElementById(id);
            if (element) {
                element.className = className;
            } else {
                console.warn(`Element with ID ${id} not found`);
            }
        };
        
        // Set booking information
        setElementText('booking-modal-id', booking.id);
        setElementText('booking-modal-service', `${booking.service_category}${booking.service_subcategory ? ' - ' + booking.service_subcategory : ''}`);
        
        // Format date and time properly
        const bookingDate = new Date(booking.booking_date);
        let timeDisplay = booking.booking_time || 'N/A';
        if (booking.booking_time) {
            // Convert time string to readable format if present
            try {
                const [hours, minutes] = booking.booking_time.split(':');
                const time = new Date();
                time.setHours(parseInt(hours, 10));
                time.setMinutes(parseInt(minutes, 10));
                timeDisplay = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {
                console.warn('Error formatting time:', e);
            }
        }
        
        setElementText('booking-modal-datetime', `${formatDate(booking.booking_date)} at ${timeDisplay}`);
        setElementText('booking-modal-duration', booking.duration_hours || '1');
        
        // Set location details if available
        if (booking.location_lat && booking.location_lng) {
            setElementText('booking-modal-lat', booking.location_lat);
            setElementText('booking-modal-lng', booking.location_lng);
            document.querySelector('.booking-location').classList.remove('d-none');
        } else {
            document.querySelector('.booking-location').classList.add('d-none');
        }
        
        // Add more detailed booking information
        if (booking.house_name || booking.village || booking.taluk || booking.district) {
            let fullAddress = '';
            if (booking.house_name) fullAddress += booking.house_name + ', ';
            if (booking.village) fullAddress += booking.village + ', ';
            if (booking.taluk) fullAddress += booking.taluk + ', ';
            if (booking.district) fullAddress += booking.district;
            
            setElementText('booking-modal-address', fullAddress);
        } else {
            setElementText('booking-modal-address', booking.address || 'N/A');
        }
        
        setElementText('booking-modal-created', formatDate(booking.created_at));
        setElementText('booking-modal-notes', booking.description || 'No description provided');
        
        // Show cancellation reason if booking was cancelled
        const cancellationSection = document.getElementById('booking-cancellation-section');
        if (booking.status === 'cancelled' && booking.cancellation_reason) {
            setElementText('booking-modal-cancellation', booking.cancellation_reason);
            cancellationSection.classList.remove('d-none');
        } else {
            cancellationSection.classList.add('d-none');
        }
        
        // Set status badge
        setElementText('booking-modal-status', booking.status);
        setElementClass('booking-modal-status', `badge bg-${getStatusColor(booking.status)}`);
        
        // Set user information
        if (userData) {
            setElementText('booking-modal-user-name', userData.name || 'N/A');
            setElementText('booking-modal-user-email', userData.email || 'N/A');
            setElementText('booking-modal-user-phone', userData.phone_no || 'N/A');
        } else {
            setElementText('booking-modal-user-name', `User ID: ${booking.user_id}`);
            setElementText('booking-modal-user-email', 'Email not available');
            setElementText('booking-modal-user-phone', 'Phone not available');
        }
        
        // Set worker information
        if (booking.worker) {
            setElementText('booking-modal-worker-name', booking.worker.name);
            setElementText('booking-modal-worker-service', booking.worker.service_category);
            setElementText('booking-modal-worker-experience', booking.worker.experience || '0');
            setElementText('booking-modal-worker-phone', booking.worker.phone_no);
        } else {
            setElementText('booking-modal-worker-name', 'Not Assigned');
            setElementText('booking-modal-worker-service', 'N/A');
            setElementText('booking-modal-worker-experience', 'N/A');
            setElementText('booking-modal-worker-phone', 'N/A');
        }
        
        // Handle ratings and reviews
        const ratingSection = document.getElementById('booking-rating-section');
        if (booking.rating) {
            // Display rating as stars
            const ratingStarsElement = document.getElementById('booking-modal-rating-stars');
            const ratingValueElement = document.getElementById('booking-modal-rating-value');
            
            // Clear any existing stars
            ratingStarsElement.innerHTML = '';
            
            // Add filled stars based on rating
            const rating = parseInt(booking.rating, 10);
            for (let i = 1; i <= 5; i++) {
                const star = document.createElement('i');
                star.className = `fas fa-star rating-star ${i <= rating ? '' : 'empty'}`;
                ratingStarsElement.appendChild(star);
            }
            
            // Set numerical rating in parentheses
            ratingValueElement.textContent = `${rating}/5`;
            
            // Set review text if available
            setElementText('booking-modal-review', booking.review || 'No written review provided');
            
            // Show rating section
            ratingSection.classList.remove('d-none');
        } else {
            // Hide rating section if no rating was provided
            ratingSection.classList.add('d-none');
        }
        
        // Update progress bar based on status
        updateBookingProgressBar(booking.status);
        
        // Show modal
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } catch (error) {
        console.error('Error fetching booking details:', error);
        alert('Error loading booking details. See console for details.');
    }
}

function updateBookingProgressBar(status) {
    // Reset all steps
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active', 'complete');
    });
    
    // Hide cancelled overlay by default
    const cancelledOverlay = document.getElementById('booking-cancelled-overlay');
    cancelledOverlay.classList.add('d-none');
    
    // Set progress bar width
    const progressBar = document.getElementById('booking-progress-bar');
    
    if (status === 'cancelled') {
        // Show cancelled overlay
        cancelledOverlay.classList.remove('d-none');
        progressBar.style.width = '0%';
        progressBar.classList.remove('bg-success', 'bg-primary', 'bg-warning');
        progressBar.classList.add('bg-danger');
        return;
    }
    
    let progressWidth = 0;
    const steps = ['pending', 'confirmed', 'in progress', 'completed'];
    const statusIndex = steps.indexOf(status.toLowerCase());
    
    if (statusIndex >= 0) {
        // Mark completed steps
        for (let i = 0; i <= statusIndex; i++) {
            const stepId = `step-${steps[i].replace(' ', '-')}`;
            const stepEl = document.getElementById(stepId);
            
            if (i === statusIndex) {
                stepEl.classList.add('active');
            } else {
                stepEl.classList.add('complete');
            }
        }
        
        // Set progress bar width and color
        progressWidth = (statusIndex / (steps.length - 1)) * 100;
        progressBar.style.width = `${progressWidth}%`;
        
        if (status.toLowerCase() === 'completed') {
            progressBar.classList.remove('bg-primary', 'bg-warning', 'bg-danger');
            progressBar.classList.add('bg-success');
        } else if (status.toLowerCase() === 'in progress') {
            progressBar.classList.remove('bg-success', 'bg-danger');
            progressBar.classList.add('bg-primary');
        } else {
            progressBar.classList.remove('bg-success', 'bg-danger');
            progressBar.classList.add('bg-warning');
        }
    }
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusColor(status) {
    if (!status) return 'secondary';
    
    status = status.toLowerCase();
    
    switch(status) {
        case 'completed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'cancelled':
            return 'danger';
        case 'confirmed':
            return 'primary';
        case 'in progress':
            return 'info';
        default:
            return 'secondary';
    }
}

async function exportBookingsData() {
    try {
        console.log('Exporting bookings data...');
        
        // Show loading state
        document.getElementById('export-bookings').innerHTML = '<i class="fas fa-spinner fa-spin fa-sm text-white-50 me-1"></i>Exporting...';
        document.getElementById('export-bookings').disabled = true;
        
        // Get current filters
        const filters = getBookingFilters();
        
        // Start the query
        let query = supabaseClient
            .from('bookings')
            .select('*, worker:worker_id(name, service_category)');
        
        // Apply filters
        if (filters.service) {
            query = query.eq('service_category', filters.service);
        }
        
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            query = query.gte('booking_date', fromDate.toISOString());
        }
        
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            query = query.lte('booking_date', toDate.toISOString());
        }
        
        // Order by created_at
        query = query.order('created_at', { ascending: false });
        
        // Execute the query
        const { data: bookings, error } = await query;
        
        if (error) throw error;
        
        if (!bookings || bookings.length === 0) {
            alert('No bookings found to export');
            
            // Reset button
            document.getElementById('export-bookings').innerHTML = '<i class="fas fa-download fa-sm text-white-50 me-1"></i>Export';
            document.getElementById('export-bookings').disabled = false;
            return;
        }
        
        // Collect all unique user IDs from the bookings
        const userIds = [...new Set(bookings.map(booking => booking.user_id))];
        
        // Fetch user data for all users in one request
        const { data: users, error: userError } = await supabaseClient
            .from('user')
            .select('id, name, email, phone_no')
            .in('id', userIds);
            
        if (userError) {
            console.warn('Error fetching user data for export:', userError);
        }
        
        // Create a map of user IDs to user data for easy lookup
        const userMap = {};
        if (users) {
            users.forEach(user => {
                userMap[user.id] = user;
            });
        }
        
        // Prepare data for CSV
        const csvData = [];
        
        // CSV header
        csvData.push([
            'Booking ID',
            'Service',
            'Subcategory',
            'Date & Time',
            'Status',
            'User Name',
            'User Email',
            'User Phone',
            'Worker Name',
            'Worker Service',
            'Address',
            'Notes',
            'Created At'
        ]);
        
        // Add booking data
        bookings.forEach(booking => {
            const user = userMap[booking.user_id] || null;
            const userName = user ? user.name : booking.user_id;
            const userEmail = user ? user.email : 'Email not available';
            const userPhone = user ? user.phone_no : 'Phone not available';
            
            csvData.push([
                booking.id || '',
                booking.service_category || '',
                booking.service_subcategory || '',
                formatDate(booking.booking_date) || '',
                booking.status || '',
                userName || '',
                userEmail || '',
                userPhone || '',
                booking.worker?.name || '',
                booking.worker?.service_category || '',
                booking.address || '',
                booking.notes || '',
                formatDate(booking.created_at) || ''
            ]);
        });
        
        // Convert to CSV string
        let csvContent = '';
        csvData.forEach(row => {
            csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `quike_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Reset button
        document.getElementById('export-bookings').innerHTML = '<i class="fas fa-download fa-sm text-white-50 me-1"></i>Export';
        document.getElementById('export-bookings').disabled = false;
        
        console.log('Bookings data exported successfully');
    } catch (error) {
        console.error('Error exporting bookings data:', error);
        alert('Error exporting bookings data. See console for details.');
        
        // Reset button
        document.getElementById('export-bookings').innerHTML = '<i class="fas fa-download fa-sm text-white-50 me-1"></i>Export';
        document.getElementById('export-bookings').disabled = false;
    }
} 