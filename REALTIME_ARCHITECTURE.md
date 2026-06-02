# Real-Time Multi-Website Synchronization Manual
### Modern, Scalable & High-Performance Architecture Blueprint

This blueprint covers how to connect two separate websites (Website 1: Main Frontend/User Experience & Website 2: Dashboard/AI processing/Admin center) to work seamlessly as one real-time cohesive experiences.

---

## 1. Complete Architecture Overview

To build a flawless interaction, Websites 1 and 2 are decoupled but synchronized via a unified real-time data layer & API gateway.

```
       ┌────────────────────────┐                    ┌────────────────────────┐
       │       WEBSITE 1        │                    │       WEBSITE 2        │
       │    (Main Frontend)     │                    │   (Admin Dashboard/AI) │
       └───────────┬────────────┘                    └────────────▲───────────┘
                   │                                              │
                   │ REST Sessions / Event Pubs                   │ Real-Time Pipeline
                   ▼                                              │ Live Broadcasts
       ┌──────────────────────────────────────────────────────────┴───────────┐
       │                       SERVER / BACKEND & GENERAL API                 │
       │           (Express Gateway / Firebase Admin SDK Service)              │
       └───────────────────────────────────┬──────────────────────────────────┘
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │          REAL-TIME DATA FABRIC        │
                       │   (Firestore SDK / Socket.io Cluster)  │
                       └───────────────────────────────────────┘
```

### High-Level Flow
1. **User Action**: The visitor interacts with Website 1 (e.g., moves a custom slider, completes a gamified challenge).
2. **Instant Local Transition & Sync**: Website 1 updates its local state (Zustand) and schedules a fast write directly or via API to the Cloud/Firebase database.
3. **Database Streaming Broadcast**: The central real-time database registers changes and streams a live push notification event via long-lived subscriptions (`onSnapshot` / WebSockets) to Website 2.
4. **AI/Processing Engine**: Website 2 handles statistics, fires heavy AI analyses (e.g. Gemini, categorization models), and writes the computed outputs back into the specific document session in the database.
5. **Dynamic Real-Time Feedback**: Website 1 receives the updated document and transforms the frontend interface instantly.

---

## 2. Recommended Folder Structure

This structure separates worries, implements modular React paradigms, and separates backend server-side logic from frontend client pages.

### Website 1: Client/Frontend (Vite + React + Zustand)
```
/
├── public/                 # Static graphical assets & sound clips
├── src/
│   ├── components/         # High-fidelity shared widgets
│   │   ├── ConfettiEffect.tsx   # Visual triggers
│   │   └── FuturisticCursor.tsx # Smooth cursor feedback
│   ├── lib/
│   │   ├── firebase.ts     # Firebase client setup & listeners
│   │   └── sound.ts        # Sound FX registry
│   ├── screens/            # Single-view flow views
│   │   ├── LandingScreen.tsx
│   │   ├── QuestionFlowScreen.tsx
│   │   └── ThankYouScreen.tsx
│   ├── store.ts            # Central Zustand State Engine
│   ├── types.ts            # Global TypeScript contracts
│   ├── index.css           # Global Tailwind stylesheet
│   └── main.tsx            # Main application root
├── package.json
└── vite.config.ts
```

### Website 2: Backend & Dashboard (Node.js + Express + Firebase Admin)
```
/
├── src/
│   ├── config/             # Environment & credentials (SDK settings)
│   ├── controllers/        # Route controller modules
│   │   ├── ai.controller.ts      # Gemini/AI categorization trigger
│   │   └── session.controller.ts # Database mutations
│   ├── services/           # External tools or APIs integrations
│   │   └── firebase.service.ts   # Secure Firebase Admin connection
│   ├── server.ts           # Custom Express server entry point
│   └── types.ts            # Type definitions
├── package.json
└── tsconfig.json
```

---

## 3. API Flow Explanation

Below is the execution flow of an automated user rating & response event:

1. **Submit Event**: User updates questionnaire rating on Website 1 $\rightarrow$ State triggers API route.
2. **Compute Route**: `POST /api/sessions/:id/recalibrate` is handled by Website 2.
3. **Trigger AI**: Backend contacts Gemini AI, generating an updated Vibe profile (e.g. Archetype).
4. **Persist Match**: Writes result to Firestore.
5. **Real-time Push**: Website 1's UI listening on `onSnapshot(docRef)` snaps down the update in < 15ms.

