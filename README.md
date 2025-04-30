# Quike Web App

This is the web admin panel for the Quike Home Service application. The web interface allows administrators to manage users, workers, bookings, and other aspects of the Quike platform.

## Features

- Admin authentication
- Dashboard with key statistics
- Worker management (view, verify, edit, delete)
- User management
- Booking management
- Worker verification process

## Setup Instructions

1. **Clone the repository**

```bash
git clone <repository-url>
cd quike_home_service/webquike
```

2. **Local Development**

You can run the web app locally with any simple HTTP server. Here are a few options:

**Using Python:**
```bash
# If you have Python 3 installed
python -m http.server 8000

# If you have Python 2 installed
python -m SimpleHTTPServer 8000
```

**Using Node.js (with npm):**
```bash
# Install a simple HTTP server globally
npm install -g http-server

# Run the server
http-server -p 8000
```

3. **Access the application**

Open your web browser and navigate to:
```
http://localhost:8000/public/login.html
```

4. **Login Credentials**

For development purposes, you can use the following admin credentials:
- Email: admin@quike.com
- Password: admin123

## Project Structure

- `/public` - HTML files for the web pages
- `/assets` - Static resources
  - `/js` - JavaScript files
  - `/css` - CSS stylesheets
  - `/images` - Image resources
- `/src` - SQL scripts for Supabase setup

## Database Configuration

This application uses Supabase as the backend database. The Supabase configuration is handled in the JavaScript files with the following details:

- Supabase URL: https://xkpjlylyboakaobkqyyb.supabase.co
- Supabase Key: Public anon key (already configured in the code)

## Pages

1. **Login** - `/public/login.html`
   - Admin authentication

2. **Dashboard** - `/public/index.html`
   - Overview of the platform stats
   - Recent bookings
   - Pending verifications

3. **Workers** - `/public/workers.html`
   - List and manage workers
   - Filter and search functionality
   - Verify workers
   - View detailed worker information

4. **Users** - (Coming soon)
   - Manage user accounts

5. **Bookings** - (Coming soon)
   - View and manage service bookings

## Deployment

For deployment instructions, please see [DEPLOYMENT.md](DEPLOYMENT.md)

## Security Notes

- This is a development environment setup
- For production, ensure all credentials are secured properly
- Update Supabase permissions and security rules for production use

## License

This project is proprietary and part of the Quike Home Service application ecosystem.

## Contact

For support or inquiries, please contact the Quike development team. 