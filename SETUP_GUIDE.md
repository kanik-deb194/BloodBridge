# BloodBridge Authentication System Setup Guide

## Overview
This guide explains how to set up and use the three-role authentication system for BloodBridge (Admin, User, and Blood Bank).

---

## Files Created/Updated

### New Files
- **login.php** - Main authentication handler
- **database_schema.sql** - Database tables and structure
- **SETUP_GUIDE.md** - This file

### Updated Files
- **login.html** - Updated form action to POST to login.php
- **login.js** - Updated to handle AJAX requests and role-based responses
- **login.css** - Added styles for error/success messages

---

## Database Setup

### 1. Create Database
Execute the SQL commands in `database_schema.sql`:

```sql
-- Run all commands in database_schema.sql
-- This will create:
-- - bloodbridge database
-- - admin table
-- - users table
-- - blood_bank table
```

### 2. Update Connection Settings
Edit `login.php` and update these lines with your database credentials:

```php
$db_host = 'localhost';      // Your MySQL host
$db_username = 'root';       // Your MySQL username
$db_password = '';           // Your MySQL password
$db_name = 'bloodbridge';    // Database name
```

### 3. Add Test Data
You can insert sample records using:

```bash
# Via MySQL command line
mysql -u root -p bloodbridge < database_schema.sql

# Or use phpMyAdmin to manually insert data
```

---

## Password Hash Generation

**Important**: Passwords are stored as bcrypt hashes for security.

### Generate Hashes (Use PHP CLI or online tool)

```php
<?php
// Generate a bcrypt hash
$password = "your_password_here";
$hash = password_hash($password, PASSWORD_BCRYPT);
echo $hash;
?>
```

### Example Hashes (for testing ONLY)
Replace the sample hashes in `database_schema.sql` with actual hashes.

---

## How the Login System Works

### 1. User Selects Role
- Admin
- User
- Blood Bank

### 2. Enters Credentials
- User ID (or Email)
- Password

### 3. Form Submission
- Form submits to `login.php` via POST
- `login.php` receives: userid, password, role
- Queries appropriate table based on role

### 4. Credential Validation

#### Admin Login
- Queries: `admin` table
- Checks: id or email + password_hash
- Success: Redirects to `admindash.html`
- Failure: Shows error message

#### User Login
- Queries: `users` table
- Checks: id or email + password_hash
- Additional Validation:
  - Email must be verified
  - Account status must be 'active'
- Success: Redirects to `userdash.html`
- Failure: Shows error message

#### Blood Bank Login
- Queries: `blood_bank` table
- Checks: id or email + password_hash
- Additional Validation:
  - Account status must be 'active'
- Success: Redirects to `bankdash.html`
- Failure: Shows error message

### 5. Session Management
On successful login, PHP sets session variables:
```php
$_SESSION['user_id']      // Unique identifier
$_SESSION['user_email']   // Email address
$_SESSION['user_name']    // Full name
$_SESSION['user_role']    // Role (admin/user/blood-bank)
$_SESSION['login_time']   // Login timestamp
```

---

## Error Handling

### Error Messages

| Scenario | Message |
|----------|---------|
| Empty fields | "User ID, password, and role are required." |
| Invalid role | "Invalid role selected." |
| No matching credentials | "Admin/User/Blood Bank credentials not found in database." |
| Wrong password | "Invalid password for admin/user/blood bank account." |
| Email not verified | "Please verify your email before logging in." (Users only) |
| Inactive account | "Your account is not active. Please contact support." |
| Database error | "Database connection failed: [error details]" |

### UI Feedback

- **Error Messages**: Red background with ✕ icon, auto-dismiss after 5 seconds
- **Success Messages**: Green background with ✓ icon
- **Submit Button**: Shows "Logging in..." state during processing

---

## Frontend Validation (login.js)

The form validates:
1. ✓ User ID is not empty
2. ✓ Password is not empty
3. ✓ Password is at least 6 characters
4. ✓ A login role is selected

