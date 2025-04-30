// Quike Admin Panel - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase client
    const supabaseUrl = 'https://xkpjlylyboakaobkqyyb.supabase.co'; 
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcGpseWx5Ym9ha2FvYmtxeXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NjE4MDgsImV4cCI6MjA2MTMzNzgwOH0.MVO7Cm0LQ140K43I1RhqVGjW7AasOq4O7RcPM3Jlqkc';
    
    // IMPORTANT: Make sure Supabase is properly imported first
    if (typeof supabase === 'undefined') {
        console.error('Supabase client not loaded! Make sure the Supabase script is included in your HTML file.');
        alert('Error: Supabase client not loaded. Check the console for details.');
        return;
    }
    
    // Create Supabase client
    const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    
    // Add debugging
    console.log('Supabase client initialized:', supabaseClient);

    // Current section tracker
    let currentSection = 'dashboard';

    // Check if user is authenticated
    checkAuth();

    // Add event listeners
    addEventListeners();

    // Load dashboard data
    loadDashboard();

    // Functions
    async function checkAuth() {
        try {
            console.log('Checking auth state...');
            
            // Get session
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            console.log('Session:', session, 'Error:', sessionError);
            
            if (sessionError || !session) {
                console.log('No active session, checking for admin in database...');
                
                // Special admin check - if this is admin user without proper auth
                const currentUrlParams = new URLSearchParams(window.location.search);
                const isAdminBypass = currentUrlParams.get('admin_bypass') === 'true';
                
                if (isAdminBypass) {
                    console.log('Using admin bypass - for development only!');
                    // Allow for development purposes only
                    return;
                }
                
                // Try to authenticate directly against database for admin
                const { data: adminData, error: adminError } = await supabaseClient
                    .from('user')
                    .select('*')
                    .eq('email', 'admin@quike.com')
                    .eq('role', 'admin')
                    .single();
                
                console.log('Admin database check:', adminData, adminError);
                
                if (adminData && !adminError) {
                    // If admin exists but no auth session, try to create one
                    console.log('Admin found in database but not in auth, try to login...');
                    
                    // Redirect to login to handle this case
                    window.location.href = 'login.html';
                    return;
                }
                
                // No admin and no session, go to login
                console.log('No authentication, redirecting to login');
                window.location.href = 'login.html';
                return;
            }
            
            // User is authenticated, check if they are admin
            const userId = session.user.id;
            console.log('User ID:', userId);
            
            // First check metadata in user object
            const userMeta = session.user.user_metadata || {};
            if (userMeta.role === 'admin') {
                console.log('User is admin by metadata');
                return; // User is admin, allow access
            }
            
            // Otherwise check database
            const { data: userData, error: userError } = await supabaseClient
                .from('user')
                .select('role')
                .eq('id', userId)
                .single();
            
            console.log('User data:', userData, 'Error:', userError);
            
            if (userError || !userData || userData.role !== 'admin') {
                console.log('User is not admin, signing out');
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
                return;
            }
            
            console.log('Authentication successful - admin user confirmed');
        } catch (error) {
            console.error('Error in authentication check:', error);
            alert('Error checking authentication. See console for details.');
            window.location.href = 'login.html';
        }
    }

    function addEventListeners() {
        // Navigation links
        document.getElementById('dashboard-link')?.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('dashboard');
            loadDashboard();
        });

        document.getElementById('workers-link')?.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('workers');
            // loadWorkers() is now called in attachWorkerSectionEventListeners
        });

        document.getElementById('users-link')?.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('users');
            loadUsers();
        });

        document.getElementById('bookings-link')?.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('bookings');
            loadBookings();
        });

        document.getElementById('verification-link')?.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('verification');
            // loadPendingVerifications() is now called in attachVerificationSectionEventListeners
        });

        document.getElementById('settings-link')?.addEventListener('click', function(e) {
            e.preventDefault();
            showSection('settings');
            loadSettings();
        });

        document.getElementById('logout-link')?.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });

        // Worker verification actions
        document.getElementById('approve-verification')?.addEventListener('click', function() {
            approveWorker();
        });

        document.getElementById('reject-verification')?.addEventListener('click', function() {
            rejectWorker();
        });
        
        // Note: Worker filter form, reset filter button, and export workers button
        // are now handled in attachWorkerSectionEventListeners() function
    }

    function showSection(section) {
        // Update active nav link
        document.querySelectorAll('#sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.getElementById(`${section}-link`).classList.add('active');

        // Update page title
        document.getElementById('page-title').textContent = capitalizeFirstLetter(section);

        // Update current section
        currentSection = section;

        // Create the section content dynamically
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '';

        // Placeholder sections - will be populated later
        switch(section) {
            case 'dashboard':
                contentArea.innerHTML = createDashboardHTML();
                break;
            case 'workers':
                contentArea.innerHTML = createWorkersHTML();
                // Attach worker-specific event listeners
                attachWorkerSectionEventListeners();
                break;
            case 'users':
                contentArea.innerHTML = createUsersHTML();
                break;
            case 'bookings':
                contentArea.innerHTML = createBookingsHTML();
                break;
            case 'verification':
                contentArea.innerHTML = createVerificationHTML();
                // Attach verification-specific event listeners
                attachVerificationSectionEventListeners();
                break;
            case 'settings':
                contentArea.innerHTML = createSettingsHTML();
                break;
        }
    }
    
    // Function to add worker section specific event listeners
    function attachWorkerSectionEventListeners() {
        // Worker filter form
        const workerFilterForm = document.getElementById('worker-filter-form');
        if (workerFilterForm) {
            // Remove any existing listeners by cloning and replacing
            const newForm = workerFilterForm.cloneNode(true);
            workerFilterForm.parentNode.replaceChild(newForm, workerFilterForm);
            
            // Add submit listener to the new form
            newForm.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('Worker filter form submitted');
                loadWorkers(1, getCurrentFilters());
            });
        }
        
        // Reset filter button
        const resetFilterBtn = document.getElementById('reset-filter');
        if (resetFilterBtn) {
            const newBtn = resetFilterBtn.cloneNode(true);
            resetFilterBtn.parentNode.replaceChild(newBtn, resetFilterBtn);
            
            newBtn.addEventListener('click', function() {
                document.getElementById('filter-service-category').value = '';
                document.getElementById('filter-verification-status').value = '';
                document.getElementById('filter-location').value = '';
                document.getElementById('filter-search').value = '';
                loadWorkers(1, {});
            });
        }
        
        // Export workers button
        const exportBtn = document.getElementById('export-workers');
        if (exportBtn) {
            const newExportBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
            
            newExportBtn.addEventListener('click', function() {
                exportWorkersData();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-workers');
        if (refreshBtn) {
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
            
            newRefreshBtn.addEventListener('click', function() {
                loadWorkers(1, getCurrentFilters());
            });
        }
        
        // Load workers when section is shown
        loadWorkers(1, {});
    }
    
    // Function to add verification section specific event listeners
    function attachVerificationSectionEventListeners() {
        // Verification filter form
        const verificationFilterForm = document.getElementById('verification-filter-form');
        if (verificationFilterForm) {
            // Remove any existing listeners by cloning and replacing
            const newForm = verificationFilterForm.cloneNode(true);
            verificationFilterForm.parentNode.replaceChild(newForm, verificationFilterForm);
            
            // Add submit listener to the new form
            newForm.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('Verification filter form submitted');
                const filters = getVerificationFilters();
                loadVerificationWorkers(1, filters);
            });
        }
        
        // Reset filter button
        const resetFilterBtn = document.getElementById('reset-verification-filter');
        if (resetFilterBtn) {
            const newBtn = resetFilterBtn.cloneNode(true);
            resetFilterBtn.parentNode.replaceChild(newBtn, resetFilterBtn);
            
            newBtn.addEventListener('click', function() {
                const serviceFilter = document.getElementById('filter-verification-service');
                const locationFilter = document.getElementById('filter-verification-location');
                const statusFilter = document.getElementById('filter-verification-status');
                
                if (serviceFilter) serviceFilter.value = '';
                if (locationFilter) locationFilter.value = '';
                if (statusFilter) statusFilter.value = 'pending';
                
                loadVerificationWorkers(1, { verification_status: 'pending' });
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-verifications');
        if (refreshBtn) {
            const newRefreshBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
            
            newRefreshBtn.addEventListener('click', function() {
                loadVerificationWorkers(1, getVerificationFilters());
            });
        }
        
        // Load verification workers when section is shown
        loadVerificationWorkers(1, { verification_status: 'pending' });
    }

    async function loadDashboard() {
        try {
            console.log('Loading dashboard data...');
            
            // Loading indicators for dashboard stats
            document.getElementById('total-users').innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
            document.getElementById('total-workers').innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
            document.getElementById('total-bookings').innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
            document.getElementById('pending-verifications').innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>';
            
            // Get all counts concurrently
            const [userCount, workerCount, bookingCount, pendingVerCount] = await Promise.all([
                getUserCount(),
                getWorkerCount(),
                getBookingCount(),
                getPendingVerificationsCount()
            ]);
            
            // Update UI with counts
            document.getElementById('total-users').textContent = userCount;
            document.getElementById('total-workers').textContent = workerCount;
            document.getElementById('total-bookings').textContent = bookingCount;
            document.getElementById('pending-verifications').textContent = pendingVerCount;
            
            // Display "Loading..." message in the tables
            document.querySelector('#recent-bookings-table tbody').innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border" role="status"></div><p>Loading recent bookings...</p></td></tr>';
            document.querySelector('#pending-verifications-table tbody').innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border" role="status"></div><p>Loading pending verifications...</p></td></tr>';
            
            // Get recent bookings and pending verifications
            const [recentBookings, pendingVerifications] = await Promise.all([
                getRecentBookings(),
                getPendingWorkerVerifications()
            ]);
            
            // Update UI with data
            populateRecentBookingsTable(recentBookings);
            populatePendingVerificationsTable(pendingVerifications);
            
            console.log('Dashboard loaded successfully');
        } catch (error) {
            console.error('Error loading dashboard:', error);
            alert('Error loading dashboard data. See console for details.');
        }
    }

    async function getUserCount() {
        try {
            const { count, error } = await supabaseClient
                .from('user')
                .select('*', { count: 'exact', head: true });
                
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting user count:', error);
            return 0;
        }
    }

    async function getWorkerCount() {
        try {
            const { count, error } = await supabaseClient
                .from('worker')
                .select('*', { count: 'exact', head: true });
                
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting worker count:', error);
            return 0;
        }
    }

    async function getBookingCount() {
        try {
            const { count, error } = await supabaseClient
                .from('bookings')
                .select('*', { count: 'exact', head: true });
                
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting booking count:', error);
            return 0;
        }
    }

    async function getPendingVerificationsCount() {
        try {
            // Count only unverified workers for the pending verification count
            const { count, error } = await supabaseClient
                .from('worker')
                .select('*', { count: 'exact', head: true })
                .eq('is_verified', false);
                
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error getting worker count:', error);
            return 0;
        }
    }

    async function getRecentBookings() {
        try {
            const { data, error } = await supabaseClient
                .from('bookings')
                .select('id, service_category, service_subcategory, status, booking_date, created_at, user_id, worker_id')
                .order('created_at', { ascending: false })
                .limit(5);
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting recent bookings:', error);
            return [];
        }
    }

    async function getPendingWorkerVerifications() {
        try {
            // Get most recent workers for the verifications table
            const { data, error } = await supabaseClient
                .from('worker')
                .select('id, name, service_category, created_at, is_verified')
                .order('created_at', { ascending: false })
                .limit(5);
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting worker verifications:', error);
            return [];
        }
    }

    // Worker verification functions
    async function approveWorker() {
        const workerId = document.getElementById('approve-verification').getAttribute('data-worker-id');
        if (!workerId) return;

        const note = document.getElementById('verification-note').value;
        
        const { error } = await supabaseClient
            .from('worker')
            .update({ 
                is_verified: true, 
                verification_date: new Date().toISOString() 
            })
            .eq('id', workerId);

        if (error) {
            alert('Error approving worker: ' + error.message);
        } else {
            // Send notification to worker
            await supabaseClient.from('worker_notifications').insert({
                worker_id: workerId,
                type: 'verification',
                message: 'Your account has been verified! You can now receive booking requests.',
                is_read: false
            });

            alert('Worker approved successfully!');
            
            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('workerVerificationModal'));
            modal.hide();
            
            if (currentSection === 'verification') {
                loadPendingVerifications();
            } else {
                loadDashboard();
            }
        }
    }

    async function rejectWorker() {
        const workerId = document.getElementById('reject-verification').getAttribute('data-worker-id');
        if (!workerId) return;

        const note = document.getElementById('verification-note').value;
        if (!note) {
            alert('Please provide a reason for rejection');
            return;
        }
        
        // We don't delete the worker, but we can add a rejection note
        const { error } = await supabaseClient
            .from('worker_notifications').insert({
                worker_id: workerId,
                type: 'verification_rejected',
                message: `Your verification was rejected. Reason: ${note}`,
                is_read: false
            });

        if (error) {
            alert('Error rejecting worker: ' + error.message);
        } else {
            alert('Worker rejected successfully!');
            
            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('workerVerificationModal'));
            modal.hide();
            
            if (currentSection === 'verification') {
                loadPendingVerifications();
            } else {
                loadDashboard();
            }
        }
    }

    async function handleLogout() {
        try {
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    // Helper functions
    function populateRecentBookingsTable(bookings) {
        const tableBody = document.querySelector('#recent-bookings-table tbody');
        
        if (!bookings || bookings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No recent bookings found</td></tr>';
            return;
        }
        
        let html = '';
        bookings.forEach(booking => {
            html += `
                <tr>
                    <td>${booking.id.substring(0, 8)}...</td>
                    <td>${booking.service_category || 'N/A'} ${booking.service_subcategory ? ` - ${booking.service_subcategory}` : ''}</td>
                    <td><span class="badge bg-${getStatusColor(booking.status)}">${booking.status || 'Unknown'}</span></td>
                    <td>${formatDate(booking.booking_date)}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    function populatePendingVerificationsTable(verifications) {
        const tableBody = document.querySelector('#pending-verifications-table tbody');
        
        if (!verifications || verifications.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No worker verifications found</td></tr>';
            return;
        }
        
        let html = '';
        verifications.forEach(worker => {
            html += `
                <tr>
                    <td>${worker.name || 'Unknown'}</td>
                    <td>${worker.service_category || 'N/A'}</td>
                    <td>
                        <span class="badge bg-${worker.is_verified ? 'success' : 'warning'}">
                            ${worker.is_verified ? 'Verified' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary view-worker" data-worker-id="${worker.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${!worker.is_verified ? `
                            <button class="btn btn-sm btn-success verify-worker" data-worker-id="${worker.id}">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-warning unverify-worker" data-worker-id="${worker.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Add event listeners to buttons using the safe approach
        // View worker buttons
        document.querySelectorAll('#pending-verifications-table .view-worker').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('View worker from verifications table clicked for ID:', workerId);
                viewWorkerDetails(workerId);
            });
        });
        
        // Verify worker buttons
        document.querySelectorAll('#pending-verifications-table .verify-worker').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('Verify worker from verifications table clicked for ID:', workerId);
                verifyWorker(workerId);
            });
        });
        
        // Unverify worker buttons
        document.querySelectorAll('#pending-verifications-table .unverify-worker').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('Unverify worker from verifications table clicked for ID:', workerId);
                unverifyWorker(workerId);
            });
        });
    }

    async function viewWorkerDetails(workerId) {
        try {
            console.log('Viewing worker details:', workerId);
            
            // Fetch worker details
            const { data: worker, error } = await supabaseClient
                .from('worker')
                .select('*')
                .eq('id', workerId)
                .single();
                
            if (error) throw error;
            
            if (!worker) {
                alert('Worker not found');
                return;
            }
            
            // Check if modal elements exist
            const modalEl = document.getElementById('workerDetailModal');
            if (!modalEl) {
                console.error('Worker detail modal not found in the DOM');
                alert('Error: Worker detail modal not found in the page. Please refresh the page and try again.');
                return;
            }
            
            // Define a helper function to safely set text content
            const setElementText = (id, value) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value || 'N/A';
                } else {
                    console.warn(`Element with ID ${id} not found`);
                }
            };
            
            // Define a helper function to safely set attributes
            const setElementAttribute = (id, attr, value) => {
                const element = document.getElementById(id);
                if (element) {
                    element.setAttribute(attr, value);
                } else {
                    console.warn(`Element with ID ${id} not found`);
                }
            };
            
            // Define a helper function to safely set class name
            const setElementClass = (id, className) => {
                const element = document.getElementById(id);
                if (element) {
                    element.className = className;
                } else {
                    console.warn(`Element with ID ${id} not found`);
                }
            };
            
            try {
                // Populate modal with worker details
                setElementText('worker-modal-name', worker.name);
                setElementText('worker-modal-service', worker.service_category);
                setElementText('worker-modal-verified', worker.is_verified ? 'Verified' : 'Pending Verification');
                setElementClass('worker-modal-verified', `badge ${worker.is_verified ? 'bg-success' : 'bg-warning'}`);
                
                setElementText('worker-modal-email', worker.email);
                setElementText('worker-modal-phone', worker.phone_no);
                setElementText('worker-modal-age', worker.age);
                setElementText('worker-modal-gender', worker.sex);
                
                setElementText('worker-modal-house', worker.house_name);
                setElementText('worker-modal-village', worker.village);
                setElementText('worker-modal-taluk', worker.taluk);
                setElementText('worker-modal-district', worker.district);
                setElementText('worker-modal-pincode', worker.pincode);
                
                setElementText('worker-modal-skills', worker.skills);
                setElementText('worker-modal-experience', worker.experience);
                setElementText('worker-modal-languages', worker.languages_known);
                
                // Show full Aadhar number for admin instead of masking it
                setElementText('worker-modal-aadhar', worker.aadhar_number || 'N/A');
                setElementText('worker-modal-jobcard', worker.job_card_number);
                setElementText('worker-modal-regdate', formatDate(worker.created_at));
                
                // Set worker profile image if available
                const profileImage = document.getElementById('worker-profile-image');
                if (profileImage) {
                    if (worker.profile_image_url) {
                        profileImage.src = worker.profile_image_url;
                    } else {
                        profileImage.src = '../assets/images/worker_placeholder.png';
                    }
                }
                
                // Add verification action button if worker is not verified
                const modalFooter = document.querySelector('#workerDetailModal .modal-footer');
                if (modalFooter) {
                    // Clear any previously added action buttons except close
                    const actionsToRemove = modalFooter.querySelectorAll('.verification-action');
                    actionsToRemove.forEach(btn => btn.remove());
                    
                    // Add appropriate verification action based on current status
                    if (!worker.is_verified) {
                        // Add verify button for unverified workers
                        const verifyBtn = document.createElement('button');
                        verifyBtn.className = 'btn btn-success verification-action';
                        verifyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Verify Worker';
                        verifyBtn.setAttribute('data-worker-id', workerId);
                        verifyBtn.addEventListener('click', function() {
                            verifyWorker(workerId);
                        });
                        
                        // Add to the footer
                        modalFooter.prepend(verifyBtn);
                    } else {
                        // Add unverify button for verified workers
                        const unverifyBtn = document.createElement('button');
                        unverifyBtn.className = 'btn btn-warning verification-action';
                        unverifyBtn.innerHTML = '<i class="fas fa-times me-1"></i>Unverify Worker';
                        unverifyBtn.setAttribute('data-worker-id', workerId);
                        unverifyBtn.addEventListener('click', function() {
                            unverifyWorker(workerId);
                        });
                        
                        // Add to the footer
                        modalFooter.prepend(unverifyBtn);
                    }
                }
            } catch (innerError) {
                console.error('Error setting modal data:', innerError);
            }
            
            try {
                // Show modal
                const modal = new bootstrap.Modal(modalEl);
                modal.show();
            } catch (modalError) {
                console.error('Error showing modal:', modalError);
                alert('Error displaying worker details modal. Please try again.');
            }
        } catch (error) {
            console.error('Error fetching worker details:', error);
            alert('Error loading worker details. See console for details.');
        }
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
            case 'accepted':
                return 'primary';
            case 'in progress':
                return 'info';
            default:
                return 'secondary';
        }
    }

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

    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Add the openWorkerVerificationModal function to window context
    window.openWorkerVerificationModal = async function(workerId) {
        // Get worker details
        const { data, error } = await supabaseClient
            .from('worker')
            .select('*')
            .eq('id', workerId)
            .single();
        
        if (error) {
            console.error('Error fetching worker details:', error);
            return;
        }
        
        // Populate modal with worker data
        document.getElementById('worker-name').textContent = data.name || '-';
        document.getElementById('worker-email').textContent = data.email || '-';
        document.getElementById('worker-phone').textContent = data.phone_no || '-';
        document.getElementById('worker-service').textContent = data.service_category || '-';
        document.getElementById('worker-skills').textContent = data.skills || '-';
        document.getElementById('worker-experience').textContent = data.experience || '-';
        document.getElementById('worker-aadhar').textContent = data.aadhar_number || '-';
        document.getElementById('worker-job-card').textContent = data.job_card_number || '-';
        
        // Set worker ID on buttons for later use
        document.getElementById('approve-verification').setAttribute('data-worker-id', workerId);
        document.getElementById('reject-verification').setAttribute('data-worker-id', workerId);
        
        // Clear verification note
        document.getElementById('verification-note').value = '';
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('workerVerificationModal'));
        modal.show();
    };

    // HTML templates for different sections
    function createDashboardHTML() {
        return `
            <div id="dashboard-content">
                <div class="row mb-4">
                    <div class="col-md-3 mb-4">
                        <div class="card border-left-primary shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                            Total Users</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="total-users">0</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-users fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3 mb-4">
                        <div class="card border-left-success shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                            Total Workers</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="total-workers">0</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-hard-hat fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3 mb-4">
                        <div class="card border-left-info shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                            Total Bookings</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="total-bookings">0</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-calendar-check fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-3 mb-4">
                        <div class="card border-left-warning shadow h-100 py-2">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                            Worker Verifications</div>
                                        <div class="h5 mb-0 font-weight-bold text-gray-800" id="pending-verifications">0</div>
                                    </div>
                                    <div class="col-auto">
                                        <i class="fas fa-user-check fa-2x text-gray-300"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-lg-6">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3">
                                <h6 class="m-0 font-weight-bold text-primary">Recent Bookings</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered" id="recent-bookings-table" width="100%" cellspacing="0">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Service</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <!-- Data will be loaded here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-6">
                        <div class="card shadow mb-4">
                            <div class="card-header py-3">
                                <h6 class="m-0 font-weight-bold text-primary">Recent Worker Verifications</h6>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered" id="pending-verifications-table" width="100%" cellspacing="0">
                                        <thead>
                                            <tr>
                                                <th>Worker Name</th>
                                                <th>Service</th>
                                                <th>Verification Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <!-- Data will be loaded here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function createWorkersHTML() {
        return `
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 class="m-0 font-weight-bold text-primary">Workers Management</h6>
                    <div>
                        <button id="refresh-workers" class="btn btn-sm btn-primary">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                        <button id="export-workers" class="btn btn-sm btn-success">
                            <i class="fas fa-download fa-sm text-white-50 me-1"></i>Export
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Filter Form -->
                    <div class="mb-4">
                        <div class="card bg-light border-0">
                            <div class="card-body">
                                <form id="worker-filter-form">
                                    <div class="row g-3">
                                        <div class="col-md-3">
                                            <label for="filter-service-category" class="form-label">Service</label>
                                            <select class="form-select" id="filter-service-category">
                                                <option value="">All Services</option>
                                                <option value="Plumbing">Plumbing</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label for="filter-verification-status" class="form-label">Verification</label>
                                            <select class="form-select" id="filter-verification-status">
                                                <option value="">All Status</option>
                                                <option value="verified">Verified</option>
                                                <option value="pending">Pending</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label for="filter-location" class="form-label">Village</label>
                                            <select class="form-select" id="filter-location">
                                                <option value="">All Villages</option>
                                                <option value="Alayaman">Alayaman</option>
                                                <option value="Anchal">Anchal</option>
                                                <option value="Arakkal">Arakkal</option>
                                                <option value="Ariyankavu">Ariyankavu</option>
                                                <option value="Ayiranelloor">Ayiranelloor</option>
                                                <option value="Channapetta">Channapetta</option>
                                                <option value="Edamon">Edamon</option>
                                                <option value="Edamulakkal">Edamulakkal</option>
                                                <option value="Eroor">Eroor</option>
                                                <option value="Karavaloor">Karavaloor</option>
                                                <option value="Kulathupuzha">Kulathupuzha</option>
                                                <option value="Punalur">Punalur</option>
                                                <option value="Thenmala">Thenmala</option>
                                                <option value="Thinkalkarikkom">Thinkalkarikkom</option>
                                                <option value="Valakkode">Valakkode</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label for="filter-search" class="form-label">Search</label>
                                            <input type="text" class="form-control" id="filter-search" placeholder="Name, Email, Phone">
                                        </div>
                                        <div class="col-12 text-end">
                                            <button type="submit" class="btn btn-primary"><i class="fas fa-filter me-1"></i> Filter</button>
                                            <button type="button" id="reset-filter" class="btn btn-secondary"><i class="fas fa-undo me-1"></i> Reset</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Workers Table -->
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover" id="workers-table">
                            <thead class="table-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Service</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Data will be loaded dynamically -->
                                <tr>
                                    <td colspan="7" class="text-center">
                                        <div class="spinner-border" role="status"></div>
                                        <p>Loading workers data...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="text-muted">
                            Showing <span id="showing-start">0</span> to <span id="showing-end">0</span> of <span id="total-workers">0</span> workers
                        </div>
                        <nav aria-label="Table pagination">
                            <ul class="pagination" id="workers-pagination">
                                <!-- Pagination will be added here -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        `;
    }

    function createUsersHTML() {
        return `
            <!-- Users Filter Section -->
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-primary">Filter Users</h6>
                </div>
                <div class="card-body">
                    <form id="user-filter-form" class="row">
                        <div class="col-md-4 mb-3">
                            <label for="filter-user-role" class="form-label">User Role</label>
                            <select class="form-select" id="filter-user-role">
                                <option value="">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                            </select>
                        </div>
                        <div class="col-md-8 mb-3">
                            <label for="filter-user-search" class="form-label">Search</label>
                            <input type="text" class="form-control" id="filter-user-search" placeholder="Name, Email, Phone...">
                        </div>
                        <div class="col-12 d-flex justify-content-end">
                            <button type="button" class="btn btn-secondary me-2" id="reset-user-filter">Reset</button>
                            <button type="submit" class="btn btn-primary">Apply Filters</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Users Table -->
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                    <h6 class="m-0 font-weight-bold text-primary">All Users</h6>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered" id="users-table" width="100%" cellspacing="0">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Registration Date</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Data will be loaded dynamically -->
                                <tr>
                                    <td colspan="6" class="text-center">
                                        <div class="spinner-border" role="status"></div>
                                        <p>Loading users data...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <!-- Pagination -->
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="text-muted">
                            Showing <span id="showing-users-start">0</span> to <span id="showing-users-end">0</span> of <span id="total-users-count">0</span> users
                        </div>
                        <nav aria-label="Table pagination">
                            <ul class="pagination" id="users-pagination">
                                <!-- Pagination will be added here -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        `;
    }

    function createBookingsHTML() {
        return `
            <!-- Bookings Filter Section -->
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-primary">Filter Bookings</h6>
                </div>
                <div class="card-body">
                    <form id="booking-filter-form" class="row">
                        <div class="col-md-3 mb-3">
                            <label for="filter-booking-service" class="form-label">Service Category</label>
                            <select class="form-select" id="filter-booking-service">
                                <option value="">All Categories</option>
                                <option value="Plumbing">Plumbing</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Carpentry">Carpentry</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Painting">Painting</option>
                            </select>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label for="filter-booking-status" class="form-label">Status</label>
                            <select class="form-select" id="filter-booking-status">
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="in progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div class="col-md-3 mb-3">
                            <label for="filter-booking-date-from" class="form-label">From Date</label>
                            <input type="date" class="form-control" id="filter-booking-date-from">
                        </div>
                        <div class="col-md-3 mb-3">
                            <label for="filter-booking-date-to" class="form-label">To Date</label>
                            <input type="date" class="form-control" id="filter-booking-date-to">
                        </div>
                        <div class="col-12 d-flex justify-content-end">
                            <button type="button" class="btn btn-secondary me-2" id="reset-booking-filter">Reset</button>
                            <button type="submit" class="btn btn-primary">Apply Filters</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Bookings Table -->
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                    <h6 class="m-0 font-weight-bold text-primary">All Bookings</h6>
                    <div class="dropdown no-arrow">
                        <button class="btn btn-sm btn-primary" id="export-bookings">
                            <i class="fas fa-download fa-sm text-white-50 me-1"></i>Export
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered" id="bookings-table" width="100%" cellspacing="0">
                            <thead>
                                <tr>
                                    <th>Booking ID</th>
                                    <th>User</th>
                                    <th>Worker</th>
                                    <th>Service</th>
                                    <th>Date & Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Data will be loaded dynamically -->
                                <tr>
                                    <td colspan="7" class="text-center">
                                        <div class="spinner-border" role="status"></div>
                                        <p>Loading bookings data...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <!-- Pagination -->
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="text-muted">
                            Showing <span id="showing-bookings-start">0</span> to <span id="showing-bookings-end">0</span> of <span id="total-bookings-count">0</span> bookings
                        </div>
                        <nav aria-label="Table pagination">
                            <ul class="pagination" id="bookings-pagination">
                                <!-- Pagination will be added here -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        `;
    }

    function createVerificationHTML() {
        return `
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 class="m-0 font-weight-bold text-primary">Worker Verification Management</h6>
                    <div>
                        <button id="refresh-verifications" class="btn btn-sm btn-primary">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Filter Form -->
                    <div class="mb-4">
                        <div class="card bg-light border-0">
                            <div class="card-body">
                                <form id="verification-filter-form">
                                    <div class="row g-3">
                                        <div class="col-md-4">
                                            <label for="filter-verification-service" class="form-label">Service</label>
                                            <select class="form-select" id="filter-verification-service">
                                                <option value="">All Services</option>
                                                <option value="Plumbing">Plumbing</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label for="filter-verification-location" class="form-label">Village</label>
                                            <select class="form-select" id="filter-verification-location">
                                                <option value="">All Villages</option>
                                                <option value="Alayaman">Alayaman</option>
                                                <option value="Anchal">Anchal</option>
                                                <option value="Arakkal">Arakkal</option>
                                                <option value="Ariyankavu">Ariyankavu</option>
                                                <option value="Ayiranelloor">Ayiranelloor</option>
                                                <option value="Channapetta">Channapetta</option>
                                                <option value="Edamon">Edamon</option>
                                                <option value="Edamulakkal">Edamulakkal</option>
                                                <option value="Eroor">Eroor</option>
                                                <option value="Karavaloor">Karavaloor</option>
                                                <option value="Kulathupuzha">Kulathupuzha</option>
                                                <option value="Punalur">Punalur</option>
                                                <option value="Thenmala">Thenmala</option>
                                                <option value="Thinkalkarikkom">Thinkalkarikkom</option>
                                                <option value="Valakkode">Valakkode</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label for="filter-verification-status" class="form-label">Status</label>
                                            <select class="form-select" id="filter-verification-status">
                                                <option value="pending">Pending Verification</option>
                                                <option value="verified">Verified</option>
                                                <option value="">All Status</option>
                                            </select>
                                        </div>
                                        <div class="col-12 text-end">
                                            <button type="submit" class="btn btn-primary"><i class="fas fa-filter me-1"></i> Filter</button>
                                            <button type="button" id="reset-verification-filter" class="btn btn-secondary"><i class="fas fa-undo me-1"></i> Reset</button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Verifications Table -->
                    <div class="table-responsive">
                        <table class="table table-bordered table-hover" id="verifications-table">
                            <thead class="table-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Service</th>
                                    <th>Village</th>
                                    <th>Experience</th>
                                    <th>Date Applied</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- Data will be loaded dynamically -->
                                <tr>
                                    <td colspan="7" class="text-center">
                                        <div class="spinner-border" role="status"></div>
                                        <p>Loading workers data...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <div class="text-muted">
                            Showing <span id="showing-verifications-start">0</span> to <span id="showing-verifications-end">0</span> of <span id="total-verifications">0</span> workers
                        </div>
                        <nav aria-label="Table pagination">
                            <ul class="pagination" id="verifications-pagination">
                                <!-- Pagination will be added here -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        `;
    }

    function createSettingsHTML() {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Admin Profile</h6>
                        </div>
                        <div class="card-body">
                            <form id="admin-profile-form">
                                <div class="mb-3">
                                    <label for="admin-name" class="form-label">Name</label>
                                    <input type="text" class="form-control" id="admin-name" placeholder="Your Name">
                                </div>
                                <div class="mb-3">
                                    <label for="admin-email" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="admin-email" readonly>
                                </div>
                                <div class="mb-3">
                                    <label for="admin-phone" class="form-label">Phone Number</label>
                                    <input type="tel" class="form-control" id="admin-phone" placeholder="Phone Number">
                                </div>
                                <div class="mb-3">
                                    <label for="admin-role" class="form-label">Role</label>
                                    <input type="text" class="form-control" id="admin-role" readonly>
                                </div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary" id="save-profile">
                                        <i class="fas fa-save me-1"></i> Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <div class="card shadow mb-4">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Change Password</h6>
                        </div>
                        <div class="card-body">
                            <form id="change-password-form">
                                <div class="mb-3">
                                    <label for="current-password" class="form-label">Current Password</label>
                                    <input type="password" class="form-control" id="current-password" placeholder="Current Password">
                                </div>
                                <div class="mb-3">
                                    <label for="new-password" class="form-label">New Password</label>
                                    <input type="password" class="form-control" id="new-password" placeholder="New Password">
                                </div>
                                <div class="mb-3">
                                    <label for="confirm-password" class="form-label">Confirm New Password</label>
                                    <input type="password" class="form-control" id="confirm-password" placeholder="Confirm New Password">
                                </div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-warning" id="change-password-btn">
                                        <i class="fas fa-key me-1"></i> Change Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card shadow mb-4">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">System Settings</h6>
                        </div>
                        <div class="card-body">
                            <form id="system-settings-form">
                                <div class="mb-3">
                                    <label for="booking-fee" class="form-label">Booking Fee (%)</label>
                                    <input type="number" class="form-control" id="booking-fee" placeholder="e.g. 10">
                                    <div class="form-text">Platform fee percentage to charge on each booking</div>
                                </div>
                                <div class="mb-3">
                                    <label for="verification-fee" class="form-label">Worker Verification Fee (₹)</label>
                                    <input type="number" class="form-control" id="verification-fee" placeholder="e.g. 500">
                                    <div class="form-text">Fee to charge workers for verification</div>
                                </div>
                                <div class="mb-3">
                                    <label for="min-booking-amount" class="form-label">Minimum Booking Amount (₹)</label>
                                    <input type="number" class="form-control" id="min-booking-amount" placeholder="e.g. 300">
                                </div>
                                <div class="mb-3 form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="enable-verification-fee">
                                    <label class="form-check-label" for="enable-verification-fee">Enable Worker Verification Fee</label>
                                </div>
                                <div class="mb-3 form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="enable-rating-requirement">
                                    <label class="form-check-label" for="enable-rating-requirement">Require Ratings for Completed Bookings</label>
                                </div>
                                <div class="d-grid gap-2">
                                    <button type="submit" class="btn btn-primary" id="save-settings">
                                        <i class="fas fa-save me-1"></i> Save Settings
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <div class="card shadow mb-4">
                        <div class="card-header py-3">
                            <h6 class="m-0 font-weight-bold text-primary">Service Categories</h6>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label for="category-list" class="form-label">Available Service Categories</label>
                                <div class="border rounded p-3 mb-3" id="category-list">
                                    <div class="d-flex flex-wrap gap-2" id="service-categories-container">
                                        <!-- Categories will be loaded here -->
                                        <span class="badge bg-primary p-2">Plumbing</span>
                                        <span class="badge bg-primary p-2">Electrical</span>
                                        <span class="badge bg-primary p-2">Carpentry</span>
                                        <span class="badge bg-primary p-2">Cleaning</span>
                                        <span class="badge bg-primary p-2">Painting</span>
                                        <span class="badge bg-primary p-2">Gardening</span>
                                        <span class="badge bg-primary p-2">Repair</span>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="new-category" class="form-label">Add New Category</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" id="new-category" placeholder="New Category Name">
                                    <button class="btn btn-primary" type="button" id="add-category">
                                        <i class="fas fa-plus"></i> Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function loadWorkers(page = 1, filters = {}) {
        try {
            console.log('Loading workers data...', filters);
            
            // Show loading state
            document.querySelector('#workers-table tbody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border" role="status"></div>
                        <p>Loading workers data...</p>
                    </td>
                </tr>
            `;
            
            // Default filters
            const limit = 10;
            const offset = (page - 1) * limit;
            
            // Start the query
            let query = supabaseClient
                .from('worker')
                .select('*', { count: 'exact' });
            
            // Apply filters
            if (filters.service) {
                query = query.eq('service_category', filters.service);
            }
            
            if (filters.verification_status === 'verified') {
                query = query.eq('is_verified', true);
            } else if (filters.verification_status === 'pending') {
                query = query.eq('is_verified', false);
            }
            
            if (filters.location) {
                query = query.eq('village', filters.location);
            }
            
            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone_no.ilike.%${filters.search}%`);
            }
            
            // Paginate the query
            query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
            
            // Execute the query
            const { data: workers, error, count } = await query;
            
            if (error) throw error;
            
            // Update UI with the fetched data
            updateWorkersTable(workers, count, page, limit);
            updatePagination(count, page, limit);
            
            console.log('Workers loaded successfully:', workers);
        } catch (error) {
            console.error('Error loading workers:', error);
            document.querySelector('#workers-table tbody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading workers: ${error.message || 'Unknown error'}
                    </td>
                </tr>
            `;
        }
    }
    
    function updateWorkersTable(workers, count, page, limit) {
        const tableBody = document.querySelector('#workers-table tbody');
        
        if (!workers || workers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-user-slash me-2"></i>
                        No workers found matching your criteria
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        workers.forEach(worker => {
            html += `
                <tr>
                    <td>${worker.name || 'Unknown'}</td>
                    <td>${worker.email || 'N/A'}</td>
                    <td>${worker.phone_no || 'N/A'}</td>
                    <td>${worker.service_category || 'N/A'}</td>
                    <td>${worker.village || 'N/A'}</td>
                    <td>
                        <span class="badge bg-${worker.is_verified ? 'success' : 'warning'}">
                            ${worker.is_verified ? 'Verified' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary view-worker" data-worker-id="${worker.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!worker.is_verified ? `
                            <button class="btn btn-sm btn-success verify-worker" data-worker-id="${worker.id}">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-warning unverify-worker" data-worker-id="${worker.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Update the showing count text
        const showingStart = (page - 1) * limit + 1;
        const showingEnd = Math.min(page * limit, count);
        document.getElementById('showing-start').textContent = showingStart;
        document.getElementById('showing-end').textContent = showingEnd;
        document.getElementById('total-workers').textContent = count;
        
        // Add event listeners
        addWorkerTableEventListeners();
    }
    
    function updatePagination(count, currentPage, limit) {
        const pagination = document.getElementById('workers-pagination');
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
        document.querySelectorAll('#workers-pagination .page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                if (!isNaN(page)) {
                    loadWorkers(page, getCurrentFilters());
                }
            });
        });
    }
    
    function getCurrentFilters() {
        // Get filter values from form
        const service = document.getElementById('filter-service-category')?.value || '';
        const verificationStatus = document.getElementById('filter-verification-status')?.value || '';
        const location = document.getElementById('filter-location')?.value || '';
        const search = document.getElementById('filter-search')?.value || '';
        
        return {
            service,
            verification_status: verificationStatus,
            location,
            search
        };
    }
    
    function addWorkerTableEventListeners() {
        // Remove and add back event listeners
        
        // View worker details
        document.querySelectorAll('.view-worker').forEach(button => {
            // Remove all existing click listeners using the cloneNode technique
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the click listener to the new button
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('View worker clicked for ID:', workerId);
                viewWorkerDetails(workerId);
            });
        });
        
        // Verify worker
        document.querySelectorAll('.verify-worker').forEach(button => {
            // Remove all existing click listeners using the cloneNode technique
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the click listener to the new button
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('Verify worker clicked for ID:', workerId);
                verifyWorker(workerId);
            });
        });
        
        // Unverify worker
        document.querySelectorAll('.unverify-worker').forEach(button => {
            // Remove all existing click listeners using the cloneNode technique
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the click listener to the new button
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('Unverify worker clicked for ID:', workerId);
                unverifyWorker(workerId);
            });
        });
    }
    
    async function verifyWorker(workerId) {
        try {
            if (confirm('Are you sure you want to verify this worker?')) {
                // Update the worker's verification status
                const { data, error } = await supabaseClient
                    .from('worker')
                    .update({ is_verified: true })
                    .eq('id', workerId);
                    
                if (error) throw error;
                
                alert('Worker verified successfully!');
                
                // Reload based on current section
                if (currentSection === 'workers') {
                    loadWorkers(1, getCurrentFilters());
                } else if (currentSection === 'verification') {
                    loadPendingVerifications();
                } else if (currentSection === 'dashboard') {
                    // Check if we're still on the dashboard page before reloading it
                    if (document.getElementById('total-users')) {
                        loadDashboard();
                    } else {
                        // If elements don't exist, we've navigated away, so load the current section
                        showSection(currentSection);
                    }
                } else {
                    // For any other section, just reload that section
                    showSection(currentSection);
                }
            }
        } catch (error) {
            console.error('Error verifying worker:', error);
            alert('Error verifying worker. See console for details.');
        }
    }

    async function unverifyWorker(workerId) {
        try {
            if (confirm('Are you sure you want to revoke verification from this worker? They will no longer be able to receive bookings until verified again.')) {
                // Show loading indicator
                const button = document.querySelector(`.unverify-worker[data-worker-id="${workerId}"]`);
                if (button) {
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    button.disabled = true;
                }
                
                // Update the worker's verification status
                const { data, error } = await supabaseClient
                    .from('worker')
                    .update({ 
                        is_verified: false,
                        verification_date: null 
                    })
                    .eq('id', workerId);
                    
                if (error) throw error;
                
                // Send notification to worker
                await supabaseClient.from('worker_notifications').insert({
                    worker_id: workerId,
                    type: 'verification_revoked',
                    message: 'Your verification status has been revoked by admin. Please contact support for more details.',
                    is_read: false
                });
                
                alert('Worker unverified successfully!');
                
                // Reload based on current section
                if (currentSection === 'workers') {
                    loadWorkers(1, getCurrentFilters());
                } else if (currentSection === 'verification') {
                    loadPendingVerifications();
                } else if (currentSection === 'dashboard') {
                    // Check if we're still on the dashboard page before reloading it
                    if (document.getElementById('total-users')) {
                        loadDashboard();
                    } else {
                        // If elements don't exist, we've navigated away, so load the current section
                        showSection(currentSection);
                    }
                } else {
                    // For any other section, just reload that section
                    showSection(currentSection);
                }
            }
        } catch (error) {
            console.error('Error unverifying worker:', error);
            
            // Reset button if it exists
            const button = document.querySelector(`.unverify-worker[data-worker-id="${workerId}"]`);
            if (button) {
                button.innerHTML = '<i class="fas fa-times"></i>';
                button.disabled = false;
            }
            
            alert('Error unverifying worker: ' + (error.message || 'Unknown error'));
        }
    }

    async function editWorker(workerId) {
        // For now just show a message since edit functionality is removed
        alert('Worker editing functionality has been disabled in this version.');
    }

    async function exportWorkersData() {
        try {
            console.log('Exporting workers data...');
            
            // Get current filters
            const filters = getCurrentFilters();
            
            // Show loading state
            document.getElementById('export-workers').innerHTML = '<i class="fas fa-spinner fa-spin fa-sm text-white-50 me-1"></i>Exporting...';
            document.getElementById('export-workers').disabled = true;
            
            // Start the query to get all workers matching the filters
            let query = supabaseClient
                .from('worker')
                .select('*');
            
            // Apply filters
            if (filters.service) {
                query = query.eq('service_category', filters.service);
            }
            
            if (filters.verification_status === 'verified') {
                query = query.eq('is_verified', true);
            } else if (filters.verification_status === 'pending') {
                query = query.eq('is_verified', false);
            }
            
            if (filters.location) {
                query = query.eq('district', filters.location);
            }
            
            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone_no.ilike.%${filters.search}%`);
            }
            
            // Order by created_at
            query = query.order('created_at', { ascending: false });
            
            // Execute the query
            const { data: workers, error } = await query;
            
            if (error) throw error;
            
            if (!workers || workers.length === 0) {
                alert('No workers found to export');
                return;
            }
            
            // Prepare data for CSV
            const csvData = [];
            
            // CSV header
            csvData.push([
                'Name',
                'Email',
                'Phone',
                'Service',
                'Skills',
                'Experience',
                'Age',
                'Gender',
                'Location',
                'Verification Status',
                'Registration Date'
            ]);
            
            // Add worker data
            workers.forEach(worker => {
                csvData.push([
                    worker.name || '',
                    worker.email || '',
                    worker.phone_no || '',
                    worker.service_category || '',
                    worker.skills || '',
                    worker.experience || '',
                    worker.age || '',
                    worker.sex || '',
                    `${[worker.house_name, worker.village, worker.taluk, worker.district, worker.pincode].filter(Boolean).join(', ')}`,
                    worker.is_verified ? 'Verified' : 'Pending',
                    formatDate(worker.created_at)
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
            a.setAttribute('download', `quike_workers_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Reset button
            document.getElementById('export-workers').innerHTML = '<i class="fas fa-download fa-sm text-white-50 me-1"></i>Export';
            document.getElementById('export-workers').disabled = false;
            
            console.log('Workers data exported successfully');
        } catch (error) {
            console.error('Error exporting workers data:', error);
            alert('Error exporting workers data. See console for details.');
            
            // Reset button
            document.getElementById('export-workers').innerHTML = '<i class="fas fa-download fa-sm text-white-50 me-1"></i>Export';
            document.getElementById('export-workers').disabled = false;
        }
    }

    async function deleteWorker(workerId) {
        try {
            console.log('Deleting worker:', workerId);
            
            if (!workerId) {
                console.error('No worker ID provided for deletion');
                alert('Error: No worker ID provided for deletion');
                return;
            }
            
            if (confirm('Are you sure you want to delete this worker? This action cannot be undone.')) {
                // Show loading indication
                const deleteBtn = document.getElementById('delete-worker-btn');
                if (deleteBtn) {
                    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
                    deleteBtn.disabled = true;
                }
                
                // Delete the worker from the database
                const { error } = await supabaseClient
                    .from('worker')
                    .delete()
                    .eq('id', workerId);
                    
                if (error) throw error;
                
                // Close the modal if it's open
                try {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('workerDetailModal'));
                    if (modal) {
                        modal.hide();
                    }
                } catch (modalError) {
                    console.log('Modal was already closed or not found:', modalError);
                }
                
                // Show success message
                console.log('Worker deleted successfully');
                alert('Worker deleted successfully!');
                
                // Reload the workers list or dashboard based on current section
                if (currentSection === 'workers') {
                    loadWorkers(1, getCurrentFilters());
                } else {
                    loadDashboard();
                }
            }
        } catch (error) {
            console.error('Error deleting worker:', error);
            
            // Reset delete button
            const deleteBtn = document.getElementById('delete-worker-btn');
            if (deleteBtn) {
                deleteBtn.innerHTML = 'Delete Worker';
                deleteBtn.disabled = false;
            }
            
            alert('Error deleting worker: ' + (error.message || 'Unknown error'));
        }
    }

    // Add implementations for the missing functions
    async function loadUsers(page = 1, filters = {}) {
        try {
            console.log('Loading users data...', filters);
            
            // Show loading state
            const contentArea = document.getElementById('content-area');
            contentArea.innerHTML = createUsersHTML();
            
            document.querySelector('#users-table tbody').innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="spinner-border" role="status"></div>
                        <p>Loading users data...</p>
                    </td>
                </tr>
            `;
            
            // Default filters
            const limit = 10;
            const offset = (page - 1) * limit;
            
            // Start the query
            let query = supabaseClient
                .from('user')
                .select('*', { count: 'exact' });
            
            // Apply filters
            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone_no.ilike.%${filters.search}%`);
            }
            
            if (filters.role) {
                query = query.eq('role', filters.role);
            }
            
            // Paginate the query
            query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
            
            // Execute the query
            const { data: users, error, count } = await query;
            
            if (error) throw error;
            
            // Update UI with the fetched data
            updateUsersTable(users, count, page, limit);
            updateUsersPagination(count, page, limit);
            
            // Add event listeners for form
            const userFilterForm = document.getElementById('user-filter-form');
            if (userFilterForm) {
                userFilterForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    loadUsers(1, getUserFilters());
                });
                
                // Reset filter button
                document.getElementById('reset-user-filter')?.addEventListener('click', function() {
                    document.getElementById('filter-user-role').value = '';
                    document.getElementById('filter-user-search').value = '';
                    loadUsers(1, {});
                });
            }
            
            console.log('Users loaded successfully:', users);
        } catch (error) {
            console.error('Error loading users:', error);
            document.querySelector('#users-table tbody').innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading users: ${error.message || 'Unknown error'}
                    </td>
                </tr>
            `;
        }
    }
    
    function updateUsersTable(users, count, page, limit) {
        const tableBody = document.querySelector('#users-table tbody');
        
        if (!users || users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <i class="fas fa-user-slash me-2"></i>
                        No users found matching your criteria
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        users.forEach(user => {
            html += `
                <tr>
                    <td>${user.name || 'Unknown'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.phone_no || 'N/A'}</td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>${user.role || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view-user" data-user-id="${user.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Update the showing count text
        const showingStart = (page - 1) * limit + 1;
        const showingEnd = Math.min(page * limit, count);
        document.getElementById('showing-users-start').textContent = showingStart;
        document.getElementById('showing-users-end').textContent = showingEnd;
        document.getElementById('total-users-count').textContent = count;
        
        // Add event listeners
        addUserTableEventListeners();
    }
    
    function updateUsersPagination(count, currentPage, limit) {
        const pagination = document.getElementById('users-pagination');
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
        document.querySelectorAll('#users-pagination .page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                if (!isNaN(page)) {
                    loadUsers(page, getUserFilters());
                }
            });
        });
    }
    
    function getUserFilters() {
        // Get filter values from form
        const search = document.getElementById('filter-user-search')?.value || '';
        const role = document.getElementById('filter-user-role')?.value || '';
        
        return {
            search,
            role
        };
    }
    
    function addUserTableEventListeners() {
        // Remove and add back event listeners
        
        // View user details
        document.querySelectorAll('.view-user').forEach(button => {
            // Remove all existing click listeners using the cloneNode technique
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add the click listener to the new button
            newButton.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                console.log('View user clicked for ID:', userId);
                viewUserDetails(userId);
            });
        });
    }
    
    async function viewUserDetails(userId) {
        try {
            console.log('Viewing user details:', userId);
            
            // Fetch user details
            const { data: user, error } = await supabaseClient
                .from('user')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (error) throw error;
            
            if (!user) {
                alert('User not found');
                return;
            }
            
            // Check if modal exists in the DOM, if not, create it
            let modalEl = document.getElementById('userDetailModal');
            if (!modalEl) {
                // Create the modal element
                const modalHTML = `
                    <div class="modal fade" id="userDetailModal" tabindex="-1" aria-labelledby="userDetailModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="userDetailModalLabel">User Details</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="row">
                                        <div class="col-md-4 text-center mb-3">
                                            <img id="user-profile-image" src="../assets/images/placeholder-user.png" alt="User Profile" class="img-fluid rounded-circle mb-3" style="width: 150px; height: 150px; object-fit: cover;">
                                            <h5 id="user-modal-name">User Name</h5>
                                            <span id="user-modal-role" class="badge bg-success">User</span>
                                        </div>
                                        <div class="col-md-8">
                                            <h6 class="border-bottom pb-2 mb-3">Contact Information</h6>
                                            <div class="row mb-3">
                                                <div class="col-md-6">
                                                    <p><strong>Email:</strong> <span id="user-modal-email"></span></p>
                                                    <p><strong>Phone:</strong> <span id="user-modal-phone"></span></p>
                                                    <p><strong>Registration Date:</strong> <span id="user-modal-created"></span></p>
                                                </div>
                                                <div class="col-md-6">
                                                    <p><strong>Total Bookings:</strong> <span id="user-modal-bookings">0</span></p>
                                                </div>
                                            </div>
                                            
                                            <h6 class="border-bottom pb-2 mb-3">Address Information</h6>
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <p><strong>House/Flat:</strong> <span id="user-modal-house"></span></p>
                                                </div>
                                                <div class="col-md-6">
                                                    <p><strong>City/Village:</strong> <span id="user-modal-city"></span></p>
                                                    <p><strong>District:</strong> <span id="user-modal-district"></span></p>
                                                    <p><strong>Pincode:</strong> <span id="user-modal-pincode"></span></p>
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
                `;
                
                // Append the modal to the body
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                modalEl = document.getElementById('userDetailModal');
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
            
            // Populate modal with user details
            setElementText('user-modal-name', user.name);
            setElementText('user-modal-email', user.email);
            setElementText('user-modal-phone', user.phone_no);
            setElementText('user-modal-role', user.role || 'user');
            setElementClass('user-modal-role', `badge bg-${getRoleBadgeColor(user.role)}`);
            
            setElementText('user-modal-created', formatDate(user.created_at));
            
            // Set address information if available
            setElementText('user-modal-house', user.house_name || user.house_no || user.apartment);
            setElementText('user-modal-city', user.city || user.village);
            setElementText('user-modal-district', user.district);
            setElementText('user-modal-pincode', user.pincode);
            
            // Set user profile image if available
            const profileImage = document.getElementById('user-profile-image');
            if (profileImage) {
                if (user.profile_image_url) {
                    profileImage.src = user.profile_image_url;
                } else {
                    profileImage.src = '../assets/images/placeholder-user.png';
                }
            }
            
            // Fetch user's bookings count
            try {
                const { count: bookingsCount, error: bookingsError } = await supabaseClient
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId);
                    
                if (!bookingsError) {
                    setElementText('user-modal-bookings', bookingsCount || '0');
                }
            } catch (bookingsError) {
                console.error('Error fetching user bookings:', bookingsError);
                setElementText('user-modal-bookings', 'Error');
            }
            
            // Show modal
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        } catch (error) {
            console.error('Error fetching user details:', error);
            alert('Error loading user details. See console for details.');
        }
    }

    function getRoleBadgeColor(role) {
        if (!role) return 'secondary';
        
        role = role.toLowerCase();
        
        switch(role) {
            case 'admin':
                return 'danger';
            case 'moderator':
                return 'warning';
            case 'worker':
                return 'info';
            case 'user':
                return 'success';
            default:
                return 'secondary';
        }
    }

    async function loadBookings(page = 1, filters = {}) {
        try {
            console.log('Loading bookings data...', filters);
            
            // Show loading state
            const contentArea = document.getElementById('content-area');
            contentArea.innerHTML = createBookingsHTML();
            
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
            
            // Start the query - Using worker directly (same schema), but auth.users for user relationship
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
                                                    <div class="cancelled-badge bg-danger text-white py-1 px-3 rounded">
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
            
            // Set user information using the separately fetched user data
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
                
                // Show numerical rating in parentheses
                ratingValueElement.textContent = ` (${rating}/5)`;
                
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

    async function exportBookingsData() {
        try {
            console.log('Exporting bookings data...');
            
            // Show loading state
            document.getElementById('export-bookings').innerHTML = '<i class="fas fa-spinner fa-spin fa-sm text-white-50 me-1"></i>Exporting...';
            document.getElementById('export-bookings').disabled = true;
            
            // Get current filters
            const filters = getBookingFilters();
            
            // Start the query - simplified to only use worker relationship from same schema
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

    async function loadPendingVerifications() {
        try {
            console.log('Loading worker verifications...');
            
            // Change content area to show verifications content
            const contentArea = document.getElementById('content-area');
            contentArea.innerHTML = createVerificationHTML();
            
            // Note: The event listeners and loading are now handled in attachVerificationSectionEventListeners()
            // which is called from showSection()
            attachVerificationSectionEventListeners();
            
        } catch (error) {
            console.error('Error loading pending verifications:', error);
            const contentArea = document.getElementById('content-area');
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading worker verifications: ${error.message || 'Unknown error'}
                </div>
                ${createVerificationHTML()}
            `;
        }
    }

    async function loadSettings() {
        try {
            console.log('Loading settings...');
            
            // Change content area to show settings content
            const contentArea = document.getElementById('content-area');
            contentArea.innerHTML = createSettingsHTML();
            
            // Load current admin profile
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                // Get admin data if exists in the user table
                const { data: adminData } = await supabaseClient
                    .from('user')
                    .select('name, phone_no, role')
                    .eq('id', user.id)
                    .single();
                
                // Set form values
                if (adminData) {
                    document.getElementById('admin-name').value = adminData.name || '';
                    document.getElementById('admin-phone').value = adminData.phone_no || '';
                    document.getElementById('admin-role').value = adminData.role || 'Admin';
                }
                
                // Set email (always available from auth)
                document.getElementById('admin-email').value = user.email || '';
            }
            
            // Load system settings
            const { data: systemSettings } = await supabaseClient
                .from('system_settings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
            if (systemSettings) {
                // Set form values for system settings
                document.getElementById('booking-fee').value = systemSettings.booking_fee_percentage || '';
                document.getElementById('verification-fee').value = systemSettings.worker_verification_fee || '';
                document.getElementById('min-booking-amount').value = systemSettings.minimum_booking_amount || '';
                
                // Set switches
                document.getElementById('enable-verification-fee').checked = systemSettings.enable_verification_fee || false;
                document.getElementById('enable-rating-requirement').checked = systemSettings.require_ratings || false;
            }
            
            // Add event listeners for forms
            const profileForm = document.getElementById('admin-profile-form');
            if (profileForm) {
                profileForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    await saveAdminProfile();
                });
            }
            
            const passwordForm = document.getElementById('change-password-form');
            if (passwordForm) {
                passwordForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    await changeAdminPassword();
                });
            }
            
            const systemSettingsForm = document.getElementById('system-settings-form');
            if (systemSettingsForm) {
                systemSettingsForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    await saveSystemSettings();
                });
            }
            
            // Add category button
            const addCategoryBtn = document.getElementById('add-category');
            if (addCategoryBtn) {
                addCategoryBtn.addEventListener('click', function() {
                    addServiceCategory();
                });
            }
            
            // Load service categories
            loadServiceCategories();
            
        } catch (error) {
            console.error('Error loading settings:', error);
            const contentArea = document.getElementById('content-area');
            contentArea.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Error loading settings: ${error.message || 'Unknown error'}
                </div>
                ${createSettingsHTML()}
            `;
        }
    }
    
    async function saveAdminProfile() {
        try {
            const name = document.getElementById('admin-name').value;
            const phone = document.getElementById('admin-phone').value;
            
            // Get current user
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            
            // Update user data
            const { error } = await supabaseClient
                .from('user')
                .upsert({
                    id: user.id,
                    name: name,
                    phone_no: phone,
                    role: 'Admin'
                });
                
            if (error) throw error;
            
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error saving admin profile:', error);
            alert('Error saving profile: ' + (error.message || 'Unknown error'));
        }
    }
    
    async function changeAdminPassword() {
        try {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate passwords
            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('All password fields are required');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                alert('New passwords do not match');
                return;
            }
            
            if (newPassword.length < 6) {
                alert('New password must be at least 6 characters');
                return;
            }
            
            // Update password using Supabase Auth
            // Note: This is simplified, in a real app you'd need to verify the current password first
            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });
                
            if (error) throw error;
            
            // Clear form
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            
            alert('Password changed successfully!');
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Error changing password: ' + (error.message || 'Unknown error'));
        }
    }
    
    async function saveSystemSettings() {
        try {
            const bookingFee = document.getElementById('booking-fee').value;
            const verificationFee = document.getElementById('verification-fee').value;
            const minBookingAmount = document.getElementById('min-booking-amount').value;
            const enableVerificationFee = document.getElementById('enable-verification-fee').checked;
            const enableRatingRequirement = document.getElementById('enable-rating-requirement').checked;
            
            // Validate input
            if (bookingFee && (isNaN(bookingFee) || parseFloat(bookingFee) < 0 || parseFloat(bookingFee) > 100)) {
                alert('Booking fee must be a valid percentage between 0 and 100');
                return;
            }
            
            if (verificationFee && (isNaN(verificationFee) || parseFloat(verificationFee) < 0)) {
                alert('Verification fee must be a valid positive number');
                return;
            }
            
            if (minBookingAmount && (isNaN(minBookingAmount) || parseFloat(minBookingAmount) < 0)) {
                alert('Minimum booking amount must be a valid positive number');
                return;
            }
            
            // Update system settings
            const { error } = await supabaseClient
                .from('system_settings')
                .upsert({
                    booking_fee_percentage: bookingFee ? parseFloat(bookingFee) : null,
                    worker_verification_fee: verificationFee ? parseFloat(verificationFee) : null,
                    minimum_booking_amount: minBookingAmount ? parseFloat(minBookingAmount) : null,
                    enable_verification_fee: enableVerificationFee,
                    require_ratings: enableRatingRequirement,
                    updated_at: new Date().toISOString()
                });
                
            if (error) throw error;
            
            alert('System settings updated successfully!');
        } catch (error) {
            console.error('Error saving system settings:', error);
            alert('Error saving settings: ' + (error.message || 'Unknown error'));
        }
    }
    
    async function loadServiceCategories() {
        try {
            // Get service categories
            const { data: categories, error } = await supabaseClient
                .from('service_categories')
                .select('name')
                .order('name', { ascending: true });
                
            if (error) throw error;
            
            // Update UI
            const categoriesContainer = document.getElementById('service-categories-container');
            if (categoriesContainer) {
                if (categories && categories.length > 0) {
                    let html = '';
                    categories.forEach(category => {
                        html += `
                            <div class="badge bg-primary p-2 position-relative category-badge">
                                ${category.name}
                                <button type="button" class="btn-close btn-close-white position-absolute top-0 end-0" 
                                    style="font-size: 0.5rem; margin-top: -5px; margin-right: -5px;"
                                    data-category="${category.name}"></button>
                            </div>
                        `;
                    });
                    categoriesContainer.innerHTML = html;
                    
                    // Add event listeners for delete buttons
                    document.querySelectorAll('.category-badge .btn-close').forEach(button => {
                        button.addEventListener('click', function(e) {
                            e.stopPropagation();
                            const category = this.getAttribute('data-category');
                            if (confirm(`Are you sure you want to delete category "${category}"?`)) {
                                deleteServiceCategory(category);
                            }
                        });
                    });
                } else {
                    categoriesContainer.innerHTML = '<p class="text-muted">No service categories found</p>';
                }
            }
        } catch (error) {
            console.error('Error loading service categories:', error);
        }
    }
    
    async function addServiceCategory() {
        try {
            const newCategory = document.getElementById('new-category').value.trim();
            
            if (!newCategory) {
                alert('Please enter a category name');
                return;
            }
            
            // Add new category
            const { error } = await supabaseClient
                .from('service_categories')
                .upsert({
                    name: newCategory
                });
                
            if (error) throw error;
            
            // Clear input
            document.getElementById('new-category').value = '';
            
            // Reload categories
            await loadServiceCategories();
            
            alert(`Category "${newCategory}" added successfully!`);
        } catch (error) {
            console.error('Error adding service category:', error);
            alert('Error adding category: ' + (error.message || 'Unknown error'));
        }
    }
    
    async function deleteServiceCategory(categoryName) {
        try {
            // Delete category
            const { error } = await supabaseClient
                .from('service_categories')
                .delete()
                .eq('name', categoryName);
                
            if (error) throw error;
            
            // Reload categories
            await loadServiceCategories();
            
            alert(`Category "${categoryName}" deleted successfully!`);
        } catch (error) {
            console.error('Error deleting service category:', error);
            alert('Error deleting category: ' + (error.message || 'Unknown error'));
        }
    }

    function getVerificationFilters() {
        const serviceFilter = document.getElementById('filter-verification-service');
        const locationFilter = document.getElementById('filter-verification-location');
        const statusFilter = document.getElementById('filter-verification-status');
        
        const filters = {};
        if (serviceFilter && serviceFilter.value) {
            filters.service = serviceFilter.value;
        }
        
        if (locationFilter && locationFilter.value) {
            filters.location = locationFilter.value;
        }
        
        if (statusFilter && statusFilter.value) {
            filters.verification_status = statusFilter.value;
        }
        
        return filters;
    }
    
    async function loadVerificationWorkers(page = 1, filters = {}) {
        try {
            console.log('Loading verification workers data...', filters);
            
            // Show loading state
            document.querySelector('#verifications-table tbody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border" role="status"></div>
                        <p>Loading workers data...</p>
                    </td>
                </tr>
            `;
            
            // Default filters
            const limit = 10;
            const offset = (page - 1) * limit;
            
            // Start the query
            let query = supabaseClient
                .from('worker')
                .select('*', { count: 'exact' });
            
            // Apply filters
            if (filters.service) {
                query = query.eq('service_category', filters.service);
            }
            
            if (filters.verification_status === 'verified') {
                query = query.eq('is_verified', true);
            } else if (filters.verification_status === 'pending') {
                query = query.eq('is_verified', false);
            }
            
            if (filters.location) {
                query = query.eq('village', filters.location);
            }
            
            // Paginate the query
            query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });
            
            // Execute the query
            const { data: workers, error, count } = await query;
            
            if (error) throw error;
            
            // Update UI with the fetched data
            updateVerificationsTable(workers, count, page, limit);
            updateVerificationPagination(count, page, limit);
            
            console.log('Verification workers loaded successfully:', workers);
        } catch (error) {
            console.error('Error loading verification workers:', error);
            document.querySelector('#verifications-table tbody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Error loading workers: ${error.message || 'Unknown error'}
                    </td>
                </tr>
            `;
        }
    }
    
    function updateVerificationsTable(workers, count, page, limit) {
        const tableBody = document.querySelector('#verifications-table tbody');
        
        if (!workers || workers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-user-slash me-2"></i>
                        No workers found matching your criteria
                    </td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        workers.forEach(worker => {
            const village = worker.village || 'N/A';
            const dateApplied = formatDate(worker.created_at);
            
            html += `
                <tr>
                    <td>${worker.name || 'Unknown'}</td>
                    <td>${worker.service_category || 'N/A'}</td>
                    <td>${village}</td>
                    <td>${worker.experience || '0'} years</td>
                    <td>${dateApplied}</td>
                    <td>
                        <span class="badge bg-${worker.is_verified ? 'success' : 'warning'}">
                            ${worker.is_verified ? 'Verified' : 'Pending'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary view-verification-worker" data-worker-id="${worker.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!worker.is_verified ? `
                            <button class="btn btn-sm btn-success verify-worker" data-worker-id="${worker.id}">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-warning unverify-worker" data-worker-id="${worker.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Update the showing count text
        const showingStart = (page - 1) * limit + 1;
        const showingEnd = Math.min(page * limit, count);
        document.getElementById('showing-verifications-start').textContent = showingStart;
        document.getElementById('showing-verifications-end').textContent = showingEnd;
        document.getElementById('total-verifications').textContent = count;
        
        // Add event listeners
        addVerificationTableEventListeners();
    }
    
    function updateVerificationPagination(count, currentPage, limit) {
        const pagination = document.getElementById('verifications-pagination');
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
        document.querySelectorAll('#verifications-pagination .page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                if (!isNaN(page)) {
                    loadVerificationWorkers(page, getVerificationFilters());
                }
            });
        });
    }
    
    function addVerificationTableEventListeners() {
        // View worker buttons
        document.querySelectorAll('.view-verification-worker').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('View worker clicked for ID:', workerId);
                viewWorkerDetails(workerId);
            });
        });
        
        // Verify worker buttons
        document.querySelectorAll('.verify-worker').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('Verify worker clicked for ID:', workerId);
                verifyWorker(workerId);
            });
        });
        
        // Unverify worker buttons
        document.querySelectorAll('.unverify-worker').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function() {
                const workerId = this.getAttribute('data-worker-id');
                console.log('Unverify worker clicked for ID:', workerId);
                unverifyWorker(workerId);
            });
        });
    }
});