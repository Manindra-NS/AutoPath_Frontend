# AutoPath (কলকাতা অটো রুট) — Frontend Application

AutoPath is a modern, responsive web application for discovering shared auto-rickshaw stands, routes, union-regulated fares, and intermediate drop-off points across Kolkata, India.

> [!IMPORTANT]
> **ARCHITECTURE DECISION: FRONTEND-ONLY REPOSITORY**
> 
> The AutoPath project follows a decoupled, multi-repository architecture. This repository contains the **Frontend Application ONLY**. The backend server, database schemas, and data pipelines reside in an independent repository.
> 
> A clean service abstraction layer (`src/services/`) connects this frontend to either the local mock adapter or the live backend API via configurable environment variables.

---

## Features & Implemented Stitch Designs

1. **Language Selection Screen & Header Toggles**:
   - Trilingual support in **English**, **Bengali (বাংলা)**, and **Hindi (हिन्दी)**.
   - Explanatory transit guide detailing Kolkata's shared auto system (fixed union fares per seat, designated stands/মোড়, and strictly permitted point-to-point corridors).
2. **Interactive Kolkata Map Homepage**:
   - Leaflet + OpenStreetMap integration with custom HTML/SVG yellow-green markers representing auto stands.
   - Distinct concentric glow ring for the selected stand (e.g., Ruby More).
   - High-contrast green route corridor polylines with luminous casing.
3. **Auto-Stand Information Popup**:
   - Clicking any auto stand marker opens a floating information popup showing its operational hours, coordinates, and all routes departing from that stand with quick "Highlight Route" triggers.
4. **Intermediate-Stop Progression Timeline**:
   - Displays illustrative stops (Ruby More → Acropolis Mall → Kasba Old Police Station → Bijan Setu → Ballygunge Railway Station → Gariahat Crossing) with distance, badges (e.g., *Suburban Rail Transfer*), and road names.
5. **Route Search & Route Planner**:
   - From/To search fields with auto-suggestions, swap button, and fare estimator.
   - Results matching direct corridors, 1-transfer connecting routes, and short-run branch runs.
6. **System State Switcher (Screen 7 Explorations)**:
   - Preview buttons for:
     - `State A`: Active Results (3 matching corridors).
     - `State B`: Empty State ("No direct auto corridor found") with transfer suggestions.
     - `State C`: Autocomplete Active suggestions list.
     - `State D`: GPS Location notice.
     - `State E`: Offline Cached mode with vector schematic map.
7. **Graceful Loading, Error, and Fallback States**:
   - Loading spinners during search and stand queries.
   - Honest error handling for live backend connection failures (never fabricating fake results).
   - Interactive SVG schematic map fallback if map tiles or internet connectivity are unavailable.
8. **Responsive Layouts**:
   - Desktop and laptop: Multi-column floating cards alongside real-time map.
   - Tablet: Collapsible drawers and responsive stat grids.
   - Mobile (<768px): Dedicated bottom navigation bar and mobile bottom sheet.

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (tested on v24)
- **npm**: v9.0.0 or higher (tested on v11)

### 2. Installation
Clone this repository and install dependencies:
```bash
git clone <frontend-repo-url>
cd AutoPath_Frontend
npm install
```

### 3. Local Development (with Mock Data)
By default, the frontend runs with mock data enabled so you can develop and test without a running backend:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 4. Production Build
To validate code correctness and compile the production bundle:
```bash
npm run build
npm run preview
```

---

## Connecting the Separate Backend Repository

### 1. Environment Configuration

Copy the sample environment file to create `.env`:
```bash
cp .env.example .env
```

Edit `.env` to configure your backend settings:
```env
# URL where your separate backend repository server is running
VITE_API_BASE_URL=http://localhost:5000/api

# Switch to 'false' to communicate with your live backend server
VITE_USE_MOCK_DATA=false

# Request timeout in milliseconds
VITE_API_TIMEOUT_MS=8000
```

- When `VITE_USE_MOCK_DATA=true`: The application uses `src/services/mockTransitService.js` which supplies sample data without issuing network requests.
- When `VITE_USE_MOCK_DATA=false`: The application sends real HTTP requests to `${VITE_API_BASE_URL}` via `src/services/apiClient.js`. If the backend is down or unreachable, a clear error banner is displayed with a retry button (live requests are never silently replaced with fabricated mock data).

### 2. CORS Requirements for the Backend Developer