---

## Security Features

### In login.php
- ✓ Prepared statements (prevent SQL injection)
- ✓ Password verification using `password_verify()`
- ✓ Session management
- ✓ Input sanitization with `trim()`
- ✓ Error responses in JSON format (no sensitive data exposed)

### Recommendations
- [ ] Use HTTPS in production
- [ ] Implement rate limiting to prevent brute force attacks
- [ ] Add CSRF token validation
- [ ] Implement password strength requirements
- [ ] Add audit logging for failed login attempts
- [ ] Implement 2FA (Two-Factor Authentication)

---

## Testing the System

### Test Cases

#### Test 1: Admin Login ✓
1. Select "Login as: Admin"
2. Enter: userid = "admin@bloodbridge.com", password = "admin123"
3. Expected: Redirects to `admindash.html`

#### Test 2: User Login ✓
1. Select "Login as: User"
2. Enter: userid = "user@bloodbridge.com", password = "user123"
3. Expected: Redirects to `userdash.html`

#### Test 3: Blood Bank Login ✓
1. Select "Login as: Blood Bank"
2. Enter: userid = "bank@bloodbridge.com", password = "bank123"
3. Expected: Redirects to `bankdash.html`

#### Test 4: Wrong Credentials
1. Select any role
2. Enter: Invalid userid or wrong password
3. Expected: Error message displays

#### Test 5: Role Mismatch Error
1. Select "Login as: Admin"
2. Enter: User credentials
3. Expected: "Admin credentials not found in database." error

#### Test 6: Missing Fields
1. Leave fields empty
2. Click Login
3. Expected: "Please fill all fields." message

---

## File Structure

```
d:\Figma\
├── login.html              (Updated - Form action changed)
├── login.css               (Updated - Added message styles)
├── login.js                (Updated - AJAX handling & role validation)
├── login.php               (NEW - Main authentication logic)
├── admindash.html          (Existing - Admin dashboard redirect)
├── userdash.html           (Expected - User dashboard redirect)
├── bankdash.html           (Expected - Blood bank dashboard redirect)
├── database_schema.sql     (NEW - Database setup)
└── SETUP_GUIDE.md          (NEW - This file)
```

---

## Next Steps

### 1. Create Dashboard Pages
You need to create:
- [ ] `userdash.html` - User dashboard
- [ ] `bankdash.html` - Blood bank dashboard

### 2. Implement Session Validation
Add this code to the top of each dashboard:
```php
<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: login.html');
    exit;
}
// Now access $_SESSION variables
echo "Welcome, " . $_SESSION['user_name'];
?>
```

### 3. Create Logout Handler
Create `logout.php`:
```php
<?php
session_start();
session_destroy();
header('Location: login.html');
exit;
?>
```

### 4. Add Password Reset Feature
Implement password reset functionality (email verification, token generation, etc.)

### 5. Implement Remember Me
Add persistent session/cookie functionality

---

## Troubleshooting

### "Database connection failed"
- Check if MySQL is running
- Verify database credentials in `login.php`
- Ensure `bloodbridge` database exists

### "Invalid password for [role] account"
- Verify the password hash in database
- Re-generate hash using `password_hash()`
- Check if password is correct in test data

### "Credentials not found in database"
- Verify user exists in correct table
- Check if table name matches in SQL query
- Ensure userid/email matches exactly

### No redirect after login
- Check browser console for JavaScript errors
- Verify redirect files exist (`admindash.html`, etc.)
- Check if AJAX response is valid JSON

### CSRF/Session Issues
- Clear browser cookies
- Clear session files in `php_sessions` directory
- Restart PHP-FPM or Apache

---

## Support & Maintenance

- **Passwords**: Store securely using bcrypt (`PASSWORD_BCRYPT`)
- **Database**: Regular backups recommended
- **Logs**: Monitor PHP error logs for issues
- **Security**: Review and update security measures quarterly

---

Generated: 2026-05-07
Version: 1.0
Status: Ready for Integration
