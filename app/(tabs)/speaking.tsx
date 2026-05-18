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
      if (player) {
        player.pause();
      }
    };
  }, [player]);

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
      
      if (!recorder) {
        addDebugLog("✗ Recorder not available");
        Alert.alert("Recording Error", "Audio recorder is not available");
        return;
      }

      if (!isRecorderReady) {
        addDebugLog("⚠ Recorder not ready, preparing...");
        try {
          await recorder.prepareToRecordAsync();
          setIsRecorderReady(true);
          addDebugLog("✓ Recorder prepared");
        } catch (error) {
          addDebugLog(`✗ Failed to prepare recorder: ${error}`);
          Alert.alert("Recording Error", `Failed to prepare recorder: ${error instanceof Error ? error.message : "Unknown error"}`);
          return;
        }
      }

      setRecordingTime(0);
      setIsRecording(true);
      setRecordingUri(null);

      // Explicitly call record() method
      await recorder.record();
      addDebugLog("✓ Recording started successfully");

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
      if (!recorder) {
        addDebugLog("⚠ Recorder not available when stopping");
        setIsRecording(false);
        return;
      }

      addDebugLog("Stopping recording...");
      await recorder.stop();
      setIsRecording(false);

      const uri = recorder.uri;
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
      if (player) {
        await player.pause();
        setPlayer(null);
        if (playingRecordingId === recordingId) {
          setPlayingRecordingId(null);
          return; // Toggle off if same recording
        }
      }

      addDebugLog(`Playing recording: ${recordingUri}`);
      setPlayingRecordingId(recordingId);

      const { createAudioPlayer } = await import("expo-audio");
      const newPlayer = createAudioPlayer({ uri: recordingUri });

      newPlayer.play();
      setPlayer(newPlayer);

      // Auto-clear state when playback finishes
      newPlayer.addListener("playbackStatusUpdate", (status: any) => {
        if (status.didJustFinish) {
          setPlayingRecordingId(null);
          setPlayer(null);
        }
      });
    } catch (error) {
      addDebugLog(`✗ Playback error: ${error}`);
      Alert.alert("Playback Error", `Failed to play recording: ${error instanceof Error ? error.message : "Unknown error"}`);
      setPlayingRecordingId(null);
      setPlayer(null);
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
      <ScreenContainer className="justify-center items-center p-4">
        <View className="items-center gap-4">
          <IconSymbol name="mic.slash.fill" size={48} color={colors.error} />
          <Text className="text-xl font-bold text-foreground text-center">Microphone Permission Required</Text>
          <Text className="text-sm text-muted text-center">{permissionError}</Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    if (AudioModule && typeof AudioModule.requestRecordingPermissionsAsync === "function") {
                      const result = await AudioModule.requestRecordingPermissionsAsync();
                      if (result && result.granted) {
                        setPermissionGranted(true);
                        setPermissionError(null);
                        addDebugLog("✓ Permission granted after retry");
                      }
                    }
                  } catch (error) {
                    addDebugLog(`Error requesting permission: ${error}`);
                  }
                }}
                className="bg-primary px-6 py-3 rounded-full active:opacity-70"
              >
            <Text className="text-background font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
        {debugMessage && (
          <ScrollView className="mt-6 w-full bg-surface p-3 rounded-lg max-h-32">
            <Text className="text-xs text-muted font-mono">{debugMessage}</Text>
          </ScrollView>
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Speaking Practice</Text>
            <Text className="text-sm text-muted">Difficulty: Level {state.currentDifficulty}</Text>
          </View>

          {/* Topic Card */}
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <Text className="text-xs font-semibold text-muted uppercase tracking-wide">Today's Topic</Text>
            <Text className="text-2xl font-bold text-foreground">{currentTopic}</Text>
            <TouchableOpacity
              onPress={handleRefreshTopic}
              className="flex-row items-center gap-2 self-start active:opacity-70"
            >
              <IconSymbol name="arrow.clockwise" size={18} color={colors.primary} />
              <Text className="text-sm font-semibold text-primary">New Topic</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
              <Text className="text-2xl font-bold text-primary">{todayRecordings.length}</Text>
              <Text className="text-xs text-muted mt-1">Today's Recordings</Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border items-center">
              <Text className="text-2xl font-bold text-primary">{state.recordings.length}</Text>
              <Text className="text-xs text-muted mt-1">Total Recordings</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => setShowRecordingModal(true)}
              className="bg-primary rounded-xl py-4 items-center active:opacity-90"
            >
              <View className="flex-row items-center gap-2">
                <IconSymbol name="mic.fill" size={20} color={colors.background} />
                <Text className="text-lg font-bold text-background">Start Recording</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowHistoryModal(true)}
              className="bg-surface rounded-xl py-4 items-center border border-border active:opacity-90"
            >
              <View className="flex-row items-center gap-2">
                <IconSymbol name="clock.fill" size={20} color={colors.primary} />
                <Text className="text-lg font-bold text-foreground">View History</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Debug Info */}
          {debugMessage && (
            <View className="bg-surface rounded-lg p-3 border border-border">
              <Text className="text-xs font-semibold text-muted mb-2">Debug Log:</Text>
              <ScrollView className="max-h-24">
                <Text className="text-xs text-muted font-mono">{debugMessage}</Text>
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Recording Modal */}
      <Modal visible={showRecordingModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 gap-6">
            <View className="gap-2">
              <Text className="text-2xl font-bold text-foreground">Record Your Speaking</Text>
              <Text className="text-sm text-muted">Topic: {currentTopic}</Text>
            </View>

            {/* Recording Display */}
            <View className="bg-surface rounded-2xl p-6 items-center gap-4 border border-border">
              <View className="flex-row items-center gap-2">
                <View className={`w-3 h-3 rounded-full ${isRecording ? "bg-error" : "bg-muted"}`} />
                <Text className="text-lg font-bold text-foreground">
                  {isRecording ? "Recording..." : "Ready"}
                </Text>
              </View>
              <Text className="text-4xl font-bold text-primary font-mono">
                {formatDuration(recordingTime)}
              </Text>
            </View>

            {/* Recording Controls */}
            <View className="flex-row gap-3">
              {!isRecording ? (
              <TouchableOpacity
                onPress={handleStartRecording}
                className="flex-1 bg-primary rounded-xl py-4 items-center active:opacity-90"
              >
                  <View className="flex-row items-center gap-2">
                    <IconSymbol name="record.circle.fill" size={20} color={colors.background} />
                    <Text className="text-lg font-bold text-background">Start</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleStopRecording}
                  className="flex-1 bg-error rounded-xl py-4 items-center active:opacity-90"
                >
                  <View className="flex-row items-center gap-2">
                    <IconSymbol name="stop.circle.fill" size={20} color={colors.background} />
                    <Text className="text-lg font-bold text-background">Stop</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Save/Cancel Buttons */}
            {recordingUri && !isRecording && (
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={handleSaveRecording}
                  className="flex-1 bg-success rounded-xl py-3 items-center active:opacity-90"
                >
                  <Text className="text-base font-bold text-background">Save Recording</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
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

      {/* History Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 max-h-3/4">
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
                  <Text className="text-muted">No recordings yet. Start practicing!</Text>
                </View>
              ) : (
                <FlatList
                  data={allRecordings}
                  keyExtractor={(item) => item.date}
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
