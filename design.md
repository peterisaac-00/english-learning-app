# English Learning System - Mobile App Design

## Design Philosophy
This is a **personal learning workspace** designed for a single user. It should feel like a structured digital notebook with clean, minimal design following iOS Human Interface Guidelines (HIG). The app prioritizes clarity, usability, and one-handed navigation in portrait orientation (9:16).

---

## Color Scheme
- **Primary**: Green (#22C55E) - Represents growth and progress
- **Background**: White (#FFFFFF) - Clean, minimal aesthetic
- **Text**: Dark Gray (#11181C) - High contrast for readability
- **Accent**: Light Green (#DCFCE7) - Secondary highlights
- **Borders**: Light Gray (#E5E7EB) - Subtle separation

---

## Screen List

### 1. **Home Screen (Tab: Home)**
**Purpose**: Dashboard showing all 4 learning modules and quick access to daily tasks.

**Content & Layout**:
- Header: "English Learning" title + date
- 4 large card buttons (Reading, Writing, Listening, Speaking)
- Each card shows:
  - Icon (book, pen, headphones, microphone)
  - Module name
  - Quick stat (e.g., "3 entries today")
  - Tap to enter module
- Bottom: Tab bar with 4 tabs (Home, Progress, Settings, About)

**Functionality**:
- Tap any card to enter that module
- Cards show real-time counts of today's activities

---

### 2. **Writing Module (Tab: Writing)**
**Purpose**: Daily journal and vocabulary tracker.

**Screens**:

#### 2a. Writing Home
- **Header**: "Writing" + date picker
- **Two Sections**:
  1. **Daily Journal**
     - Large text input field: "Write about your day..."
     - Auto-save indicator
     - Save button
     - Show list of past entries (dates)
  2. **Vocabulary Tracker**
     - "Words Added Today: X/5"
     - Progress bar (0-5)
     - Add word button
     - List of words added today with meanings

#### 2b. Add Word Modal
- Word input field
- Meaning/note field (optional)
- Add button
- Cancel button

#### 2c. Writing History
- Timeline view of all journal entries
- Each entry shows: date, preview text, word count
- Tap to view full entry
- Swipe to delete (with confirmation)

---

### 3. **Reading Module (Tab: Reading)**
**Purpose**: Track reading materials (articles, books, texts).

**Screens**:

#### 3a. Reading Home
- **Header**: "Reading"
- **Add Reading Button**: Large button "Add Article/Book"
- **List of Reading Items**:
  - Each item card shows:
    - Title
    - Source (link/file indicator)
    - Progress bar (0-100%)
    - Percentage text
    - Edit/Delete buttons
  - Tap to view details

#### 3b. Add Reading Modal
- Title input
- Content/Link input (paste text or URL)
- Progress slider (0-100%)
- Save button

#### 3c. Reading Detail
- Title + source
- Content preview (scrollable)
- Progress bar + percentage
- Update progress slider
- Delete button
- Back button

---

### 4. **Listening Module (Tab: Listening)**
**Purpose**: Track podcasts, videos, and audio files with summaries.

**Screens**:

#### 4a. Listening Home
- **Header**: "Listening"
- **Add Listening Button**: "Add Podcast/Video"
- **List of Listening Items**:
  - Each item card shows:
    - Title
    - Source (link/file indicator)
    - Progress bar (0-100%)
    - Percentage text
    - Edit/Delete buttons
  - Tap to view details

#### 4b. Add Listening Modal
- Title input
- Source link/file input
- Progress slider (0-100%)
- Save button

#### 4c. Listening Detail
- Title + source
- Progress bar + percentage
- Update progress slider
- **Summary Section**:
  - "What did you understand?" text input
  - Save summary button
  - Show past summaries (date + text)
- Delete button
- Back button

---

### 5. **Speaking Module (Tab: Speaking)**
**Purpose**: Random speaking topics with voice recording.

**Screens**:

#### 5a. Speaking Home
- **Header**: "Speaking"
- **Large Topic Card**:
  - "Today's Topic:"
  - Display random topic (e.g., "Talk about spaghetti")
  - Refresh button (get new topic)
  - Difficulty indicator (1-5 stars, increases over time)
- **Recording Section**:
  - Large red record button (microphone icon)
  - Timer display (00:00)
  - Stop button (appears during recording)
  - Save button (after recording stops)
- **Past Recordings List**:
  - Each entry: date, topic, duration
  - Tap to play/delete

#### 5b. Recording Detail
- Topic displayed
- Play button (with progress bar)
- Duration
- Delete button
- Back button

---

### 6. **Progress Dashboard (Tab: Progress)**
**Purpose**: Overall learning consistency and progress tracking.

**Content & Layout**:
- **Header**: "Progress"
- **Statistics Cards**:
  - Total entries (all modules combined)
  - Daily streak (consecutive days with activity)
  - Words learned (vocabulary count)
  - Hours spent (estimated from recordings + entries)
- **Activity Timeline**:
  - Last 7 days activity
  - Show which modules were used each day
  - Color-coded by module (green for active)
- **Module Breakdown**:
  - Reading: X items, Y% average progress
  - Writing: X entries, Y words
  - Listening: X items, Y% average progress
  - Speaking: X recordings, Y total minutes

---

### 7. **Settings Screen (Tab: Settings)**
**Purpose**: App configuration and data management.

**Content**:
- **Theme Settings**:
  - Light/Dark mode toggle
- **Data Management**:
  - Export data (JSON)
  - Clear all data (with confirmation)
- **About**:
  - App version
  - Help/FAQ link
- **Difficulty Settings**:
  - Speaking topic difficulty level (1-5)

---

## Key User Flows

### Flow 1: Daily Journal Entry
1. User taps "Writing" card on home
2. Sees journal input field for today
3. Types entry
4. App auto-saves
5. User can view past entries in timeline

### Flow 2: Add Vocabulary Word
1. User in Writing module
2. Taps "Add Word" button
3. Enters word + meaning
4. Taps "Add"
5. Word appears in today's list
6. Counter updates (X/5)

### Flow 3: Track Reading Progress
1. User taps "Reading" card
2. Taps "Add Article/Book"
3. Enters title + content/link
4. Sets initial progress (0%)
5. Later, taps reading item
6. Adjusts progress slider
7. Progress bar updates

### Flow 4: Record Speaking Practice
1. User taps "Speaking" card
2. Sees random topic
3. Taps record button
4. Speaks for desired duration
5. Taps stop
6. Taps save
7. Recording appears in history with date/topic

### Flow 5: View Progress Dashboard
1. User taps "Progress" tab
2. Sees overall stats and streaks
3. Scrolls to see activity timeline
4. Views module breakdown

---

## Design Principles

1. **Minimal & Clean**: White background, green accents, no clutter
2. **One-Handed Usage**: All interactive elements within thumb reach
3. **Clear Feedback**: Every action shows immediate visual feedback
4. **Consistent Navigation**: Tab bar always visible, back buttons for modals
5. **Data Visibility**: Progress bars and counters show real-time status
6. **Offline-First**: All data stored locally, no sync required for MVP
7. **Accessibility**: High contrast text, large touch targets (44pt minimum)

---

## Technical Notes

- **Local Storage**: AsyncStorage for all data (no backend required for MVP)
- **Navigation**: Tab-based with modal overlays for add/edit screens
- **State Management**: React Context + useReducer for learning data
- **Persistence**: Auto-save for journal entries, explicit save for other items
- **Icons**: Material Icons (book, pen, headphones, microphone, etc.)
- **Animations**: Subtle, minimal (no complex spring animations)
