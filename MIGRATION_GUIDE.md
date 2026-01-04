# Migration Guide (Google Sheets -> LawnCare CRM)

This guide walks you through moving customers from Google Sheets into the CRM using the CSV import/export tools.

## Before You Start
- Confirm you are an admin user (imports are admin-only).
- Back up your current customers (see the rollback section below).

## Step 1: Get the CSV Template
1. Go to **Customers**.
2. Click **Import / Export**.
3. Use **Download Template** (or **Download CSV** if you already have data in the CRM).


## Step 2: Prepare Your Spreadsheet
Use the template headers exactly. Required columns are marked below.

Required columns:
- `Name`
- `Address`

Optional columns:
- `Type` (Residential, Commercial, Workshop)
- `Cost`
- `Day` (Monday-Sunday, or leave blank for Unscheduled)
- `Order` (route order integer)
- `Distance from shop_km`
- `distance_from_shop_miles`
- `Additional Work` (Yes/No)
- `Additional Work cost`
- `Phone`
- `Email`
- `Latitude`
- `Longitude`

If you use Google Sheets, export as **CSV** before importing.

## Step 3: Import
1. In **Customers**, click **Import / Export**.
2. Select your CSV file.
3. Map fields if needed.
4. Run **Dry Run** to preview errors.
5. Click **Import Customers**.

Duplicates are detected by **Name + Address**. You can choose to skip or keep duplicates.

## Optional: Google Sheets Connection
If you want a live connection instead of CSV exports, go to Customers -> Import / Export -> Google Sheets, connect via OAuth, and load a sheet by URL/ID. Tokens are stored in Supabase Vault.

## Workshop and Unscheduled Rules
- **Type**: `Workshop` is a valid customer type.
- **Day**: Leave blank for **Unscheduled**. `Workshop` is not a service day.

## Geocoding and Addresses
- The CRM geocodes addresses to place customers on maps and calculate distances.
- Use full, valid street addresses (street, city, state, zip).
- If a record fails to map, update the address and save again in the CRM.
- You can also re-run the geocoding script in `scripts/geocode-customers.js`.

## Rollback Plan
1. Before importing, **Export CSV** and save it as a backup.
2. If the import is incorrect, delete the newly imported customers and re-import from the backup.

## CSV Header Example
```
Name,Address,Type,Cost,Day,Order,Distance from shop_km,distance_from_shop_miles,Additional Work,Additional Work cost,Phone,Email,Latitude,Longitude
```
