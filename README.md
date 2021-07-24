# Calendly

This chrome extension was designed to help employees at my former company have quicker, more effecient access to their client data. 

The problem:
  * Customer Success Reps (CSR's) meet regularly with 7-10 clients daily.
  * Each client has multiple unique ID's representing their accounts in the software product, in multiple external software products with which the company product interacted via APIs, and in the CRM system.
  * For each client-facing call, CSRs locate the client email address in the calendar event and search the CRM. They then locate the needed account id's and use them to access the client's accounts.
  * This process was tedious and messy. 
 
 The opportunity:
  * All client calls were booked via Calendly, a third party booking platform.
  * This meant that client calls had a distinct signature in the outlook calendar, as Calendly events all add common boilerplate text to the calendar event.
  * The above workflow could be automated.
  
 Solution
  * This chrome extension with the following features:
    ** Authenticates using Oauth to have access to Outlook API.
    ** Queries CSR calendar to render all CSR client events in a given day.
    ** Also allows for users to 'pin' a specific customer in a separate tab so that their client details persist beyond the calendar day of their call.
    
 Challenges:
  * The CRM did not expose an API to non-admin users. Since this extension was a POC, I could not get admin access.
  * My solution: Use CORS request to scrape CRM website for account IDs.


NOTE: This chrome extension will not work for non-employees. 
