# Skikda Road Reports - Backend Connected

This version connects the Arabic frontend to Supabase PostgreSQL.

## Included files

- `index.html` - updated frontend connected to Supabase
- `style.css` - responsive Arabic RTL styling
- `images/skikda-banner.jpg` - city image for hero background

## Supabase settings used

- Project URL: `https://xhgjmqyjbtnbdxvronhs.supabase.co`
- Publishable key: configured in `index.html`
- Table name: `reports`

## Required Supabase table columns

The table `reports` should contain:

- `report_id` text
- `issue_type` text
- `location` text
- `description` text
- `status` text
- `created_at` timestamptz default now()

## Required RLS policies

You already created:

- Allow public inserts - INSERT - anon
- Allow public select - SELECT - anon

## GitHub upload

Upload these directly to the repository root:

- `index.html`
- `style.css`
- `images/`
- `README.md`
