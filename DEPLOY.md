# Resource Requirement Definition, deployment

Frontend: static HTML in `public/`
Backend: Netlify Functions in `netlify/functions/`
Database: Netlify Blobs, no external service, no keys in the browser

## How access works

- Anyone with a valid email address plus the common access code can sign in
- Each email gets its own separate record in the database
- One admin code opens the Prowesstics view: the response register and Excel export
- The two codes are held as Netlify environment variables, never in the page source

## Deploy, one time

1. Create a GitHub repository and push these files, keeping the folder structure
2. On netlify.com, Add new site, Import an existing project, pick the repository
3. Build command: leave empty. Publish directory: `public`. Deploy
4. Site configuration, Environment variables, add three:

   | Key | Value |
   |---|---|
   | ACCESS_PIN | a four digit code |
   | ADMIN_PIN | a different four digit code |
   | TOKEN_SECRET | a long random string |

5. Deploys, Trigger deploy, Clear cache and deploy site

ADMIN_PIN must differ from ACCESS_PIN, otherwise every respondent sees every response.

## Changing the codes later

Edit the environment variable and redeploy. No code change.

## Endpoints

- `POST /api/auth` email and code, returns a signed session token valid 30 days
- `GET  /api/data?scope=me` the signed in person's own record
- `PUT  /api/data` saves the signed in person's record
- `GET  /api/data?scope=all` admin only, every record
- `GET  /api/export` admin only, Excel workbook of all responses
- `GET  /api/export?email=...` admin only, Excel workbook for one person

## The Excel file

Opens in Numbers, Excel and Sheets. Three kinds of sheet:

- Summary: one row per respondent with progress, submitted time and lock state
- All responses: every question and answer for everyone, with a filter row
- One sheet per respondent, their questions and answers alone
