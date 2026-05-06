import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLearning } from "@/lib/learning-context";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect, useMemo, useRef } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { getRandomTopic, formatDuration } from "@/lib/speaking-topics";
import { setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";

export default function SpeakingScreen() {
  const { state, dispatch } = useLearning();
  const colors = useColors();

  const [currentTopic, setCurrentTopic] = useState("");
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [debugMessage, setDebugMessage] = useState<string>("");

  const today = new Date().toISOString().split("T")[0];
  const recorderRef = useRef<any>(null);

  // Helper function to log debug messages
  const addDebugLog = (message: string) => {
    console.log(`[Speaking Debug] ${message}`);
    setDebugMessage((prev) => `${prev}\n${message}`.slice(-500)); // Keep last 500 chars
  };

  // Safe initialization: Check and request permissions properly
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        setIsInitializing(true);
        addDebugLog("Starting audio initialization...");

        // Step 1: Set audio mode
        try {
          addDebugLog("Setting audio mode...");
          await setAudioModeAsync({ playsInSilentMode: true });
          addDebugLog("✓ Audio mode set successfully");
        } catch (error) {
          addDebugLog(`⚠ Audio mode setup warning: ${error}`);
        }

        // Step 2: Check environment and set permission status
        try {
          addDebugLog("Checking environment...");
          
          // On web, microphone access is handled by browser
          if (Platform.OS === "web") {
            addDebugLog("Web environment detected - microphone access handled by browser");
            setPermissionGranted(true);
            setPermissionError(null);
            setIsInitializing(false);
            return;
          }

          // On native platforms, assume permission is available
          // Actual permission will be requested by the OS when recording starts
          addDebugLog("Native platform detected - permission will be requested on first recording");
          setPermissionGranted(true);
          setPermissionError(null);
        } catch (error) {
          addDebugLog(`⚠ Environment check note: ${error}`);
          console.warn("Environment check warning:", error);
          // Set to true optimistically and let recording attempt handle actual permission
          setPermissionGranted(true);
          setPermissionError(null);
        }

        setIsInitializing(false);
      } catch (error) {
        addDebugLog(`✗ Audio initialization error: ${error}`);
        console.error("Audio initialization error:", error);
        setIsInitializing(false);
        setPermissionGranted(false);
        setPermissionError(`Initialization error: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };

    initializeAudio();
  }, []);

  // Initialize recorder only when needed (lazy initialization)
  const initializeRecorder = async () => {
    try {
      if (recorderRef.current) {
        addDebugLog("Recorder already initialized");
        return recorderRef.current;
      }

      addDebugLog("Initializing audio recorder...");

      const recorder = useAudioRecorder({
        extension: ".m4a",
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      } as any);

      recorderRef.current = recorder;
      addDebugLog("✓ Recorder initialized successfully");
      return recorder;
    } catch (error) {
      addDebugLog(`✗ Recorder initialization failed: ${error}`);
      console.error("Failed to initialize recorder:", error);
      throw error;
    }
  };

  // Generate initial topic
  useEffect(() => {
    setCurrentTopic(getRandomTopic(state.currentDifficulty));
  }, [state.currentDifficulty]);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleRefreshTopic = () => {
    const newTopic = getRandomTopic(state.currentDifficulty);
    setCurrentTopic(newTopic);
    if (Platform.OS !== "web") {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.warn("Haptics not available:", error);
      }
    }
  };

  const handleStartRecording = async () => {
    try {
      addDebugLog("Starting recording...");
      const recorder = await initializeRecorder();
      setRecordingTime(0);
      setIsRecording(true);
      setRecordingUri(null);

      await recorder.record();
      addDebugLog("✓ Recording started");

      if (Platform.OS !== "web") {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.warn("Haptics not available:", error);
        }
      }
    } catch (error) {
      addDebugLog(`✗ Recording start error: ${error}`);
      console.error("Recording start error:", error);
      setIsRecording(false);
      Alert.alert("Recording Error", `Failed to start recording: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      if (!recorderRef.current) {
        addDebugLog("⚠ Recorder not initialized when stopping");
        setIsRecording(false);
        return;
      }

      addDebugLog("Stopping recording...");
      await recorderRef.current.stop();
      setIsRecording(false);

      const uri = recorderRef.current.uri;
      if (uri) {
        setRecordingUri(uri);
        addDebugLog(`✓ Recording stopped, URI: ${uri}`);
      } else {
        addDebugLog("⚠ Recording stopped but no URI returned");
      }

      if (Platform.OS !== "web") {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.warn("Haptics not available:", error);
        }
      }
    } catch (error) {
      addDebugLog(`✗ Stop recording error: ${error}`);
      console.error("Stop recording error:", error);
      setIsRecording(false);
      Alert.alert("Stop Recording Error", `Failed to stop recording: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleSaveRecording = async () => {
    if (recordingTime === 0 || !recordingUri) {
      addDebugLog("Cannot save: no recording data");
      Alert.alert("No Recording", "Please record something before saving.");
      return;
    }

    try {
      addDebugLog("Saving recording...");
      const fileName = `recording_${Date.now()}.m4a`;
      const destUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: recordingUri,
        to: destUri,
      });

      addDebugLog(`✓ Recording saved to ${destUri}`);

      dispatch({
        type: "ADD_RECORDING",
        payload: {
          id: Date.now().toString(),
          topic: currentTopic,
          duration: recordingTime,
          uri: destUri,
          date: today,
          createdAt: Date.now(),
        },
      });

      setRecordingTime(0);
      setRecordingUri(null);
      setShowRecordingModal(false);
      Alert.alert("Saved", `Recording saved! Duration: ${formatDuration(recordingTime)}`);
    } catch (error) {
      addDebugLog(`✗ Save recording error: ${error}`);
      console.error("Save recording error:", error);
      Alert.alert("Save Error", `Failed to save recording: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    Alert.alert("Delete Recording", "Are you sure you want to delete this recording?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            addDebugLog(`Deleting recording ${recordingId}...`);
            const recording = state.recordings.find((r) => r.id === recordingId);
            if (recording && recording.uri) {
              await FileSystem.deleteAsync(recording.uri, { idempotent: true });
              addDebugLog(`✓ Recording file deleted`);
            }
            dispatch({ type: "DELETE_RECORDING", payload: recordingId });
            setSelectedRecording(null);
            if (Platform.OS !== "web") {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              } catch (error) {
                console.warn("Haptics not available:", error);
              }
            }
          } catch (error) {
            addDebugLog(`✗ Error deleting recording: ${error}`);
            console.error("Error deleting recording:", error);
            Alert.alert("Delete Error", `Failed to delete recording: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        },
      },
    ]);
  };

  const handlePlayRecording = async (recordingUri: string, recordingId: string) => {
    try {
      if (playingRecordingId === recordingId) {
        addDebugLog("Stopping playback");
        setPlayingRecordingId(null);
      } else {
        addDebugLog(`Starting playback of ${recordingId}`);
        setPlayingRecordingId(recordingId);
        if (Platform.OS !== "web") {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (error) {
            console.warn("Haptics not available:", error);
          }
        }
      }
    } catch (error) {
      addDebugLog(`✗ Playback error: ${error}`);
      console.error("Playback error:", error);
      Alert.alert("Playback Error", `Failed to play recording: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const todayRecordings = useMemo(
    () => state.recordings.filter((r) => r.date === today),
    [state.recordings, today]
  );

  const totalRecordingTime = useMemo(
    () => state.recordings.reduce((sum, r) => sum + r.duration, 0),
    [state.recordings]
  );

  // Show loading while initializing
  if (isInitializing) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted mt-4">Initializing audio...</Text>
        {debugMessage && (
          <View className="mt-6 bg-surface rounded-lg p-4 w-full max-h-32">
            <Text className="text-xs text-muted font-mono">{debugMessage}</Text>
          </View>
        )}
      </ScreenContainer>
    );
  }

  // Show permission error if not granted (only show if explicitly denied)
  if (permissionGranted === false && permissionError) {
    return (
      <ScreenContainer className="p-6 items-center justify-center">
        <View className="gap-4 items-center">
          <IconSymbol size={64} name="mic.slash.fill" color={colors.error} />
          <Text className="text-2xl font-bold text-foreground text-center">
            Microphone Access Required
          </Text>
          <Text className="text-muted text-center text-sm">
            {permissionError}
          </Text>

          {/* Debug info */}
          {debugMessage && (
            <View className="mt-4 bg-surface rounded-lg p-3 w-full border border-border">
              <Text className="text-xs font-semibold text-foreground mb-2">Debug Info:</Text>
              <Text className="text-xs text-muted font-mono">{debugMessage}</Text>
            </View>
          )}

          <View className="gap-2 w-full mt-4">
            <TouchableOpacity
              onPress={() => {
                addDebugLog("User tapped 'Try Again'");
                setIsInitializing(true);
                const reinit = async () => {
                  try {
                    addDebugLog("Re-initializing audio...");
                    await setAudioModeAsync({ playsInSilentMode: true });
                    addDebugLog("Audio re-initialized successfully");
                    setPermissionGranted(true);
                    setPermissionError(null);
                    setIsInitializing(false);
                  } catch (error) {
                    addDebugLog(`Re-init error: ${error}`);
                    console.error("Re-init error:", error);
                    setIsInitializing(false);
                  }
                };
                reinit();
              }}
              className="bg-primary rounded-lg px-6 py-3"
            >
              <Text className="text-white font-semibold text-center">Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Enable Microphone Permission",
                  "Go to Settings > Apps > English Learning > Permissions > Microphone and select 'Allow'",
                  [{ text: "OK" }]
                );
              }}
              className="border border-border rounded-lg px-6 py-3"
            >
              <Text className="text-foreground font-semibold text-center">Open Settings Guide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Speaking</Text>
            <Text className="text-sm text-muted">Practice speaking with random topics</Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-primary">{todayRecordings.length}</Text>
              <Text className="text-xs text-muted mt-1">Today</Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-primary">{formatDuration(totalRecordingTime)}</Text>
              <Text className="text-xs text-muted mt-1">Total Time</Text>
            </View>
          </View>

          {/* Difficulty Selector */}
          <View className="gap-3">
            <Text className="text-sm font-medium text-foreground">Difficulty Level</Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => dispatch({ type: "SET_DIFFICULTY", payload: level })}
                  className={`flex-1 rounded-lg py-2 items-center border ${
                    state.currentDifficulty === level
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`font-semibold ${
                      state.currentDifficulty === level ? "text-white" : "text-foreground"
                    }`}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Topic Card */}
          <View className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
            <Text className="text-sm text-green-700 font-medium mb-2">Today's Topic</Text>
            <Text className="text-2xl font-bold text-green-900 mb-4">{currentTopic}</Text>
            <TouchableOpacity
              onPress={handleRefreshTopic}
              className="flex-row items-center gap-2 self-start"
              activeOpacity={0.7}
            >
              <IconSymbol size={16} name="chevron.right" color="#15803d" />
              <Text className="text-sm font-medium text-green-700">Get New Topic</Text>
            </TouchableOpacity>
          </View>

          {/* Recording Button */}
          <TouchableOpacity
            onPress={() => {
              addDebugLog("User tapped 'Start Recording'");
              setShowRecordingModal(true);
            }}
            className="rounded-full py-6 items-center justify-center bg-primary"
            activeOpacity={0.8}
          >
            <IconSymbol size={40} name="mic.fill" color="white" />
            <Text className="font-semibold mt-2 text-white">Start Recording</Text>
          </TouchableOpacity>

          {/* Today's Recordings */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">Today's Recordings</Text>
              {todayRecordings.length > 0 && (
                <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
                  <Text className="text-sm text-primary font-medium">View All</Text>
                </TouchableOpacity>
              )}
            </View>

            {todayRecordings.length > 0 ? (
              todayRecordings.slice(0, 3).map((recording) => (
                <TouchableOpacity
                  key={recording.id}
                  onPress={() => {
                    setSelectedRecording(recording);
                    setShowHistoryModal(true);
                  }}
                  activeOpacity={0.7}
                  className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{recording.topic}</Text>
                    <Text className="text-xs text-muted mt-1">{formatDuration(recording.duration)}</Text>
                  </View>
                  <IconSymbol size={20} name="chevron.right" color={colors.muted} />
                </TouchableOpacity>
              ))
            ) : (
              <View className="bg-surface rounded-lg p-6 items-center border border-border">
                <IconSymbol size={32} name="mic.fill" color={colors.muted} />
                <Text className="text-muted mt-2 text-center text-sm">No recordings yet today</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Recording Modal */}
      <Modal
        visible={showRecordingModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isRecording) {
            setShowRecordingModal(false);
          }
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-background rounded-3xl p-8 w-5/6 gap-6">
            <View className="items-center">
              <Text className="text-xl font-bold text-foreground mb-2">Recording</Text>
              <Text className="text-sm text-muted text-center">{currentTopic}</Text>
            </View>

            {/* Timer Display */}
            <View className="bg-surface rounded-2xl p-6 items-center border border-border">
              <Text className="text-5xl font-bold text-primary font-mono">
                {formatDuration(recordingTime)}
              </Text>
              <Text className="text-xs text-muted mt-2">{isRecording ? "Recording..." : "Paused"}</Text>
            </View>

            {/* Recording Controls */}
            <View className="flex-row gap-3 justify-center">
              {!isRecording ? (
                <TouchableOpacity
                  onPress={handleStartRecording}
                  className="bg-primary rounded-full p-4 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <IconSymbol size={32} name="mic.fill" color="white" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleStopRecording}
                  className="bg-error rounded-full p-4 items-center justify-center"
                  activeOpacity={0.8}
                >
                  <View className="w-6 h-6 bg-white rounded-sm" />
                </TouchableOpacity>
              )}
            </View>

            {/* Save/Cancel Buttons */}
            <View className="gap-2">
              <TouchableOpacity
                onPress={handleSaveRecording}
                disabled={recordingTime === 0}
                className={`rounded-lg py-3 items-center ${
                  recordingTime === 0 ? "bg-surface opacity-50" : "bg-primary"
                }`}
                activeOpacity={0.8}
              >
                <Text className={`font-semibold ${recordingTime === 0 ? "text-muted" : "text-white"}`}>
                  Save Recording
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowRecordingModal(false);
                  setRecordingTime(0);
                  setIsRecording(false);
                }}
                className="border border-border rounded-lg py-3 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-foreground font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <ScreenContainer className="p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-foreground">Recording History</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Text className="text-2xl text-muted">×</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={state.recordings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
                <TouchableOpacity
                  onPress={() => setSelectedRecording(item)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">{item.topic}</Text>
                    <View className="flex-row gap-2 mt-1">
                      <Text className="text-xs text-muted">{formatDuration(item.duration)}</Text>
                      <Text className="text-xs text-muted">•</Text>
                      <Text className="text-xs text-muted">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteRecording(item.id)}
                    className="ml-2"
                  >
                    <IconSymbol size={20} name="chevron.right" color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>

                <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-border">
                  <TouchableOpacity
                    onPress={() => handlePlayRecording(item.uri, item.id)}
                    className="flex-1 flex-row items-center justify-center gap-2 bg-primary/10 rounded-lg py-2"
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      size={16}
                      name={playingRecordingId === item.id ? "pause.fill" : "play.fill"}
                      color={colors.primary}
                    />
                    <Text className="text-sm font-medium text-primary">
                      {playingRecordingId === item.id ? "Playing" : "Play"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            scrollEnabled={true}
            ListEmptyComponent={
              <View className="items-center justify-center py-8">
                <Text className="text-muted">No recordings yet</Text>
              </View>
            }
          />

          <TouchableOpacity
            onPress={() => setShowHistoryModal(false)}
            className="border border-border rounded-lg py-3 items-center mt-4"
            activeOpacity={0.8}
          >
            <Text className="text-foreground font-semibold">Close</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
