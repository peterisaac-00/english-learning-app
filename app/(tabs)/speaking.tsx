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
import { useState, useEffect, useMemo } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { getRandomTopic, formatDuration } from "@/lib/speaking-topics";
import { useAudioPlayer, setAudioModeAsync, useAudioRecorder, AudioModule, useAudioPlayerStatus } from "expo-audio";
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
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  const today = new Date().toISOString().split("T")[0];
  const recorder = useAudioRecorder({
    extension: ".m4a",
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    android: {
      extension: ".m4a",
      outputFormat: 2,
      audioEncoder: 3,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
    },
    ios: {
      extension: ".m4a",
      audioQuality: 96,
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/webm",
      bitsPerSecond: 128000,
    },
  } as any);

  // Initialize audio mode and request permissions
  useEffect(() => {
    const initAudio = async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        // Request microphone permission
        const permission = await AudioModule.requestPermissionsAsync();
        setPermissionGranted(permission.granted);
      } catch (error) {
        console.error("Failed to set audio mode:", error);
      }
    };
    initAudio();
  }, []);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleStartRecording = async () => {
    if (!permissionGranted) {
      Alert.alert("Permission Denied", "Microphone permission is required to record.");
      return;
    }

    try {
      setRecordingTime(0);
      setIsRecording(true);
      setRecordingUri(null);
      await recorder.record();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Recording Error", "Failed to start recording.");
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      await recorder.stop();
      setIsRecording(false);
      // The recorder.uri contains the path to the saved recording
      if (recorder.uri) {
        setRecordingUri(recorder.uri);
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Stop Recording Error", "Failed to stop recording.");
    }
  };

  const handleSaveRecording = async () => {
    if (recordingTime === 0 || !recordingUri) {
      Alert.alert("No Recording", "Please record something before saving.");
      return;
    }

    try {
      // Save recording to app's document directory
      const fileName = `recording_${Date.now()}.m4a`;
      const destUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({
        from: recordingUri,
        to: destUri,
      });

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
      Alert.alert("Save Error", "Failed to save recording.");
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
            const recording = state.recordings.find((r) => r.id === recordingId);
            if (recording && recording.uri) {
              // Delete file from filesystem
              await FileSystem.deleteAsync(recording.uri, { idempotent: true });
            }
            dispatch({ type: "DELETE_RECORDING", payload: recordingId });
            setSelectedRecording(null);
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          } catch (error) {
            console.error("Error deleting recording:", error);
          }
        },
      },
    ]);
  };

  const todayRecordings = useMemo(
    () => state.recordings.filter((r) => r.date === today),
    [state.recordings, today]
  );

  const totalRecordingTime = useMemo(
    () => state.recordings.reduce((sum, r) => sum + r.duration, 0),
    [state.recordings]
  );

  const handlePlayRecording = async (recordingUri: string, recordingId: string) => {
    try {
      if (playingRecordingId === recordingId) {
        setPlayingRecordingId(null);
        setPlaybackPosition(0);
      } else {
        setPlayingRecordingId(recordingId);
        setPlaybackPosition(0);
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (error) {
      Alert.alert("Playback Error", "Failed to play recording.");
    }
  };

  if (state.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
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
              if (!permissionGranted) {
                Alert.alert("Permission Required", "Please enable microphone access in settings to record.");
                return;
              }
              setShowRecordingModal(true);
            }}
            disabled={!permissionGranted}
            className={`rounded-full py-6 items-center justify-center ${permissionGranted ? "bg-primary" : "bg-surface opacity-50"}`}
            activeOpacity={0.8}
          >
            <IconSymbol size={40} name="mic.fill" color={permissionGranted ? "white" : colors.muted} />
            <Text className={`font-semibold mt-2 ${permissionGranted ? "text-white" : "text-muted"}`}>
              {permissionGranted ? "Start Recording" : "Microphone Not Allowed"}
            </Text>
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
                        {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
