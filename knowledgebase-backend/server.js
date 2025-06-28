// --- Backend Server for Knowledge Base SaaS ---
// This server acts as a secure proxy to handle API requests to third-party services.
// It requires Node.js and the following packages: express, cors, axios, cheerio

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio'); // For parsing HTML from URLs

const app = express();
const port = 3001; // Port for the backend server

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing for your frontend
app.use(express.json()); // Allow the server to parse JSON request bodies

// --- --- --- --- --- --- --- --- --- --- --- ---
// ---         1. URL Scraping Endpoint        ---
// --- --- --- --- --- --- --- --- --- --- --- ---
// This endpoint takes a URL, fetches its HTML content, extracts the text,
// and returns it to the frontend.

app.post('/api/scrape-url', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Fetch the HTML content of the provided URL
        const { data } = await axios.get(url, {
             headers: {
                // Pretend to be a browser to avoid simple bot detection
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // Use cheerio to load the HTML and extract text content
        const $ = cheerio.load(data);
        // Remove script and style tags to clean up the text
        $('script, style').remove();
        const textContent = $('body').text().replace(/\s\s+/g, ' ').trim();

        // Return the extracted text content
        res.json({ content: textContent });

    } catch (error) {
        console.error('Scraping error:', error.message);
        res.status(500).json({ error: 'Failed to fetch or process the URL.' });
    }
});


// --- --- --- --- --- --- --- --- --- --- --- ---
// ---          2. Jira API Endpoint           ---
// --- --- --- --- --- --- --- --- --- --- --- ---
// Fetches ticket data from the Jira API.
// Credentials are sent from the frontend and used here on the server.

app.post('/api/fetch-jira', async (req, res) => {
    const { domain, email, token, jqlQuery } = req.body; // jqlQuery is the search query

    if (!domain || !email || !token || !jqlQuery) {
        return res.status(400).json({ error: 'Jira domain, email, token, and JQL query are required.' });
    }
    
    // Create the Basic Auth header required by Jira
    const encodedToken = Buffer.from(`${email}:${token}`).toString('base64');
    const jiraApiUrl = `https://${domain}/rest/api/3/search`;

    try {
        const response = await axios.post(jiraApiUrl, 
            { jql: jqlQuery, fields: ["summary", "description", "comment", "status"] },
            { headers: { 'Authorization': `Basic ${encodedToken}`, 'Accept': 'application/json' } }
        );

        // Process the ticket data into a single text block
        const tickets = response.data.issues;
        const combinedText = tickets.map(ticket => {
            const comments = ticket.fields.comment.comments.map(c => c.body.content[0].content[0].text).join('\n');
            const description = ticket.fields.description?.content[0]?.content[0]?.text || "No description.";
            return `Ticket: ${ticket.key}\nSummary: ${ticket.fields.summary}\nStatus: ${ticket.fields.status.name}\nDescription: ${description}\nComments:\n${comments}\n---`;
        }).join('\n\n');

        res.json({ content: combinedText });

    } catch (error) {
        console.error('Jira API error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch data from Jira. Check credentials and JQL query.' });
    }
});


// --- --- --- --- --- --- --- --- --- --- --- ---
// ---         3. Zendesk API Endpoint         ---
// --- --- --- --- --- --- --- --- --- --- --- ---
// Fetches solved ticket data from the Zendesk API.

app.post('/api/fetch-zendesk', async (req, res) => {
    const { subdomain, email, token } = req.body;

    if (!subdomain || !email || !token) {
        return res.status(400).json({ error: 'Zendesk subdomain, email, and token are required.' });
    }

    // Zendesk uses a slightly different auth format
    const encodedToken = Buffer.from(`${email}/token:${token}`).toString('base64');
    // We'll search for solved tickets created in the last 30 days as an example
    const zendeskApiUrl = `https://${subdomain}.zendesk.com/api/v2/search.json?query=type:ticket status:solved`;

    try {
        const response = await axios.get(zendeskApiUrl, {
            headers: { 'Authorization': `Basic ${encodedToken}` }
        });

        // Process the ticket data into a single text block
        const tickets = response.data.results;
        const combinedText = tickets.map(ticket => {
            return `Zendesk Ticket #${ticket.id}\nSubject: ${ticket.subject}\nDescription:\n${ticket.description}\n---`;
        }).join('\n\n');

        res.json({ content: combinedText });

    } catch (error) {
        console.error('Zendesk API error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch data from Zendesk. Check credentials.' });
    }
});


// --- Server Start ---
app.listen(port, () => {
    console.log(`Knowledge Base backend server listening at http://localhost:${port}`);
});