---

## 4. Example Frontend-Backend Connection

### Website 1 (Frontend): Sending Updates via API
```typescript
// src/services/api.ts
import { useStore } from '../store';

export async function submitUserAnswers(sessionId: string, answers: Record<string, number>) {
  try {
    const response = await fetch(`https://api.yourdomain.com/api/sessions/${sessionId}/calibrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    
    if (!response.ok) {
      throw new Error('API recalibration failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Connection error:', error);
  }
}
```

### Website 2 (Backend): Express API Endpoint
```typescript
// server.ts
import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = express();
app.use(cors({ origin: 'https://experience.yourdomain.com' }));
app.use(express.json());

// Initialize connection safely with admin privileges
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

app.post('/api/sessions/:id/calibrate', async (req, res) => {
  const { id } = req.params;
  const { answers } = req.body;
  
  try {
    // 1. Process or evaluate data with AI/custom business logic
    const score = Object.values(answers).reduce((a: any, b: any) => a + b, 0);
    const archetype = score > 150 ? 'Hyper-Active Futurist' : 'Quiet Pixel Artist';
    
    // 2. Write straight to database to trigger live broadcast listeners
    const sessionRef = db.collection('sessions').doc(id);
    await sessionRef.set({
      answers,
      computedArchetype: archetype,
      updatedAt: Date.now()
    }, { merge: true });
    
    res.json({ success: true, archetype });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('API Gateway active on port 3000'));
```

---

## 5. Real-Time Communication Setup

For absolute performance, use **Firestore Live Listeners** which act as managed WebSockets but scale to millions of concurrent sessions with built-in cache layers.

### Client-side Live listener (placed on BOTH Website 1 and Website 2)
```typescript
// src/lib/realtime.ts
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function subscribeToSession(sessionId: string, onUpdate: (data: any) => void) {
  const docRef = doc(db, 'sessions', sessionId);
  
  // onSnapshot handles background long-polling or active WS connections automatically
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data());
    }
  }, (error) => {
    console.error("Real-time stream error:", error);
  });
}
```

---

## 6. Security Best Practices

1. **Use Firebase Security Rules** to lock down endpoints:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /sessions/{sessionId} {
         allow read, create: if true; // Experience visitors can read/create draft steps
         allow update: if request.resource.data.completed != true; // No changes after locking/completion
         allow delete: if request.auth != null && request.auth.token.admin == true; // Admin only
       }
     }
   }
   ```
2. **Rotate Secrets Always**: Keep API keys such as `GEMINI_API_KEY` or `STRIPE_KEY` securely in `.env` configured inside server contexts. Never expose keys with public environments to Website 1 client.
3. **CORS Configuration**: Restrict incoming traffic on Website 2's Express interface exclusively to Website 1’s main origin domain.

---

## 7. Hosting Recommendations

* **Website 1 (Client-side HTML/Vite React)**: Host on **Cloud Run** or **Vercel** for fast edge performance with multi-region CDNs.
* **Website 2 (Node Express Backend)**: Host on **Google Cloud Run** or **Render** specifying container configuration so the machine handles active request scaling and server-side model computations.
* **Shared Database**: Provision **Firebase Firestore Database** inside a dedicated single-region (e.g. `europe-west3`) to keep pipeline latency under 10-25 milliseconds.

---

## 8. Step-by-Step Implementation Guide

### Phase A: Simple MVP (Build in 1 Day)
1. **Initialize a shared Firebase Instance**: Share one single config file containing the API Key across both websites.
2. **Implement reactive state**: Set up direct writes to Firestore from sliders in Website A.
3. **Add Listeners**: Add `onSnapshot` inside Website B to listen to active entries on the table, and output the stats. 
4. **Simulate AI**: Have Website B compute a dynamic value and write it back inside the database table.

### Phase B: Scalable Production Version
1. **Secure Access**: Replace direct Client mutations with securely signed Backend HTTP Endpoints (`/api/calibrate`).
2. **Add Event Brokers**: If dealing with millions of clicks per second, integrate **Redis Pub/Sub** or **Socket.io** over an Autoscale load-balancer.
3. **Lock DB**: Restrict document rules, add SSL requirements, and add API usage monitoring using GCP Cloud Logs.
