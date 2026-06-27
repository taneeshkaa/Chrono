# AI Roadmap Feature Implementation Summary

## ✅ Completed

### Backend
1. **Prisma Schema Updated**
   - Added `RoadmapCache` model with userId, result (JSON), generatedAt
   - Added relation to User model
   - Migration ready: `npx prisma migrate dev --name add_roadmap_cache`

2. **API Routes Created**
   - **POST `/api/ai/roadmap`**: Generates AI roadmap
     - Fetches all active commitments (not archived)
     - Fetches all active ContextMemory (not deleted)
     - Sends to Groq with structured prompt
     - Returns JSON with overload status, priority list, 7-day roadmap
     - Saves to RoadmapCache (upserts on userId)
   
   - **GET `/api/ai/roadmap`**: Returns cached roadmap
     - Returns `{ exists: false }` if none exists
     - Returns `{ exists: true, data, generatedAt }` if cached

3. **Dependencies Installed**
   - `groq-sdk` installed for AI integration

### Frontend
1. **Roadmap Page Created** (`/app/roadmap/page.tsx`)
   - Server-side authentication check
   - Renders RoadmapClient component

2. **RoadmapClient Component** (`/app/roadmap/roadmap-client.tsx`)
   - **SECTION A - Priority List**:
     - Displays priorityList items ordered by urgency
     - TODAY items: Red left border
     - THIS WEEK items: Yellow left border  
     - LATER items: Zinc left border
     - Shows title, action, estimated time, type badge
     - Regenerate button to call POST API
   
   - **SECTION B - 7-Day Roadmap**:
     - One card per day
     - Each task shows title + duration
     - Clean calendar-based layout

3. **Sidebar Updated**
   - Added "AI Roadmap" navigation item with Map icon
   - Positioned between Analytics and Connections
   - Uses Next.js Link for proper navigation
   - Highlights active route

## 📋 To Complete

### Overload Banner on Dashboard

You need to add the OverloadBanner component to the existing dashboard. Here's the code:

**File: `src/components/dashboard/OverloadBanner.tsx`**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

type RoadmapData = {
  overloaded: boolean
  overloadMessage: string | null
  postponeSuggestions: {
    commitmentId: string
    commitmentTitle: string
    reason: string
    suggestion: string
  }[]
}

export default function OverloadBanner() {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [hiddenSuggestions, setHiddenSuggestions] = useState<Set<string>>(new Set())

  useEffect(() => {
    const isDismissed = localStorage.getItem('overloadBannerDismissed') === 'true'
    setDismissed(isDismissed)

    async function fetchRoadmap() {
      try {
        const response = await fetch('/api/ai/roadmap')
        const data = await response.json()

        if (data.exists && data.data) {
          setRoadmap(data.data)
          
          const lastGeneratedAt = localStorage.getItem('lastRoadmapGeneratedAt')
          if (lastGeneratedAt !== data.generatedAt) {
            localStorage.setItem('lastRoadmapGeneratedAt', data.generatedAt)
            localStorage.removeItem('overloadBannerDismissed')
            setDismissed(false)
            setHiddenSuggestions(new Set())
          }
        }
      } catch (error) {
        console.error('Failed to fetch roadmap:', error)
      }
    }

    fetchRoadmap()
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('overloadBannerDismissed', 'true')
  }

  const handleHideSuggestion = (commitmentId: string) => {
    setHiddenSuggestions(prev => new Set([...prev, commitmentId]))
  }

  if (!roadmap || !roadmap.overloaded || dismissed) {
    return null
  }

  const visibleSuggestions = roadmap.postponeSuggestions.filter(
    suggestion => !hiddenSuggestions.has(suggestion.commitmentId)
  )

  return (
    <div className="mb-6 space-y-3">
      {roadmap.overloadMessage && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-rose-900 dark:text-rose-100 flex-1">{roadmap.overloadMessage}</p>
          <button onClick={handleDismiss} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-800/50 rounded-lg transition-colors">
            <X className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </button>
        </div>
      )}

      {visibleSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleSuggestions.map((suggestion) => (
            <div key={suggestion.commitmentId} className="inline-flex items-center space-x-2 px-3 py-2 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg text-sm">
              <span className="text-rose-900 dark:text-rose-100">
                <strong>Consider {suggestion.suggestion}:</strong> {suggestion.commitmentTitle}
              </span>
              <button onClick={() => handleHideSuggestion(suggestion.commitmentId)} className="p-0.5 hover:bg-rose-200 dark:hover:bg-rose-800/50 rounded transition-colors">
                <X className="h-3.5 w-3.5 text-rose-700 dark:text-rose-300" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Then import it in the Dashboard:**

Find the existing DashboardClient component and add near the top of the render:
```typescript
import OverloadBanner from './OverloadBanner'

// In the render, add before contexts section:
<OverloadBanner />
```

## 🔧 Configuration Required

### Environment Variables
Add to `.env`:
```
GROQ_API_KEY=your_groq_api_key_here
```

Get your API key from: https://console.groq.com/

## 📝 Usage Flow

1. **User navigates to `/roadmap`**
2. **First time**: Shows "No Roadmap Generated" → Click "Generate Roadmap"
3. **AI generates roadmap** using Groq with all commitments + contexts
4. **Displays**:
   - Priority list sorted by urgency (TODAY, THIS-WEEK, LATER)
   - 7-day roadmap with daily task breakdown
   - General advice
5. **On Dashboard**: If overloaded, shows red warning banner
6. **Regenerate anytime** to get updated priorities

## 🎨 UI Features

- **Red left border** for TODAY items
- **Yellow left border** for THIS-WEEK items
- **Zinc left border** for LATER items
- **Time badges** showing estimated duration
- **Type badges** (commitment vs context)
- **Regenerate button** with spinner animation
- **Dismissible banners** with localStorage persistence
- **Responsive layout** (2-column on desktop, stacked on mobile)

## ✨ AI Capabilities

The Groq AI analyzes:
- All active commitments with deadlines, priorities, risk scores
- All active work contexts with next actions
- Estimates total workload (flags if > 40 hours/week)
- Suggests which commitments to postpone/drop/delegate
- Creates actionable daily breakdown for 7 days
- Provides personalized productivity advice

## 🚀 Next Steps

1. Run migration: `npx prisma migrate dev --name add_roadmap_cache`
2. Add GROQ_API_KEY to `.env`
3. Create the OverloadBanner component (code above)
4. Import OverloadBanner in DashboardClient
5. Test by navigating to `/roadmap`
6. Generate your first AI roadmap!

---

**Server Status**: Running at http://localhost:3000
**Roadmap Page**: http://localhost:3000/roadmap