Because the frontend and backend run on different origins during development, the backend developer **must enable CORS** (Cross-Origin Resource Sharing) on their server to permit requests from the frontend origin:

- **Frontend Origin**: `http://localhost:5173` (and `http://127.0.0.1:5173`)
- **Allowed Methods**: `GET`, `POST`, `OPTIONS`
- **Allowed Headers**: `Content-Type`, `Accept`

#### Example CORS configurations for backend frameworks:

**Node.js / Express**:
```javascript
import cors from 'cors';

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));
```

**Python / FastAPI**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Python / Flask**:
```python
from flask_cors import CORS
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})
```

---

## Expected API Contracts for the Backend Developer

The frontend expects the backend server to implement the following REST endpoints. Standard response wrapper format:
```json
{
  "success": true,
  "count": 4,
  "data": [ ... ]
}
```

### 1. Auto Stands Endpoints

#### `GET /api/stands`
Returns a list of all registered auto stands with their map coordinates.

**Sample Response:**
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "id": "ruby-more",
      "name": "Ruby More",
      "bengaliName": "রুবি মোড়",
      "fullName": "Ruby More Auto Stand",
      "coordinates": [22.5134, 88.3995],
      "coordsDescription": "EM Bypass & Rashbehari Conn.",
      "serviceSpan": "05:30 AM – Midnight",
      "standFormat": "Multi-Corridor Master",
      "queueSystem": "Sheltered • Union Regulated",
      "tier": "TIER-1 INTERCHANGE HUB",
      "activeLinesCount": 4,
      "hasLiveDispatch": true,
      "tagline": "Major Eastern Metropolitan Transit Junction • Connecting EM Bypass to South Kolkata",
      "landmarks": [
        { "name": "Ruby General Hospital", "type": "hospital", "label": "Tier-1 Trauma Center" },
        { "name": "Hemanta Mukherjee Metro", "type": "metro", "label": "Orange Line Kavi Subhash Link" }
      ]
    }
  ]
}
```

#### `GET /api/stands/:id`
Retrieves detailed metadata for a single stand by its identifier (e.g. `/api/stands/ruby-more`).

#### `GET /api/stands/:id/routes`
Returns all auto corridors departing from the specified stand.

**Sample Response:**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "id": "ruby-gariahat",
      "code": "AK-14",
      "name": "Ruby More ⇄ Gariahat",
      "bengaliName": "রুবি মোড় ⇄ গড়িয়াহাট",
      "fareFixed": "₹16.00 Fixed",
      "distance": "~4.2 km",
      "estTravelMin": 18,
      "queueFreq": "Every 2 mins",
      "routeType": "direct"
    }
  ]
}
```

### 2. Route Search Endpoints

#### `GET /api/locations/search?q={query}`
Returns location and auto stand autocomplete suggestions matching the query string.

#### `GET /api/routes/search?from={from}&to={to}`
Searches for available direct or connecting routes between two locations.

**Query Parameters:**
- `from` *(string, optional)*: Origin name or stand ID (e.g. `Ruby More`)
- `to` *(string, optional)*: Destination name or stand ID (e.g. `Gariahat`)

