/**
 * @file types.js
 * 
 * AutoPath Frontend & Backend API Contract Specification.
 * 
 * This file serves as the formal specification and documentation for the
 * separate backend repository developer.
 * 
 * ARCHITECTURE PRINCIPLES:
 * 1. The backend database is the single source of truth for all route data.
 * 2. The backend stores each route's start stop, destination stop, ordered intermediate
 *    stops, and complete ordered path coordinates along the actual road network.
 * 3. The frontend fetches this information from the backend API and renders it on the map.
 * 4. The frontend performs NO independent routing calculations (no OSRM, Google Directions, etc.).
 * 5. If route geometry is missing or invalid from the backend, the frontend will NOT
 *    fabricate or connect markers with straight lines.
 */

/**
 * Expected Backend Endpoints Summary:
 * 
 * 1. GET /api/routes/:id
 *    Returns the full route details, start stop, destination stop,
 *    ordered intermediate stops, and road-network path coordinates.
 * 
 * 2. GET /api/routes/search?from=:from&to=:to
 *    Returns an array of matching routes with their startStop, destinationStop,
 *    ordered stops, and road-network pathCoordinates.
 * 
 * 3. GET /api/stands
 *    Returns all auto stands in Kolkata with their terminal coordinates.
 * 
 * 4. GET /api/stands/:id
 *    Returns details of a specific auto stand.
 * 
 * 5. GET /api/stands/:id/routes
 *    Returns all auto routes originating or terminating at this auto stand.
 * 
 * 6. GET /api/locations/search?q=:query
 *    Returns auto-complete suggestions for locations and stands.
 */

/**
 * @example
 * Expected JSON Response Format for GET /api/routes/:id
 * {
 *   "success": true,
 *   "data": {
 *     "id": "ruby-gariahat",
 *     "code": "AK-14",
 *     "name": "Ruby More ⇄ Gariahat",
 *     "subtitle": "Via Acropolis, Kasba & Bijan Setu Overbridge",
 *     "bengaliName": "রুবি মোড় ⇄ গড়িয়াহাট",
 *     "bengaliSubtitle": "রুবি মোড় ⇄ কসবা ⇄ বিজন সেতু ⇄ গড়িয়াহাট মোড়",
 *     "originStandId": "ruby-more",
 *     "destinationStandId": "gariahat",
 *     "startStop": {
 *       "id": "stop-ruby",
 *       "name": "Ruby More (Origin Stand)",
 *       "bengaliName": "রুবি মোড় (প্রারম্ভিক স্ট্যান্ড)",
 *       "coordinates": [22.5134, 88.3995],
 *       "isStand": true,
 *       "subtext": "EM Bypass Jn."
 *     },
 *     "destinationStop": {
 *       "id": "stop-gariahat",
 *       "name": "Gariahat Crossing (Terminus)",
 *       "bengaliName": "গড়িয়াহাট ক্রসিং (টার্মিনাস)",
 *       "coordinates": [22.5190, 88.3645],
 *       "isStand": true,
 *       "subtext": "Transfer to Kalighat Auto & Tram Depot"
 *     },
 *     "stops": [
 *       {
 *         "id": "stop-ruby",
 *         "name": "Ruby More (Origin Stand)",
 *         "bengaliName": "রুবি মোড় (প্রারম্ভিক স্ট্যান্ড)",
 *         "order": 1,
 *         "distance": "0.0 km",
 *         "distKm": 0.0,
 *         "isStand": true,
 *         "coordinates": [22.5134, 88.3995],
 *         "subtext": "EM Bypass Jn."
 *       },
 *       {
 *         "id": "stop-acropolis",
 *         "name": "Acropolis Mall / Rajdanga",
 *         "bengaliName": "অ্যাক্রোপলিস মল / রাজডাঙ্গা",
 *         "order": 2,
 *         "distance": "1.1 km",
 *         "distKm": 1.1,
 *         "badge": "High Boarding",
 *         "subtext": "Rajdanga Main Rd",
 *         "isStand": false,
 *         "coordinates": [22.5150, 88.3910]
 *       },
 *       {
 *         "id": "stop-kasba",
 *         "name": "Kasba Old Police Station",
 *         "bengaliName": "কসবা পুরাতন থানা মোড়",
 *         "order": 3,
 *         "distance": "2.3 km",
 *         "distKm": 2.3,
 *         "badge": null,
 *         "subtext": "Bosepukur Connector",
 *         "isStand": false,
 *         "coordinates": [22.5165, 88.3820]
 *       },
 *       {
 *         "id": "stop-bijansetu",
 *         "name": "Bijan Setu (Overbridge Entry)",
 *         "bengaliName": "বিজন সেতু (উড়ালপুল প্রবেশ)",
 *         "order": 4,
 *         "distance": "3.1 km",
 *         "distKm": 3.1,
 *         "badge": "Peak Congestion Area",
 *         "subtext": "Ballygunge-Kasba Viaduct",
 *         "isStand": false,
 *         "coordinates": [22.5185, 88.3735]
 *       },
 *       {
 *         "id": "stop-ballygunge-stn",
 *         "name": "Ballygunge Railway Stn (South)",
 *         "bengaliName": "বালিগঞ্জ রেল স্টেশন (দক্ষিণ)",
 *         "order": 5,
 *         "distance": "3.7 km",
 *         "distKm": 3.7,
 *         "badge": "Suburban Rail Transfer",
 *         "badgeIcon": "train",
 *         "subtext": "Direct footbridge to Sealdah EMU trains",
 *         "isStand": false,
 *         "coordinates": [22.5195, 88.3685]
 *       },
 *       {
 *         "id": "stop-gariahat",
 *         "name": "Gariahat Crossing (Terminus)",
 *         "bengaliName": "গড়িয়াহাট ক্রসিং (টার্মিনাস)",
 *         "order": 6,
 *         "distance": "4.2 km",
 *         "distKm": 4.2,
 *         "badge": "Rashbehari Ave Stand",
 *         "subtext": "Transfer to Kalighat Auto & Tram Depot",
 *         "isStand": true,
 *         "coordinates": [22.5190, 88.3645]
 *       }
 *     ],
 *     "pathCoordinates": [
 *       [22.5134, 88.3995],
 *       [22.5135, 88.3988],
 *       [22.5137, 88.3963],
 *       [22.5141, 88.3949],
 *       [22.5148, 88.3921],
 *       [22.5150, 88.3910],
 *       [22.5158, 88.3860],
 *       [22.5165, 88.3820],
 *       [22.5173, 88.3780],
 *       [22.5185, 88.3735],
 *       [22.5195, 88.3685],
 *       [22.5190, 88.3645]
 *     ],
 *     "fareRange": "₹12 - ₹15",
 *     "fareFixed": "₹16.00 Fixed",
 *     "fareType": "Per Seat Share",
 *     "distance": "~4.2 km",
 *     "distanceKm": 4.2,
 *     "estTravel": "15-20m",
 *     "estTravelMin": 18,
 *     "queueFreq": "2-4 min",
 *     "isDirect": true,
 *     "routeType": "direct"
 *   }
 * }
 */

export const API_CONTRACT_DOCS = true;
