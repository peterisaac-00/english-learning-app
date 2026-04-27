import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLearning } from "@/lib/learning-context";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
  const { state, dispatch } = useLearning();
  const colors = useColors();
  const { colorScheme, setColorScheme } = useThemeContext();
  const [isExporting, setIsExporting] = useState(false);

  const handleClearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your learning data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("learningState");
              dispatch({
                type: "SET_STATE",
                payload: {
                  writingEntries: [],
                  vocabularyWords: [],
                  readingItems: [],
                  listeningItems: [],
                  recordings: [],
                  speakingTopics: [],
                  currentDifficulty: 1,
                  isLoading: false,
                },
              });
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }
              Alert.alert("Cleared", "All data has been deleted.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear data.");
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const dataToExport = {
        exportDate: new Date().toISOString(),
        writingEntries: state.writingEntries,
        vocabularyWords: state.vocabularyWords,
        readingItems: state.readingItems,
        listeningItems: state.listeningItems,
        recordings: state.recordings,
        statistics: {
          totalEntries: state.writingEntries.length + state.readingItems.length + state.listeningItems.length,
          wordsLearned: state.vocabularyWords.length,
          totalRecordings: state.recordings.length,
        },
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);
      await AsyncStorage.setItem("learningData_export", jsonString);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        "Export Successful",
        `Your data has been exported. You can find it in your device storage.\n\nTotal entries: ${dataToExport.statistics.totalEntries}\nWords learned: ${dataToExport.statistics.wordsLearned}`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleTheme = () => {
    const newScheme = colorScheme === "light" ? "dark" : "light";
    setColorScheme(newScheme);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <Text className="text-3xl font-bold text-foreground">Settings</Text>
            <Text className="text-sm text-muted">Manage your preferences</Text>
          </View>

          {/* Theme Settings */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Appearance</Text>

            <View className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                  <IconSymbol size={20} name="gearshape.fill" color={colors.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">Dark Mode</Text>
                  <Text className="text-xs text-muted mt-1">
                    {colorScheme === "dark" ? "Enabled" : "Disabled"}
                  </Text>
                </View>
              </View>
              <Switch
                value={colorScheme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colorScheme === "dark" ? colors.primary : colors.muted}
              />
            </View>
          </View>

          {/* Learning Preferences */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Learning</Text>

            <View className="bg-surface rounded-xl p-4 border border-border">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-semibold text-foreground">Speaking Difficulty</Text>
                <View className="flex-row gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => dispatch({ type: "SET_DIFFICULTY", payload: level })}
                      className={`w-8 h-8 rounded items-center justify-center border ${
                        state.currentDifficulty === level
                          ? "bg-primary border-primary"
                          : "bg-surface border-border"
                      }`}
                      activeOpacity={0.8}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          state.currentDifficulty === level ? "text-white" : "text-foreground"
                        }`}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text className="text-xs text-muted">
                Adjust the difficulty of speaking topics (1 = easiest, 5 = hardest)
              </Text>
            </View>
          </View>

          {/* Data Management */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Data Management</Text>

            <TouchableOpacity
              onPress={handleExportData}
              disabled={isExporting}
              className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between"
              activeOpacity={0.8}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center">
                  <IconSymbol size={20} name="chevron.right" color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">Export Data</Text>
                  <Text className="text-xs text-muted mt-1">Save your learning data as JSON</Text>
                </View>
              </View>
              {isExporting && <ActivityIndicator color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearAllData}
              className="bg-surface rounded-xl p-4 border border-error flex-row items-center justify-between"
              activeOpacity={0.8}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-lg bg-red-100 items-center justify-center">
                  <IconSymbol size={20} name="chevron.right" color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-error">Clear All Data</Text>
                  <Text className="text-xs text-muted mt-1">Permanently delete everything</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Statistics */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Statistics</Text>

            <View className="bg-surface rounded-xl p-4 border border-border gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Writing Entries</Text>
                <Text className="text-base font-semibold text-foreground">{state.writingEntries.length}</Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Vocabulary Words</Text>
                <Text className="text-base font-semibold text-foreground">{state.vocabularyWords.length}</Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Reading Items</Text>
                <Text className="text-base font-semibold text-foreground">{state.readingItems.length}</Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Listening Items</Text>
                <Text className="text-base font-semibold text-foreground">{state.listeningItems.length}</Text>
              </View>
              <View className="h-px bg-border" />
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">Recordings</Text>
                <Text className="text-base font-semibold text-foreground">{state.recordings.length}</Text>
              </View>
            </View>
          </View>

          {/* About */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">About</Text>

            <View className="bg-surface rounded-xl p-4 border border-border gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted">App Version</Text>
                <Text className="text-base font-semibold text-foreground">1.0.0</Text>
              </View>
              <View className="h-px bg-border" />
              <View>
                <Text className="text-sm text-muted mb-2">About</Text>
                <Text className="text-xs text-muted leading-relaxed">
                  English Learning System is a personal learning tracker designed to help you improve your English skills in reading, writing, listening, and speaking.
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View className="items-center py-4">
            <Text className="text-xs text-muted">Made with 💚 for language learners</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
