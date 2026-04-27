import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLearning } from "@/lib/learning-context";
import { useColors } from "@/hooks/use-colors";
import { useState, useMemo } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export default function WritingScreen() {
  const { state, dispatch } = useLearning();
  const colors = useColors();
  const today = new Date().toISOString().split("T")[0];

  const [journalText, setJournalText] = useState("");
  const [showAddWordModal, setShowAddWordModal] = useState(false);
  const [showVocabularyModal, setShowVocabularyModal] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newMeaning, setNewMeaning] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Get today's entry
  const todayEntry = useMemo(
    () => state.writingEntries.find((e) => e.date === today),
    [state.writingEntries, today]
  );

  // Get today's words
  const todayWords = useMemo(
    () => state.vocabularyWords.filter((w) => w.dateAdded === today),
    [state.vocabularyWords, today]
  );

  const canAddWord = todayWords.length < 5;

  const handleSaveJournal = () => {
    if (!journalText.trim()) {
      Alert.alert("Empty Entry", "Please write something before saving.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (todayEntry) {
      dispatch({
        type: "UPDATE_WRITING_ENTRY",
        payload: {
          ...todayEntry,
          content: journalText,
          wordCount: journalText.split(/\s+/).length,
          createdAt: todayEntry.createdAt,
        },
      });
    } else {
      dispatch({
        type: "ADD_WRITING_ENTRY",
        payload: {
          id: Date.now().toString(),
          date: today,
          content: journalText,
          wordCount: journalText.split(/\s+/).length,
          createdAt: Date.now(),
        },
      });
    }

    Alert.alert("Saved", "Your journal entry has been saved!");
  };

  const handleAddWord = () => {
    if (!newWord.trim()) {
      Alert.alert("Empty Word", "Please enter a word.");
      return;
    }

    if (!canAddWord) {
      Alert.alert("Limit Reached", "You can only add 5 words per day.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    dispatch({
      type: "ADD_VOCABULARY_WORD",
      payload: {
        id: Date.now().toString(),
        word: newWord,
        meaning: newMeaning,
        dateAdded: today,
        createdAt: Date.now(),
      },
    });

    setNewWord("");
    setNewMeaning("");
    setShowAddWordModal(false);
  };

  const handleDeleteWord = (wordId: string) => {
    Alert.alert("Delete Word", "Are you sure you want to delete this word?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          dispatch({ type: "DELETE_VOCABULARY_WORD", payload: wordId });
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        },
      },
    ]);
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
            <Text className="text-3xl font-bold text-foreground">Writing</Text>
            <Text className="text-sm text-muted">
              {new Date(today).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </Text>
          </View>

          {/* Daily Journal Section */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">Daily Journal</Text>
              <TouchableOpacity onPress={() => setShowHistory(true)}>
                <Text className="text-sm text-primary font-medium">View History</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-surface rounded-xl border border-border p-4">
              <TextInput
                placeholder="Write about your day..."
                value={journalText || todayEntry?.content || ""}
                onChangeText={setJournalText}
                multiline
                numberOfLines={6}
                placeholderTextColor={colors.muted}
                className="text-base text-foreground"
                style={{
                  minHeight: 140,
                  textAlignVertical: "top",
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveJournal}
              className="bg-primary rounded-lg py-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold">Save Entry</Text>
            </TouchableOpacity>

            {todayEntry && (
              <View className="bg-green-50 rounded-lg p-3 border border-green-200">
                <Text className="text-xs text-green-700">
                  ✓ Entry saved • {todayEntry.wordCount} words
                </Text>
              </View>
            )}
          </View>

          {/* Vocabulary Button */}
          <TouchableOpacity
            onPress={() => setShowVocabularyModal(true)}
            className="bg-surface rounded-lg py-4 px-4 border border-border flex-row items-center justify-between"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center gap-3 flex-1">
              <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
                <IconSymbol size={20} name="book.fill" color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Vocabulary</Text>
                <Text className="text-xs text-muted mt-1">{state.vocabularyWords.length} words learned</Text>
              </View>
            </View>
            <IconSymbol size={20} name="chevron.right" color={colors.muted} />
          </TouchableOpacity>

          {/* Today's Words Progress */}
          {todayWords.length > 0 && (
            <View className="bg-surface rounded-lg p-4 border border-border">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-foreground">Today's Words</Text>
                <Text className="text-sm font-medium text-primary">{todayWords.length}/5</Text>
              </View>
              <View className="bg-border rounded-full h-2 overflow-hidden">
                <View
                  className="bg-primary h-full"
                  style={{ width: `${(todayWords.length / 5) * 100}%` }}
                />
              </View>
            </View>
          )}

          {/* Add Word Button */}
          <TouchableOpacity
            onPress={() => setShowAddWordModal(true)}
            disabled={!canAddWord}
            className={`rounded-lg py-3 items-center border-2 ${
              canAddWord ? "border-primary bg-primary/10" : "border-border bg-surface opacity-50"
            }`}
            activeOpacity={canAddWord ? 0.8 : 1}
          >
            <Text className={`font-semibold ${canAddWord ? "text-primary" : "text-muted"}`}>
              + Add Word Today
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Vocabulary Modal */}
      <Modal
        visible={showVocabularyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVocabularyModal(false)}
      >
        <ScreenContainer className="p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-foreground">Vocabulary</Text>
            <TouchableOpacity onPress={() => setShowVocabularyModal(false)}>
              <Text className="text-2xl text-muted">×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {state.vocabularyWords.length > 0 ? (
              <View className="gap-4">
                {Object.entries(
                  state.vocabularyWords.reduce((acc: any, word: any) => {
                    if (!acc[word.dateAdded]) acc[word.dateAdded] = [];
                    acc[word.dateAdded].push(word);
                    return acc;
                  }, {})
                )
                  .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                  .map(([date, words]: any) => (
                    <View key={date}>
                      <Text className="text-sm font-semibold text-foreground mb-2">
                        {new Date(date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </Text>
                      <View className="gap-2">
                        {words.map((word: any) => (
                          <View key={word.id} className="bg-surface rounded-lg p-3 border border-border flex-row items-start justify-between">
                            <View className="flex-1">
                              <Text className="text-base font-semibold text-foreground">{word.word}</Text>
                              {word.meaning && (
                                <Text className="text-sm text-muted mt-1">{word.meaning}</Text>
                              )}
                            </View>
                            <TouchableOpacity
                              onPress={() => handleDeleteWord(word.id)}
                              className="ml-2"
                            >
                              <IconSymbol size={20} name="chevron.right" color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
              </View>
            ) : (
              <View className="items-center justify-center py-8">
                <IconSymbol size={40} name="book.fill" color={colors.muted} />
                <Text className="text-muted mt-3 text-center">No vocabulary words yet</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            onPress={() => setShowVocabularyModal(false)}
            className="border border-border rounded-lg py-3 items-center mt-4"
            activeOpacity={0.8}
          >
            <Text className="text-foreground font-semibold">Close</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </Modal>

      {/* Add Word Modal */}
      <Modal
        visible={showAddWordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddWordModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 gap-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-foreground">Add New Word</Text>
              <TouchableOpacity onPress={() => setShowAddWordModal(false)}>
                <Text className="text-2xl text-muted">×</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-sm font-medium text-foreground mb-2">Word</Text>
              <TextInput
                placeholder="Enter word"
                value={newWord}
                onChangeText={setNewWord}
                className="bg-surface border border-border rounded-lg p-3 text-base text-foreground"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-foreground mb-2">Meaning (optional)</Text>
              <TextInput
                placeholder="Enter meaning or note"
                value={newMeaning}
                onChangeText={setNewMeaning}
                multiline
                numberOfLines={3}
                className="bg-surface border border-border rounded-lg p-3 text-base text-foreground"
                placeholderTextColor={colors.muted}
                style={{ textAlignVertical: "top" }}
              />
            </View>

            <TouchableOpacity
              onPress={handleAddWord}
              className="bg-primary rounded-lg py-3 items-center mt-2"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold">Add Word</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowAddWordModal(false)}
              className="border border-border rounded-lg py-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-foreground font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <ScreenContainer className="p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-foreground">Writing History</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <Text className="text-2xl text-muted">×</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={state.writingEntries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="bg-surface rounded-lg p-4 mb-3 border border-border">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-semibold text-foreground">
                    {new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                  <Text className="text-xs text-muted">{item.wordCount} words</Text>
                </View>
                <Text className="text-sm text-foreground line-clamp-2">{item.content}</Text>
              </View>
            )}
            scrollEnabled={true}
            ListEmptyComponent={
              <View className="items-center justify-center py-8">
                <Text className="text-muted">No entries yet</Text>
              </View>
            }
          />

          <TouchableOpacity
            onPress={() => setShowHistory(false)}
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
