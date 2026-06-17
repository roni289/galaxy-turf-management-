import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Preset operators representing the 10 users using this system
const OPERATORS = [
  { id: 'op1', name: "Zayed Khan", role: "Senior Pitch Manager", color: "#10b981", avatar: "👨‍💼", active: true },
  { id: 'op2', name: "Maksudur Rahman", role: "Operations Lead", color: "#3b82f6", avatar: "⛹️", active: true },
  { id: 'op3', name: "Arif Ahmed", role: "Desk Coordinator", color: "#f59e0b", avatar: "👨‍💻", active: true },
  { id: 'op4', name: "Tasnim Kabir", role: "Scheduler", color: "#ec4899", avatar: "👩‍💻", active: false },
  { id: 'op5', name: "Sayed Hasan", role: "Evening Host", color: "#a855f7", avatar: "🕴️", active: true },
  { id: 'op6', name: "Rony Chowdhury", role: "Facility Operator", color: "#14b8a6", avatar: "⚽", active: false },
  { id: 'op7', name: "Tahmina Sultana", role: "Reservations Agent", color: "#f43f5e", avatar: "👩‍💼", active: false },
  { id: 'op8', name: "Farhan Islam", role: "Duty Officer", color: "#06b6d4", avatar: "👮", active: false },
  { id: 'op9', name: "Jannatul Nayeem", role: "Events Coordinator", color: "#e11d48", avatar: "👩‍🎨", active: false },
  { id: 'op10', name: "Sajid Kamal", role: "Weekend Supervisor", color: "#84cc16", avatar: "🏟️", active: false }
];

interface LogActivity {
  id: string;
  operator: string;
  action: string;
  details: string;
  timestamp: string;
}

let serverBookings: any[] = [];
let serverCustomers: any[] = [];
let serverActivities: LogActivity[] = [];
let isSimulationActive = true;

const SERVER_STATE_FILE = path.join(process.cwd(), 'server_state.json');

