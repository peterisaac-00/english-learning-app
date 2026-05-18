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
import { setAudioModeAsync, useAudioRecorder, RecordingPresets, AudioModule } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";

export default function SpeakingScreen() {
  const { state, dispatch } = useLearning();
  const colors = useColors();

  // Initialize audio recorder at component top level (CORRECT HOOK USAGE)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

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
  const [isRecorderReady, setIsRecorderReady] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const soundRef = useRef<any>(null);

  const today = new Date().toISOString().split("T")[0];

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
          await setAudioModeAsync({ 
            playsInSilentMode: true,
          });
          addDebugLog("✓ Audio mode set successfully");
        } catch (error) {
          addDebugLog(`⚠ Audio mode setup warning: ${error}`);
        }

        // Step 2: Request microphone permission on native platforms
        if (Platform.OS !== "web") {
          try {
            addDebugLog("Requesting microphone permission...");
            
            // Check if AudioModule.requestRecordingPermissionsAsync exists
            if (AudioModule && typeof AudioModule.requestRecordingPermissionsAsync === "function") {
              const permissionResult = await AudioModule.requestRecordingPermissionsAsync();
              addDebugLog(`Permission request result: ${JSON.stringify(permissionResult)}`);
              
              if (permissionResult && permissionResult.granted) {
                addDebugLog("✓ Microphone permission granted");
                setPermissionGranted(true);
                setPermissionError(null);
              } else {
                addDebugLog("✗ Microphone permission denied by user");
                setPermissionGranted(false);
                setPermissionError("Microphone permission is required to record. Please enable it in Settings.");
              }
            } else {
              addDebugLog("⚠ AudioModule.requestRecordingPermissionsAsync not available, assuming permission granted");
              setPermissionGranted(true);
              setPermissionError(null);
            }
          } catch (error) {
            addDebugLog(`⚠ Permission request error: ${error}`);
            // Optimistically assume permission might be granted
            setPermissionGranted(true);
            setPermissionError(null);
          }
        } else {
          // Web environment
          addDebugLog("Web environment detected - microphone access handled by browser");
          setPermissionGranted(true);
          setPermissionError(null);
        }

        // Step 3: Prepare recorder
        try {
          addDebugLog("Preparing audio recorder...");
          await recorder.prepareToRecordAsync();
          addDebugLog("✓ Audio recorder prepared");
          setIsRecorderReady(true);
        } catch (error) {
          addDebugLog(`⚠ Recorder preparation warning: ${error}`);
          setIsRecorderReady(true); // Continue anyway
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
  }, [recorder]);

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

  // Cleanup playback on component unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        try {
          soundRef.current.pauseAsync();
          soundRef.current.unloadAsync();
        } catch (e) {
          console.warn("Error cleaning up audio:", e);
        }
        soundRef.current = null;
      }
    };
  }, []);

  const handleRefreshTopic = () => {
    const newTopic = getRandomTopic(state.currentDifficulty);
    setCurrentTopic(newTopic);
    addDebugLog(`Topic refreshed: ${newTopic}`);
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
      if (!isRecorderReady) {
        addDebugLog("✗ Recorder not ready yet");
        Alert.alert("Not Ready", "Audio recorder is still initializing. Please wait.");
        return;
      }

      addDebugLog("Starting recording...");
      setIsRecording(true);
      setRecordingTime(0);

      await recorder.record();
      addDebugLog("✓ Recording started");

      if (Platform.OS !== "web") {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      addDebugLog("Stopping recording...");
      setIsRecording(false);

      const result = await recorder.stop();
      const resultUri = typeof result === 'string' ? result : (result as any)?.uri || null;
      addDebugLog(`✓ Recording stopped. URI: ${resultUri}`);
      setRecordingUri(resultUri);

      if (Platform.OS !== "web") {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.warn("Haptics not available:", error);
        }
      }
    } catch (error) {
      addDebugLog(`✗ Recording stop error: ${error}`);
      console.error("Recording stop error:", error);
      setIsRecording(false);
      Alert.alert("Recording Error", `Failed to stop recording: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleSaveRecording = async () => {
    try {
      if (!recordingUri) {
        addDebugLog("✗ No recording URI available");
        Alert.alert("Error", "No recording to save");
        return;
      }

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
          id: `rec_${Date.now()}`,
          date: today,
          topic: currentTopic,
          duration: recordingTime,
          uri: destUri,
          createdAt: Date.now(),
        },
      });

      addDebugLog("✓ Recording added to history");
      setRecordingUri(null);
      setRecordingTime(0);
      setShowRecordingModal(false);

      if (Platform.OS !== "web") {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.warn("Haptics not available:", error);
        }
      }

      Alert.alert("Success", "Recording saved successfully!");
    } catch (error) {
      addDebugLog(`✗ Save recording error: ${error}`);
      console.error("Save recording error:", error);
      Alert.alert("Save Error", `Failed to save recording: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handlePlayRecording = async (recordingUri: string, recordingId: string) => {
    try {
      // Stop any currently playing audio
      if (soundRef.current) {
        try {
          await soundRef.current.pauseAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.warn("Error stopping previous playback:", e);
        }
        soundRef.current = null;
        if (playingRecordingId === recordingId) {
          setPlayingRecordingId(null);
          return; // Toggle off if same recording
        }
      }

      addDebugLog(`Playing recording: ${recordingUri}`);
      setPlayingRecordingId(recordingId);

      const { createAudioPlayer } = await import("expo-audio");
      const newPlayer = createAudioPlayer({ uri: recordingUri });
      soundRef.current = newPlayer;

      await newPlayer.play();

      // Auto-clear state when playback finishes
      newPlayer.addListener("playbackStatusUpdate", (status: any) => {
        if (status.didJustFinish) {
          setPlayingRecordingId(null);
          // Cleanup
          if (soundRef.current === newPlayer) {
            soundRef.current = null;
          }
        }
      });
    } catch (error) {
      addDebugLog(`✗ Playback error: ${error}`);
      Alert.alert("Playback Error", `Failed to play recording: ${error instanceof Error ? error.message : "Unknown error"}`);
      setPlayingRecordingId(null);
      soundRef.current = null;
    }
  };

  const handleDeleteRecording = (recordingId: string) => {
    Alert.alert("Delete Recording", "Are you sure you want to delete this recording?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Delete",
        onPress: () => {
          dispatch({
            type: "DELETE_RECORDING",
            payload: recordingId,
          });
          addDebugLog(`✓ Recording deleted: ${recordingId}`);
        },
      },
    ]);
  };

  const todayRecordings = useMemo(
    () => state.recordings.filter((r) => r.date === today),
    [state.recordings, today]
  );

  const allRecordings = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    state.recordings.forEach((recording) => {
      if (!grouped[recording.date]) {
        grouped[recording.date] = [];
      }
      grouped[recording.date].push(recording);
    });
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, recordings]) => ({
        date,
        recordings: recordings.sort((a, b) => b.id.localeCompare(a.id)),
      }));
  }, [state.recordings]);

  if (isInitializing) {
    return (
      <ScreenContainer className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-foreground">Initializing audio...</Text>
        {debugMessage && (
          <ScrollView className="mt-4 w-full max-w-sm bg-surface p-3 rounded-lg max-h-40">
            <Text className="text-xs text-muted font-mono">{debugMessage}</Text>
          </ScrollView>
        )}
      </ScreenContainer>
    );
  }

  if (permissionGranted === false) {
    return (
      <ScreenContainer className="justify-center items-center p-6 gap-4">
        <Text className="text-2xl font-bold text-foreground text-center">Microphone Access Required</Text>
        <Text className="text-base text-muted text-center">{permissionError}</Text>
        <TouchableOpacity
          onPress={() => {
            setPermissionGranted(null);
            setIsInitializing(true);
          }}
          className="bg-primary rounded-xl px-6 py-3 active:opacity-80"
        >
          <Text className="text-background font-semibold text-center">Try Again</Text>
        </TouchableOpacity>
        {debugMessage && (
          <ScrollView className="w-full bg-surface p-3 rounded-lg max-h-40">
            <Text className="text-xs text-muted font-mono">{debugMessage}</Text>
          </ScrollView>
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="gap-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="gap-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Speaking Practice</Text>
          <Text className="text-base text-muted">Difficulty: Level {state.currentDifficulty}</Text>
        </View>

        {/* Today's Topic Card */}
        <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
          <Text className="text-sm font-semibold text-muted uppercase tracking-wide">Today's Topic</Text>
          <Text className="text-2xl font-bold text-foreground">{currentTopic}</Text>
          <TouchableOpacity
            onPress={handleRefreshTopic}
            className="active:opacity-70"
          >
            <Text className="text-primary font-semibold">New Topic</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="flex-row gap-4">
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
            <Text className="text-2xl font-bold text-primary">{todayRecordings.length}</Text>
            <Text className="text-xs text-muted mt-1">Today's Recordings</Text>
          </View>
          <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
            <Text className="text-2xl font-bold text-primary">{state.recordings.length}</Text>
            <Text className="text-xs text-muted mt-1">Total Recordings</Text>
          </View>
        </View>

        {/* Recording Button */}
        <TouchableOpacity
          onPress={() => {
            setShowRecordingModal(true);
            if (!isRecording) {
              handleStartRecording();
            }
          }}
          className="bg-primary rounded-2xl py-4 items-center active:opacity-80"
        >
          <View className="flex-row items-center gap-2">
            <IconSymbol name="mic.fill" size={24} color={colors.background} />
            <Text className="text-lg font-bold text-background">Start Recording</Text>
          </View>
        </TouchableOpacity>

        {/* View History Button */}
        <TouchableOpacity
          onPress={() => setShowHistoryModal(true)}
          className="bg-surface rounded-2xl py-4 items-center border border-border active:opacity-70"
        >
          <Text className="text-lg font-bold text-foreground">View History</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Recording Modal */}
      <Modal visible={showRecordingModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 gap-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-foreground">Recording</Text>
              <Text className="text-lg font-semibold text-primary">{formatDuration(recordingTime)}</Text>
            </View>

            <View className="bg-surface rounded-xl p-6 items-center border border-border">
              <Text className="text-sm text-muted mb-2">Topic</Text>
              <Text className="text-xl font-bold text-foreground text-center">{currentTopic}</Text>
            </View>

            {isRecording && (
              <TouchableOpacity
                onPress={handleStopRecording}
                className="bg-error rounded-xl py-3 items-center active:opacity-80"
              >
                <Text className="text-base font-bold text-background">Stop Recording</Text>
              </TouchableOpacity>
            )}

            {recordingUri && (
              <View className="gap-3">
                <TouchableOpacity
                  onPress={handleSaveRecording}
                  className="bg-primary rounded-xl py-3 items-center active:opacity-80"
                >
                  <Text className="text-base font-bold text-background">Save Recording</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (isRecording) {
                      handleStopRecording();
                    }
                    setShowRecordingModal(false);
                    setRecordingUri(null);
                    setRecordingTime(0);
                  }}
                  className="flex-1 bg-surface rounded-xl py-3 items-center border border-border active:opacity-90"
                >
                  <Text className="text-base font-bold text-foreground">Discard</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                if (isRecording) {
                  handleStopRecording();
                }
                setShowRecordingModal(false);
                setRecordingUri(null);
                setRecordingTime(0);
              }}
              className="bg-surface rounded-xl py-3 items-center border border-border active:opacity-90"
            >
              <Text className="text-base font-bold text-foreground">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* History Modal - FIXED LAYOUT */}
      <Modal visible={showHistoryModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 h-3/4 flex-1">
            <View className="gap-4 flex-1">
              <View className="flex-row justify-between items-center">
                <Text className="text-2xl font-bold text-foreground">Recording History</Text>
                <TouchableOpacity
                  onPress={() => setShowHistoryModal(false)}
                  className="active:opacity-70"
                >
                  <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {allRecordings.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                  <Text className="text-muted text-center">No recordings yet. Start practicing!</Text>
                </View>
              ) : (
                <FlatList
                  data={allRecordings}
                  keyExtractor={(item) => item.date}
                  scrollEnabled={true}
                  renderItem={({ item: dateGroup }) => (
                    <View className="gap-2 mb-4">
                      <Text className="text-sm font-semibold text-muted">
                        {new Date(dateGroup.date).toLocaleDateString()}
                      </Text>
                      {dateGroup.recordings.map((recording) => (
                        <View key={recording.id} className="bg-surface rounded-lg p-4 border border-border flex-row justify-between items-center">
                          <View className="flex-1 gap-1">
                            <Text className="font-semibold text-foreground">{recording.topic}</Text>
                            <Text className="text-xs text-muted">
                              {formatDuration(recording.duration)} • {new Date(recording.date).toLocaleDateString()}
                            </Text>
                          </View>
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => handlePlayRecording(recording.uri, recording.id)}
                              className="active:opacity-70"
                            >
                              <IconSymbol
                                name={playingRecordingId === recording.id ? "pause.circle.fill" : "play.circle.fill"}
                                size={24}
                                color={colors.primary}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteRecording(recording.id)}
                              className="active:opacity-70"
                            >
                              <IconSymbol name="trash.fill" size={24} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
