# Quike Admin Panel Deployment Guide

This guide provides step-by-step instructions to deploy the Quike Admin Panel to your environment.

## Prerequisites

- Access to the Supabase project at `https://xkpjlylyboakaobkqyyb.supabase.co`
- Admin access to the Supabase SQL Editor
- A web server or hosting platform to host the admin panel files

## Deployment Steps

### 1. Deploy Database Policies and Functions

1. Log in to the Supabase dashboard and navigate to your project
2. Go to the SQL Editor
3. Copy the contents of `webquike/src/rls_policies.sql` and paste it into the SQL Editor
4. Execute the SQL to create the necessary policies and functions
5. If you encounter any errors, check the log output for details

### 2. Create an Admin User

1. While still in the SQL Editor, open a new query tab
2. Copy the contents of `webquike/src/deploy_admin.sql` and paste it
3. Review and modify the admin credentials as needed (change the email and password)
4. Execute the SQL to create the admin user
5. Verify that the admin user was created by checking the query results

### 3. Deploy the Web Application

#### Option 1: Deploy to a Static Web Host (Recommended)

1. Upload all files from the `webquike` directory to your web hosting service
2. Ensure that your hosting service is configured to serve the files correctly
3. The main application will be at `/public/index.html`

#### Option 2: Run Locally for Testing

1. Navigate to the `webquike` directory
2. Install a simple HTTP server such as `http-server` via npm:
   ```
   npm install -g http-server
   ```
3. Start the server:
   ```
   http-server
   ```
4. Access the admin panel at `http://localhost:8080/public/index.html`

### 4. Test the Deployment

1. Navigate to the login page (`login.html`)
2. Log in with the admin credentials you created earlier (default: admin@quike.com / admin123)
3. Verify that you can access the dashboard and view/edit data
4. Test various functionality to ensure everything is working correctly

## Supabase Configuration

- Supabase URL: `https://xkpjlylyboakaobkqyyb.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcGpseWx5Ym9ha2FvYmtxeXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NjE4MDgsImV4cCI6MjA2MTMzNzgwOH0.MVO7Cm0LQ140K43I1RhqVGjW7AasOq4O7RcPM3Jlqkc`

These values are already configured in the application files. If you need to change them for any reason, update them in:
- `assets/js/admin.js`
- JavaScript sections of all HTML files in the `public` directory

## Troubleshooting

If you encounter any issues during deployment:

1. **Database Policy Errors**
   - Verify that all tables mentioned in the RLS policies exist in your database
   - Check for syntax errors in the SQL
   - Ensure you have the necessary permissions to create policies

2. **Authentication Issues**
   - Verify that the Supabase URL and anon key are correct
   - Ensure the admin user was created correctly in both `auth.users` and `public.user` tables
   - Check that the `raw_user_meta_data->>'role'` is set to 'admin'

3. **Application Not Loading**
   - Check your browser's console for JavaScript errors
   - Verify that all files are correctly uploaded to your web host
   - Ensure your web host is configured to serve static files

4. **Unable to Access Certain Features**
   - Verify that the Row Level Security (RLS) policies are correctly applied
   - Check the Supabase logs for any permissions errors
   - Ensure your admin user has the correct role assigned

## Support

For any issues or questions regarding the deployment, please contact the Quike development team. 