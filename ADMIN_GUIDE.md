# Admin Panel Guide

## Setup

Add your admin password to the `.env` file in the server directory:

```env
ADMIN_PASSWORD=your_secure_password_here
```

If not set, the default password is `admin123` (not recommended for production).

## Accessing the Admin Panel

1. Navigate to `/admin` in your browser (e.g., `http://localhost:5173/admin` or `https://yourdomain.com/admin`)
2. Enter your admin password
3. The password is stored in your session, so you won't need to re-enter it until you logout

## Features

### Dashboard Stats
- **Total Rates**: Total number of rates in the database
- **Community Rates**: Rates submitted by users
- **Scraped Rates**: Rates from web scraping
- **Reported Rates**: Rates that have been flagged as incorrect

### Filtering & Sorting
- Filter by data source (All, Community, Scraped, API)
- Filter by account type (Savings, Checking, CD, Money Market)
- Sort by: Highest APY, Newest, Oldest, Most Reported

### Actions

#### Single Delete
- Click the trash icon next to any rate to delete it
- Confirmation prompt will appear before deletion

#### Bulk Delete
1. Select multiple rates using the checkboxes
2. Click "Select All" to select all visible rates
3. Click "Delete X Selected" to remove all selected rates
4. Confirmation prompt will appear before deletion

### Reported Rates
Rates with more than 2 reports are highlighted in red for easy identification.

## API Endpoints

The admin panel uses these protected endpoints:

- `GET /api/admin/stats` - Get database statistics
- `GET /api/admin/rates` - Get all rates with filtering
- `DELETE /api/admin/rates/:id` - Delete a single rate
- `PATCH /api/admin/rates/:id` - Update a rate (not yet in UI)
- `POST /api/admin/rates/bulk-delete` - Delete multiple rates

All endpoints require the `x-admin-password` header with your admin password.

## Security Notes

1. **Change the default password** in production
2. Consider using a strong, randomly generated password
3. The password is transmitted in headers (use HTTPS in production)
4. Session storage keeps you logged in within the same browser session
5. No user accounts - single admin password model

## Future Enhancements

Potential improvements:
- Edit rates directly from the admin panel
- Export data to CSV
- View rate history/changes
- Multiple admin accounts with different permissions
- Two-factor authentication