const getRelativeDateStr = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function initServerDatabase() {
  try {
    if (fs.existsSync(SERVER_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(SERVER_STATE_FILE, 'utf-8'));
      serverBookings = data.bookings || [];
      serverCustomers = data.customers || [];
      serverActivities = data.activities || [];
      isSimulationActive = data.isSimulationActive !== undefined ? data.isSimulationActive : true;
    }
  } catch (err) {
    console.error("Failed to load server_state.json", err);
  }

  if (serverBookings.length === 0 || serverCustomers.length === 0) {
    // Seed initial users
    serverCustomers = [
      { id: 'c1', name: "Ahsan Habib", phone: "+8801712345678", email: "habib@gmail.com", preferredContactMethod: "WhatsApp", status: "Active", totalBookings: 8, totalSpent: 16000, lastBooking: getRelativeDateStr(-1) },
      { id: 'c2', name: "Arifur Rahman", phone: "+8801812345679", email: "arifur@gmail.com", preferredContactMethod: "Phone", status: "Active", totalBookings: 5, totalSpent: 10000, lastBooking: getRelativeDateStr(0) },
      { id: 'c3', name: "Tahmid Hasan", phone: "+8801912345680", email: "tahmid@gmail.com", preferredContactMethod: "WhatsApp", status: "Active", totalBookings: 12, totalSpent: 24000, lastBooking: getRelativeDateStr(0) },
      { id: 'c4', name: "Zayed Khan", phone: "+8801512345681", email: "zayed@gmail.com", preferredContactMethod: "WhatsApp", status: "Active", totalBookings: 2, totalSpent: 4000, lastBooking: getRelativeDateStr(-2) },
      { id: 'c5', name: "Sajid Ahmed", phone: "+8801612345682", email: "sajid@gmail.com", preferredContactMethod: "Email", status: "Active", totalBookings: 1, totalSpent: 2000, lastBooking: getRelativeDateStr(1) },
      { id: 'c6', name: "Imran Khan", phone: "+8801755667788", email: "imran@kings.com", preferredContactMethod: "WhatsApp", status: "Active", totalBookings: 6, totalSpent: 13000, lastBooking: getRelativeDateStr(1) },
      { id: 'c7', name: "Sonia Mirza", phone: "+8801899112233", email: "sonia@futsal.org", preferredContactMethod: "Phone", status: "Active", totalBookings: 4, totalSpent: 8400, lastBooking: getRelativeDateStr(2) }
    ];

    // Seed bookings across dynamic current timestamps
    serverBookings = [
      { id: 'b1', customerId: 'c1', customerName: "Ahsan Habib", customerPhone: "+8801712345678", teamName: "Old School United", date: getRelativeDateStr(-1), time: "04:30 - 06:00 PM", duration: "90 min", price: 2000, advance: 1000, status: "Completed", facility: "Premium Turf Arena (Pitch 1)" },
      { id: 'b2', customerId: 'c2', customerName: "Arifur Rahman", customerPhone: "+8801812345679", teamName: "Vikings Club", date: getRelativeDateStr(0), time: "07:30 - 09:00 PM", duration: "90 min", price: 2400, advance: 2400, status: "Confirmed", facility: "VIP Turf Pitch (Pitch 3)" },
      { id: 'b3', customerId: 'c3', customerName: "Tahmid Hasan", customerPhone: "+8801912345680", teamName: "Narayanganj Titans", date: getRelativeDateStr(0), time: "09:00 - 10:30 PM", duration: "90 min", price: 2400, advance: 1000, status: "Confirmed", facility: "Premium Turf Arena (Pitch 1)" },
      { id: 'b4', customerId: 'c4', customerName: "Zayed Khan", customerPhone: "+8801512345681", teamName: "Corporate Legends", date: getRelativeDateStr(-2), time: "06:00 - 07:30 PM", duration: "90 min", price: 2000, advance: 2000, status: "Completed", facility: "Galaxy Futsal Court (Pitch 2)" },
      { id: 'b5', customerId: 'c5', customerName: "Sajid Ahmed", customerPhone: "+8801612345682", teamName: "Basundhara Juniors", date: getRelativeDateStr(1), time: "03:00 - 04:30 PM", duration: "90 min", price: 2000, advance: 1000, status: "Confirmed", facility: "Premium Turf Arena (Pitch 1)" },
      { id: 'b6', customerId: 'c6', customerName: "Imran Khan", customerPhone: "+8801755667788", teamName: "Dhanmondi Warriors", date: getRelativeDateStr(0), time: "06:00 - 07:30 PM", duration: "90 min", price: 2400, advance: 0, status: "Pending", facility: "Premium Turf Arena (Pitch 1)" },
      { id: 'b7', customerId: 'c7', customerName: "Sonia Mirza", customerPhone: "+8801899112233", teamName: "Pioneer Queens", date: getRelativeDateStr(2), time: "07:30 - 09:00 PM", duration: "90 min", price: 2600, advance: 1500, status: "Confirmed", facility: "Galaxy Futsal Court (Pitch 2)" },
      { id: 'b8', customerId: 'c3', customerName: "Tahmid Hasan", customerPhone: "+8801912345680", teamName: "Narayanganj Titans", date: getRelativeDateStr(1), time: "09:00 - 10:30 PM", duration: "90 min", price: 2400, advance: 2400, status: "Confirmed", facility: "VIP Turf Pitch (Pitch 3)" },
      { id: 'b9', customerId: 'c1', customerName: "Ahsan Habib", customerPhone: "+8801712345678", teamName: "Old School United", date: getRelativeDateStr(0), time: "10:30 - 12:00 AM", duration: "90 min", price: 2000, advance: 0, status: "Pending", facility: "Premium Turf Arena (Pitch 1)" },
    ];

    serverActivities = [
      { id: 'log1', operator: "Arif Ahmed", action: "System Seed", details: "Initial bookings database seeded.", timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 'log2', operator: "Zayed Khan", action: "Approved Booking", details: "Confirmed slot for Vikings Club on Pitch 3.", timestamp: new Date(Date.now() - 1800000).toISOString() }
    ];

    saveServerDatabase();
  }
}

