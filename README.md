# AI Travel Assistant 🌍✨

AI Travel Assistant is a modern, responsive, and completely free AI-powered travel planning platform designed to automate, customize, and budget your vacation itineraries. Leveraging high-level generative AI, real-time map visualizations, packing list synchronization, and live atmospheric forecast feeds, it provides a comprehensive travel blueprint in seconds.

---

## 🚀 Key Features

1. **AI Trip Planner**: Tailor itineraries based on destination, duration, budget, travel styles, and custom interests (Historical places, Food, Nature, Adventure, etc.).
2. **AI Travel Companion (Chat)**: Interactive, conversational chatbot with message history to answer destination-specific inquiries.
3. **Interactive OpenStreetMap Map**: Dynamic Leaflet maps detailing curated attraction spots, coordinates, themes, and schedules.
4. **Budget Planner**: Bento-grid expense allocation matching estimated costs across accommodation, dining, transport, activities, and contingency funds.
5. **Dynamic Packing Checklists**: Smart categories (Essentials, Clothes, Toiletries, Electronics) with live checklist state persistent sync with Firebase Firestore.
6. **Live Weather Forecast**: 7-day atmospheric forecast (max/min temp, precipitation probability, windspeed) for the destination attraction coordinate using the Open-Meteo API.
7. **Premium PDF Export**: Print-ready, beautifully designed travel blueprint optimized for paper or save-to-PDF direct exports.
8. **Secure Authentication & Guarded Access**: Simple registration with Firebase Authentication supporting email login, passwords resets, and Google SSO.
9. **Dual Theme Appearance**: Immersive glassmorphism and modern Dark/Light mode theme configurations.

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **React (v19) & Vite**: Ultra-fast, hot-reloading web client.
- **Tailwind CSS (v4)**: Modern utility classes and theme configuration.
- **Framer Motion / Motion**: Smooth responsive animations and micro-interaction transitions.
- **React Router (v6)**: Client-side URL state and navigation routes.
- **Leaflet & OpenStreetMap**: Responsive maps showing point locations.

### Backend
- **Express**: Lightweight server to proxy APIs and manage Vite middleware.
- **Google GenAI SDK (Gemini 2.5 Flash)**: Generative travel planning and conversational chatbot.
- **Firebase Auth & Firestore**: Secure user sessions and persistent storage.
- **Open-Meteo REST API**: Free location-specific forecast feeds.

### Architecture Diagram
```
           +----------------------------------------+
           |           React Client App             |
           |  (Itinerary, Maps, Checklists, Chats)  |
           +-------------------+--------------------+
                               |
            +------------------+------------------+
            |                                     |
    +-------v-------+                     +-------v-------+
    | Firebase SDK  |                     |  Vite Express |
    | (Auth, DB)    |                     |  Proxy Server |
    +-------+-------+                     +-------+-------+
            |                                     |
+-----------v-----------+               +---------v---------+
|  Cloud Firestore &   |               |   Gemini 2.5 AI   |
| Firebase User Auth    |               |  Generation APIs  |
+-----------------------+               +---------+---------+
                                                  |
                                        +---------v---------+
                                        |  Open-Meteo API   |
                                        | (Weather Feeds)   |
                                        +-------------------+
```

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Firebase Project setup with Email Auth and Firestore enabled

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/ai-travel-assistant.git
cd ai-travel-assistant
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Required for Gemini AI API
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Base Application URL
APP_URL="http://localhost:3000"
```

Configure your Firebase client credentials inside `firebase-applet-config.json` at the root folder:
```json
{
  "projectId": "YOUR_FIREBASE_PROJECT_ID",
  "appId": "YOUR_FIREBASE_APP_ID",
  "apiKey": "YOUR_FIREBASE_API_KEY",
  "authDomain": "YOUR_FIREBASE_AUTH_DOMAIN",
  "firestoreDatabaseId": "YOUR_FIRESTORE_DB_ID",
  "storageBucket": "YOUR_STORAGE_BUCKET_ID",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID"
}
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
To bundle the frontend assets and compile the full-stack backend Express server:
```bash
npm run build
npm start
```

---

## 🔮 Future Improvements
1. **Multi-user Collaborative Trips**: Let families or friends co-edit itineraries and checklists in real-time.
2. **Offline Mode**: Cache Leaflet tiles and itinerary data in local IndexedDB for remote traveling access.
3. **Flight & Hotel Search Grounding**: Integrate Skyscanner or Google Flights endpoints using Gemini tool calling.
