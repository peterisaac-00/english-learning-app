import React, { createContext, useContext, useReducer, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============= TYPE DEFINITIONS =============

export interface WritingEntry {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  wordCount: number;
  createdAt: number;
}

export interface VocabularyWord {
  id: string;
  word: string;
  meaning: string;
  dateAdded: string; // YYYY-MM-DD
  createdAt: number;
}

export interface ReadingItem {
  id: string;
  title: string;
  content: string; // Text or URL
  progress: number; // 0-100
  createdAt: number;
  updatedAt: number;
}

export interface ListeningItem {
  id: string;
  title: string;
  source: string; // URL or file path
  progress: number; // 0-100
  summary: string; // User's understanding summary
  createdAt: number;
  updatedAt: number;
}

export interface Recording {
  id: string;
  topic: string;
  duration: number; // in seconds
  uri: string; // File URI
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface SpeakingTopic {
  id: string;
  text: string;
  difficulty: number; // 1-5
}

export interface LearningState {
  writingEntries: WritingEntry[];
  vocabularyWords: VocabularyWord[];
  readingItems: ReadingItem[];
  listeningItems: ListeningItem[];
  recordings: Recording[];
  speakingTopics: SpeakingTopic[];
  currentDifficulty: number; // 1-5 for speaking
  isLoading: boolean;
}

export type LearningAction =
  | { type: "SET_STATE"; payload: LearningState }
  | { type: "ADD_WRITING_ENTRY"; payload: WritingEntry }
  | { type: "UPDATE_WRITING_ENTRY"; payload: WritingEntry }
  | { type: "DELETE_WRITING_ENTRY"; payload: string }
  | { type: "ADD_VOCABULARY_WORD"; payload: VocabularyWord }
  | { type: "DELETE_VOCABULARY_WORD"; payload: string }
  | { type: "ADD_READING_ITEM"; payload: ReadingItem }
  | { type: "UPDATE_READING_ITEM"; payload: ReadingItem }
  | { type: "DELETE_READING_ITEM"; payload: string }
  | { type: "ADD_LISTENING_ITEM"; payload: ListeningItem }
  | { type: "UPDATE_LISTENING_ITEM"; payload: ListeningItem }
  | { type: "DELETE_LISTENING_ITEM"; payload: string }
  | { type: "ADD_RECORDING"; payload: Recording }
  | { type: "DELETE_RECORDING"; payload: string }
  | { type: "SET_DIFFICULTY"; payload: number }
  | { type: "SET_LOADING"; payload: boolean };

// ============= INITIAL STATE =============

const initialState: LearningState = {
  writingEntries: [],
  vocabularyWords: [],
  readingItems: [],
  listeningItems: [],
  recordings: [],
  speakingTopics: [],
  currentDifficulty: 1,
  isLoading: true,
};

// ============= REDUCER =============

function learningReducer(state: LearningState, action: LearningAction): LearningState {
  switch (action.type) {
    case "SET_STATE":
      return action.payload;

    case "ADD_WRITING_ENTRY":
      return {
        ...state,
        writingEntries: [action.payload, ...state.writingEntries],
      };

    case "UPDATE_WRITING_ENTRY":
      return {
        ...state,
        writingEntries: state.writingEntries.map((entry) =>
          entry.id === action.payload.id ? action.payload : entry
        ),
      };

    case "DELETE_WRITING_ENTRY":
      return {
        ...state,
        writingEntries: state.writingEntries.filter((entry) => entry.id !== action.payload),
      };

    case "ADD_VOCABULARY_WORD":
      return {
        ...state,
        vocabularyWords: [action.payload, ...state.vocabularyWords],
      };

    case "DELETE_VOCABULARY_WORD":
      return {
        ...state,
        vocabularyWords: state.vocabularyWords.filter((word) => word.id !== action.payload),
      };

    case "ADD_READING_ITEM":
      return {
        ...state,
        readingItems: [action.payload, ...state.readingItems],
      };

    case "UPDATE_READING_ITEM":
      return {
        ...state,
        readingItems: state.readingItems.map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };

    case "DELETE_READING_ITEM":
      return {
        ...state,
        readingItems: state.readingItems.filter((item) => item.id !== action.payload),
      };

    case "ADD_LISTENING_ITEM":
      return {
        ...state,
        listeningItems: [action.payload, ...state.listeningItems],
      };

    case "UPDATE_LISTENING_ITEM":
      return {
        ...state,
        listeningItems: state.listeningItems.map((item) =>
          item.id === action.payload.id ? action.payload : item
        ),
      };

    case "DELETE_LISTENING_ITEM":
      return {
        ...state,
        listeningItems: state.listeningItems.filter((item) => item.id !== action.payload),
      };

    case "ADD_RECORDING":
      return {
        ...state,
        recordings: [action.payload, ...state.recordings],
      };

    case "DELETE_RECORDING":
      return {
        ...state,
        recordings: state.recordings.filter((rec) => rec.id !== action.payload),
      };

    case "SET_DIFFICULTY":
      return {
        ...state,
        currentDifficulty: action.payload,
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    default:
      return state;
  }
}

// ============= CONTEXT =============

interface LearningContextType {
  state: LearningState;
  dispatch: React.Dispatch<LearningAction>;
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(learningReducer, initialState);

  const saveState = async () => {
    try {
      await AsyncStorage.setItem("learningState", JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save learning state:", error);
    }
  };

  const loadState = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const savedState = await AsyncStorage.getItem("learningState");
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        dispatch({ type: "SET_STATE", payload: parsedState });
      }
    } catch (error) {
      console.error("Failed to load learning state:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  // Load state on mount
  useEffect(() => {
    loadState();
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (!state.isLoading) {
      saveState();
    }
  }, [state]);

  return (
    <LearningContext.Provider value={{ state, dispatch, saveState, loadState }}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error("useLearning must be used within LearningProvider");
  }
  return context;
}