function saveServerDatabase() {
  try {
    fs.writeFileSync(SERVER_STATE_FILE, JSON.stringify({
      bookings: serverBookings,
      customers: serverCustomers,
      activities: serverActivities,
      isSimulationActive
    }, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to save server_state.json", err);
  }
}

function addActivityLog(operator: string, action: string, details: string) {
  const log: LogActivity = {
    id: 'log_' + Math.random().toString(36).substring(2, 9),
    operator,
    action,
    details,
    timestamp: new Date().toISOString()
  };
  serverActivities.unshift(log);
  if (serverActivities.length > 50) {
    serverActivities = serverActivities.slice(0, 50);
  }
  saveServerDatabase();
}

// Background Simulated Multi-User Activity Simulator
const runSimulationStep = () => {
  if (!isSimulationActive || serverBookings.length === 0) return;

  const simOperators = OPERATORS.filter(o => o.id !== 'op1'); // Pick any helper operator
  const operator = simOperators[Math.floor(Math.random() * simOperators.length)];
  
  const coin = Math.random();
  if (coin < 0.4) {
    // 1. ADD A SIMULATED BOOKING
    const randomTeamNum = Math.floor(Math.random() * 90) + 10;
    const teamName = `FC Vikings Jr #${randomTeamNum}`;
    const custName = `Sajidur Rahman #${randomTeamNum}`;
    const custPhone = `+8801700${String(randomTeamNum).padStart(5, '0')}`;
    const custId = 'sim_c_' + randomTeamNum;

    const targetDate = getRelativeDateStr(Math.random() < 0.65 ? 0 : 1);
    
    const facilities = [
      'Premium Turf Arena (Pitch 1)',
      'Galaxy Futsal Court (Pitch 2)',
      'VIP Turf Pitch (Pitch 3)'
    ];
    const facility = facilities[Math.floor(Math.random() * facilities.length)];

    const times = [
      '03:00 - 04:30 PM',
      '04:30 - 06:00 PM',
      '06:00 - 07:30 PM',
      '07:30 - 09:00 PM',
      '09:00 - 10:30 PM',
      '10:30 - 12:00 AM'
    ];
    const time = times[Math.floor(Math.random() * times.length)];

    // Ensure slot not duplicate
    const exists = serverBookings.find(b => b.date === targetDate && b.time === time && b.facility === facility && b.status !== 'Cancelled');
    if (!exists) {
      // Add Customer
      const newCust = {
        id: custId,
        name: custName,
        phone: custPhone,
        email: `${custName.toLowerCase().replace(/\s/g, '').replace(/#/g, '')}@gmail.com`,
        status: 'Active' as const,
        totalBookings: 1,
        totalSpent: 2200,
        lastBooking: targetDate,
        preferredContactMethod: 'WhatsApp' as const
      };
      
      const newBooking = {
        id: 'sim_b_' + Math.random().toString(36).substring(2, 9),
        customerId: custId,
        customerName: custName,
        customerPhone: custPhone,
        teamName,
        date: targetDate,
        time,
        duration: '90 min',
        price: 2400,
        advance: Math.random() < 0.5 ? 1000 : 0,
        status: Math.random() < 0.7 ? 'Confirmed' : 'Pending',
        facility
      };

      serverCustomers.push(newCust);
      serverBookings.push(newBooking);
      addActivityLog(operator.name, "Created Booking", `Live Booking: Reserved ${facility} at ${time} for ${teamName}.`);
      saveServerDatabase();
    }
  } else if (coin < 0.8) {
    // 2. CONFIRM/COMPLETE A BOOKING
    const pendingBookings = serverBookings.filter(b => b.status === 'Pending');
    if (pendingBookings.length > 0) {
      const bToUpdate = pendingBookings[Math.floor(Math.random() * pendingBookings.length)];
      bToUpdate.status = 'Confirmed';
      bToUpdate.advance = 1000;
      addActivityLog(operator.name, "Confirmed Booking", `Live Update: Confirmed reservation for ${bToUpdate.teamName || 'Customer'}.`);
      saveServerDatabase();
    } else {
      const confirmedBookings = serverBookings.filter(b => b.status === 'Confirmed');
      if (confirmedBookings.length > 0) {
        const bToUpdate = confirmedBookings[Math.floor(Math.random() * confirmedBookings.length)];
        bToUpdate.status = 'Completed';
        addActivityLog(operator.name, "Completed Booking", `Live Update: ${bToUpdate.teamName || 'Customer'} played & checked out.`);
        saveServerDatabase();
      }
    }
  } else {
    // 3. CANCEL A BOOKING
    const activeBookings = serverBookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending');
    if (activeBookings.length > 3) {
      const bToCancel = activeBookings[Math.floor(Math.random() * activeBookings.length)];
      bToCancel.status = 'Cancelled';
      addActivityLog(operator.name, "Cancelled Booking", `Live Cancel: Cancelled ${bToCancel.teamName || 'Customer'}'s slot.`);
      saveServerDatabase();
    }
  }
};

// Seed DB on compile load
initServerDatabase();

// Periodically run simulation steps
setInterval(runSimulationStep, 25000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(session({
    secret: 'galaxy-sports-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none'
    }
  }));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET,
    `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`
  );

  // Auth Routes
  app.get('/api/auth/google/url', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Google Drive integration is not configured in environment variables.' });
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/contacts.readonly'
      ],
      prompt: 'consent'
    });
    res.json({ url });
  });

  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      (req.session as any).tokens = tokens;
      
      res.send(`
        <html>
          <body style="background: #020617; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center;">
              <h2 style="color: #4ade80;">Success!</h2>
              <p>Google Drive connected. This window will close.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                  setTimeout(() => window.close(), 1500);
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/auth/status', async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) {
      return res.json({ connected: false });
    }
    try {
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      res.json({ connected: true, user: userInfo.data });
    } catch (error) {
      console.error('Error fetching user info:', error);
      res.json({ connected: true, error: 'Failed to fetch user info' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Drive Data Routes
  app.post('/api/drive/save', async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    try {
      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const fileName = 'galaxy_sports_data.json';
      
      // Search for the file
      const response = await drive.files.list({
        q: `name = '${fileName}' and trashed = false`,
        spaces: 'drive',
        fields: 'files(id, name)'
      });

      const file = response.data.files?.[0];
      const media = {
        mimeType: 'application/json',
        body: JSON.stringify(req.body)
      };

      if (file) {
        // Update existing
        await drive.files.update({
          fileId: file.id as string,
          media: media
        });
      } else {
        // Create new
        await drive.files.create({
          requestBody: {
            name: fileName,
            mimeType: 'application/json'
          },
          media: media
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Drive save error:', error);
      res.status(500).json({ error: 'Failed to save to Drive' });
    }
  });

  app.get('/api/drive/load', async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    try {
      oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const fileName = 'galaxy_sports_data.json';
      const response = await drive.files.list({
        q: `name = '${fileName}' and trashed = false`,
        spaces: 'drive',
        fields: 'files(id, name)'
      });

      const file = response.data.files?.[0];
      if (!file) {
        return res.status(404).json({ error: 'Data file not found in Drive' });
      }

      const fileContent = await drive.files.get({
        fileId: file.id as string,
        alt: 'media'
      });

      res.json(fileContent.data);
    } catch (error) {
      console.error('Drive load error:', error);
      res.status(500).json({ error: 'Failed to load from Drive' });
    }
  });

  app.get('/api/contacts', async (req, res) => {
    const tokens = (req.session as any).tokens;
    if (!tokens) return res.status(401).json({ error: 'Not authenticated' });

    try {
      oauth2Client.setCredentials(tokens);
      const people = google.people({ version: 'v1', auth: oauth2Client });
      
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 150,
        personFields: 'names,phoneNumbers,emailAddresses,photos'
      });

      const connections = response.data.connections || [];
      const contacts = connections.map(person => {
        const name = person.names?.[0]?.displayName || 'Unnamed Contact';
        const phone = person.phoneNumbers?.[0]?.value || '';
        const email = person.emailAddresses?.[0]?.value || '';
        const photo = person.photos?.[0]?.url || '';
        return { name, phone, email, photo };
      }).filter(c => c.name !== 'Unnamed Contact' || c.phone);

      res.json({ contacts });
    } catch (error) {
      console.error('People API error:', error);
      res.status(500).json({ error: 'Failed to fetch contacts from Google' });
    }
  });

  app.post('/api/predict-demand', async (req, res) => {
    try {
      const { bookings } = req.body;
      if (!Array.isArray(bookings)) {
        return res.status(400).json({ error: 'Bookings array is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: 'No API Key Found',
          details: 'GEMINI_API_KEY environment variable is missing. Please add it in Settings > Secrets to enable AI Predictions.' 
        });
      }

      const client = getGeminiClient();

      const totalCount = bookings.length;
      const facilitiesSummary: Record<string, number> = {};
      const daySummary: Record<string, number> = {};
      const timeSummary: Record<string, number> = {};
      const statusSummary: Record<string, number> = {};

      bookings.forEach((b: any) => {
        const fac = b.facility || 'Pitch 1';
        facilitiesSummary[fac] = (facilitiesSummary[fac] || 0) + 1;
        statusSummary[b.status] = (statusSummary[b.status] || 0) + 1;
        
        try {
          const dateObj = new Date(b.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
          daySummary[dayName] = (daySummary[dayName] || 0) + 1;
        } catch (_) {}

        const bTime = (b.time || '').toLowerCase();
        let timePeriod = 'Other';
        if (bTime.includes('am')) {
          timePeriod = 'Morning (6am - 12pm)';
        } else if (bTime.includes('pm')) {
          const hr = parseInt(bTime) || 12;
          if (hr >= 1 && hr <= 3) {
            timePeriod = 'Afternoon (1pm - 3pm)';
          } else if (hr >= 4 && hr <= 6) {
            timePeriod = 'Late Afternoon (4pm - 6pm)';
          } else if (hr >= 7 && hr <= 9) {
            timePeriod = 'Evening Prime (7pm - 9pm)';
          } else if (hr >= 10 || hr === 12) {
            timePeriod = 'Late Night (10pm - 1am)';
          }
        }
        timeSummary[timePeriod] = (timeSummary[timePeriod] || 0) + 1;
      });

      const summaryText = `
        Facility Booking Stats Summarized:
        - Total Bookings Analyzed: ${totalCount}
        - Facilities Occupancy Counts: ${JSON.stringify(facilitiesSummary)}
        - Day-of-Week Distribution: ${JSON.stringify(daySummary)}
        - Time-of-Day Distribution: ${JSON.stringify(timeSummary)}
        - Booking Status Ratios: ${JSON.stringify(statusSummary)}
        
        Recent raw sample logs:
        ${JSON.stringify(bookings.slice(0, 30).map((b: any) => ({
          facility: b.facility,
          date: b.date,
          day: new Date(b.date).toLocaleDateString('en-US', { weekday: 'short' }),
          time: b.time,
          price: b.price,
          status: b.status
        })))}
      `;

      const promptMsg = `You are an expert sports venue revenue optimizer. Analyze the following facility occupancy data and generate a demand predictor report with optimal pricing changes to maximize venue yields.
      Data:
      ${summaryText}

      Determine the predicted demand levels and suggest pricing adjustments. Return predictions for multiple slot categories like weekend prime times, early weekdays, late evenings, etc. Feel free to recommend specific increases (positive percentage) for super busy slots or discounts (negative percentage) for unpopular times.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptMsg,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallDemandTrend: { type: Type.STRING, description: "A high-level summary of the demand trends identified from the booking logs." },
              generalStrategy: { type: Type.STRING, description: "Actionable strategy recommendation to increase overall capacity utilization." },
              estimatedRevenueBoostPercent: { type: Type.NUMBER, description: "Expected % increase in revenue if recommended changes are done." },
              predictions: {
                type: Type.ARRAY,
                description: "List of time-slot predictions and pricing changes.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    slot: { type: Type.STRING, description: "Specific slot name, e.g. 'Friday & Saturday Prime (4pm-9pm)' or 'Weekday Mornings'." },
                    demandLevel: { type: Type.STRING, description: "Predicted demand: Low, Medium, High, or Very High." },
                    reasoning: { type: Type.STRING, description: "Short human-like reasoning explaining this demand forecast." },
                    recommendedAction: { type: Type.STRING, description: "E.g., Maintain, Apply Surge Pricing, or Offer Discount." },
                    suggestedAdjustmentPercent: { type: Type.INTEGER, description: "Suggested percentage change (e.g. 15 for a +15% surge, -20 for a -20% discount)." }
                  },
                  required: ["slot", "demandLevel", "reasoning", "recommendedAction", "suggestedAdjustmentPercent"]
                }
              }
            },
            required: ["overallDemandTrend", "generalStrategy", "estimatedRevenueBoostPercent", "predictions"]
          }
        }
      });

      const parsedData = JSON.parse(response.text || '{}');
      res.json(parsedData);
    } catch (error: any) {
      console.error('Demand Predictor Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to generate demand prediction' });
    }
  });

  // --- SHARED MULTI-USER SYNC ENDPOINTS ---
  app.get('/api/bookings', (req, res) => {
    res.json(serverBookings);
  });

  app.post('/api/bookings', (req, res) => {
    const { booking, operatorName } = req.body;
    if (!booking) return res.status(400).json({ error: 'No booking details provided' });
    
    // Server-side generate ID if not supplied
    if (!booking.id) {
      booking.id = 'b_' + Math.random().toString(36).substring(2, 9);
    }
    
    serverBookings.push(booking);
    
    // Find customer or add
    let cust = serverCustomers.find(c => c.phone === booking.customerPhone);
    if (!cust) {
      cust = {
        id: booking.customerId || 'c_' + Math.random().toString(36).substring(2, 9),
        name: booking.customerName,
        phone: booking.customerPhone,
        email: `${booking.customerName.toLowerCase().replace(/\s/g, '').replace(/#/g, '')}@gmail.com`,
        status: 'Active',
        totalBookings: 1,
        totalSpent: Number(booking.price) || 2000,
        lastBooking: booking.date,
        preferredContactMethod: 'WhatsApp'
      };
      serverCustomers.push(cust);
    } else {
      cust.totalBookings = (Number(cust.totalBookings) || 0) + 1;
      cust.totalSpent = (Number(cust.totalSpent) || 0) + (Number(booking.price) || 2000);
      cust.lastBooking = booking.date;
    }

    const op = operatorName || 'Zayed Khan';
    addActivityLog(op, "Created Booking", `Reserved ${booking.facility || 'Pitch'} at ${booking.time} for ${booking.teamName}`);
    saveServerDatabase();
    res.json({ success: true, booking, customers: serverCustomers });
  });

  app.put('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { booking, operatorName } = req.body;
    
    const idx = serverBookings.findIndex(b => b.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Booking not found' });
    
    const oldStatus = serverBookings[idx].status;
    serverBookings[idx] = { ...serverBookings[idx], ...booking };
    
    const op = operatorName || 'Zayed Khan';
    let actionDesc = "Updated Booking";
    if (oldStatus !== booking.status) {
      actionDesc = `${booking.status} Booking`;
    }
    addActivityLog(op, actionDesc, `Updated slot for ${booking.teamName} to ${booking.status}`);
    saveServerDatabase();
    res.json({ success: true, booking: serverBookings[idx], customers: serverCustomers });
  });

  app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    const { operatorName } = req.body || {};
    
    const idx = serverBookings.findIndex(b => b.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Booking not found' });
    
    const deleted = serverBookings.splice(idx, 1)[0];
    const op = operatorName || 'Zayed Khan';
    addActivityLog(op, "Deleted Booking", `Removed booking of ${deleted.teamName} (${deleted.facility})`);
    saveServerDatabase();
    res.json({ success: true });
  });

  app.get('/api/customers', (req, res) => {
    res.json(serverCustomers);
  });

  app.post('/api/customers', (req, res) => {
    const { customer } = req.body;
    if (!customer) return res.status(400).json({ error: 'No customer details provided' });
    
    if (!customer.id) {
      customer.id = 'c_' + Math.random().toString(36).substring(2, 9);
    }
    
    serverCustomers.push(customer);
    saveServerDatabase();
    res.json({ success: true, customer });
  });

  app.put('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const { customer } = req.body;
    
    const idx = serverCustomers.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
    
    serverCustomers[idx] = { ...serverCustomers[idx], ...customer };
    saveServerDatabase();
    res.json({ success: true, customer: serverCustomers[idx] });
  });

  app.delete('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const idx = serverCustomers.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
    serverCustomers.splice(idx, 1);
    saveServerDatabase();
    res.json({ success: true });
  });

  app.get('/api/operators', (req, res) => {
    res.json(OPERATORS);
  });

  app.get('/api/activities', (req, res) => {
    res.json(serverActivities);
  });

  app.get('/api/simulation/status', (req, res) => {
    res.json({ isSimulationActive });
  });

  app.post('/api/simulation/toggle', (req, res) => {
    isSimulationActive = !isSimulationActive;
    saveServerDatabase();
    res.json({ isSimulationActive });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
