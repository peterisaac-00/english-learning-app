# English Learning System - MVP TODO

## Phase 2: Core Architecture & Navigation
- [x] Set up tab navigation (Home, Reading, Listening, Reading, Speaking, Progress, Settings)
- [x] Create LearningContext for global state management
- [x] Define TypeScript types for all data models (Entry, Word, Reading, Listening, Recording, etc.)
- [x] Set up AsyncStorage persistence layer
- [x] Create utility functions for data CRUD operations

## Phase 3: Home Screen & Writing Module
- [x] Build Home Screen with 4 module cards
- [x] Create Writing module home screen
- [x] Build daily journal entry form with auto-save
- [x] Create vocabulary tracker with 5-word daily limit
- [x] Build Add Word modal
- [x] Create Writing history/timeline view
- [x] Implement edit/delete for journal entries
- [x] Implement edit/delete for vocabulary words

## Phase 4: Reading Module
- [x] Build Reading module home screen
- [x] Create Add Reading modal (title, content/link, progress)
- [x] Build Reading detail screen with progress bar
- [x] Implement progress update functionality
- [x] Implement edit/delete for reading items
- [x] Add reading item list with progress indicators

## Phase 5: Listening Module
- [x] Build Listening module home screen
- [x] Create Add Listening modal (title, source link, progress)
- [x] Build Listening detail screen with progress bar
- [x] Implement progress update functionality
- [x] Create summary input field ("What did you understand?")
- [x] Build summary history view
- [x] Implement edit/delete for listening items
- [x] Add listening item list with progress indicators

## Phase 6: Speaking Module
- [x] Build Speaking module home screen
- [x] Implement random topic generator
- [x] Create topic display card with refresh button
- [x] Implement voice recording functionality (expo-audio)
- [x] Build recording UI (record button, timer, stop button)
- [x] Implement save recording functionality
- [x] Create past recordings list with playback
- [x] Implement difficulty scaling (1-5 stars)
- [x] Add delete recording functionality

## Phase 7: Progress Dashboard
- [x] Build Progress dashboard screen
- [x] Create statistics cards (total entries, daily streak, words learned, hours spent)
- [x] Implement activity timeline (last 7 days)
- [x] Create module breakdown view
- [x] Calculate and display daily streak
- [x] Implement streak persistence

## Phase 8: Settings & Polish
- [x] Build Settings screen
- [x] Implement theme toggle (light/dark mode)
- [x] Create data export functionality
- [x] Implement clear all data with confirmation
- [x] Add About screen with version info
- [x] Implement difficulty settings for speaking topics
- [x] Generate custom app logo (green & white theme)
- [x] Update app.config.ts with branding
- [x] Apply white & green color theme throughout
- [x] Test all CRUD operations
- [x] Test offline functionality
- [x] Test data persistence across app restarts
- [ ] Final UI polish and refinement