**Sample Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "ruby-gariahat",
      "code": "AK-14",
      "codeAlt": "AUTO #RB-GH-01",
      "name": "Ruby More ⇄ Gariahat",
      "subtitle": "Via Acropolis, Kasba & Bijan Setu Overbridge",
      "bengaliName": "রুবি মোড় ⇄ গড়িয়াহাট",
      "bengaliSubtitle": "রুবি মোড় ⇄ কসবা ⇄ বিজন সেতু ⇄ গড়িয়াহাট মোড় (সরাসরি রুট)",
      "originStandId": "ruby-more",
      "destinationStandId": "gariahat",
      "fareRange": "₹16 - ₹18",
      "fareType": "Govt Share Fare",
      "distance": "~4.2 km",
      "estTravel": "15-20m",
      "estTravelMin": 18,
      "queueFreq": "2-4 min",
      "routeType": "direct",
      "pathCoordinates": [
        [22.5134, 88.3995],
        [22.5150, 88.3910],
        [22.5165, 88.3820],
        [22.5185, 88.3735],
        [22.5195, 88.3685],
        [22.5190, 88.3645]
      ]
    }
  ]
}
```

#### `GET /api/routes/:id/stops`
Returns the ordered intermediate stops for a given route corridor.

**Sample Response:**
```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "id": "stop-ruby",
      "name": "Ruby More (Origin Stand)",
      "bengaliName": "রুবি মোড় (প্রারম্ভিক স্ট্যান্ড)",
      "distance": "0.0 km",
      "badge": "Sheltered Queue Shed",
      "subtext": "EM Bypass Jn.",
      "isStand": true,
      "coordinates": [22.5134, 88.3995]
    },
    {
      "id": "stop-acropolis",
      "name": "Acropolis Mall / Rajdanga",
      "bengaliName": "অ্যাক্রোপলিস মল / রাজডাঙ্গা",
      "distance": "1.1 km",
      "badge": "High Boarding",
      "subtext": "Rajdanga Main Rd",
      "isStand": false,
      "coordinates": [22.5150, 88.3910]
    },
    {
      "id": "stop-bijansetu",
      "name": "Bijan Setu (Overbridge Entry)",
      "bengaliName": "বিজন সেতু (উড়ালপুল প্রবেশ)",
      "distance": "3.1 km",
      "badge": "Peak Congestion Area",
      "isStand": false,
      "coordinates": [22.5185, 88.3735]
    },
    {
      "id": "stop-ballygunge-stn",
      "name": "Ballygunge Railway Stn (South)",
      "bengaliName": "বালিগঞ্জ রেল স্টেশন (দক্ষিণ)",
      "distance": "3.7 km",
      "badge": "Suburban Rail Transfer",
      "badgeIcon": "train",
      "isStand": false,
      "coordinates": [22.5195, 88.3685]
    },
    {
      "id": "stop-gariahat",
      "name": "Gariahat Crossing (Terminus)",
      "bengaliName": "গড়িয়াহাট ক্রসিং (টার্মিনাস)",
      "distance": "4.2 km",
      "badge": "Rashbehari Ave Stand",
      "isStand": true,
      "coordinates": [22.5190, 88.3645]
    }
  ]
}
```

---

## Codebase Organization (For a 5-Developer Team)

```
AutoPath_Frontend/
├── .env                             # Active environment configuration
├── .env.example                     # Sample template for team members
├── index.html                       # HTML shell, fonts (Inter, Noto Sans Bengali), Leaflet
├── package.json                     # Dependencies (React 19, Leaflet, Lucide)
├── src/
│   ├── main.jsx                     # Application bootstrap
│   ├── App.jsx                      # Tab routing & global modal orchestration
│   ├── context/
│   │   └── TransitContext.jsx       # Central state: selected stands, routes, language, layers
│   ├── services/
│   │   ├── apiConfig.js             # Base URL, timeout, endpoint paths
│   │   ├── apiClient.js             # Centralized Fetch wrapper, error normalization
│   │   ├── transitService.js        # Service gateway switching between mock & live API
│   │   ├── mockTransitService.js    # Mock adapter (used when backend is offline)
│   │   └── types.js                 # API contract documentation & JSDoc types
│   ├── data/
│   │   ├── standsData.js            # Stand coordinates & landmark metadata
│   │   ├── routesData.js            # Point-to-point polylines, stops, fixed fares
│   │   ├── searchSuggestions.js     # Tagged search suggestion database
│   │   └── translations.js          # EN, BN, HI dictionaries
│   ├── components/
│   │   ├── Header.jsx               # Brand logo, desktop tabs, mobile bottom nav, language pills
│   │   ├── Footer.jsx               # Civic transit disclosure & versioning
│   │   ├── MapView.jsx              # Leaflet map, custom stand markers, popup, polylines
│   │   ├── OfflineFallbackMap.jsx   # Vector SVG schematic fallback for offline mode
│   │   ├── InteractiveMapPanel.jsx  # Floating sidebar from Stitch Screen 1
│   │   ├── RouteSearchPanel.jsx     # Planner sidebar from Stitch Screen 2
│   │   ├── AutoStandsModal.jsx      # Stand hub drawer from Stitch Screen 3
│   │   ├── LanguageModal.jsx        # Trilingual welcome screen & transit guide
│   │   └── PreferencesModal.jsx     # Fare display & transliteration settings
│   └── styles/
│       └── index.css                # Master responsive stylesheet (Design system tokens)
```

---

## Important Transit Disclosures

- **No Commercial Dispatch or Live Tracking**: AutoPath is a public transit discovery tool. Static sample routes represent government/union authorized routes and do not claim to track autos live via GPS.
- **Seat-Share Fares**: Shared auto fares in Kolkata are union and government regulated per passenger seat. Fares are displayed in per-seat shares.
