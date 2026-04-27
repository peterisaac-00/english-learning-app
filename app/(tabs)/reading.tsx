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

export default function ReadingScreen() {
  const { state, dispatch } = useLearning();
  const colors = useColors();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [progress, setProgress] = useState(0);

  const handleAddReading = () => {
    if (!title.trim()) {
      Alert.alert("Empty Title", "Please enter a title for the reading material.");
      return;
    }

    if (!content.trim()) {
      Alert.alert("Empty Content", "Please enter content or a link.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    dispatch({
      type: "ADD_READING_ITEM",
      payload: {
        id: Date.now().toString(),
        title,
        content,
        progress: Math.round(progress),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    setTitle("");
    setContent("");
    setProgress(0);
    setShowAddModal(false);
    Alert.alert("Added", "Reading material has been added!");
  };

  const handleUpdateProgress = (newProgress: number) => {
    if (!selectedItem) return;

    dispatch({
      type: "UPDATE_READING_ITEM",
      payload: {
        ...selectedItem,
        progress: Math.round(newProgress),
        updatedAt: Date.now(),
      },
    });

    setSelectedItem({
      ...selectedItem,
      progress: Math.round(newProgress),
    });

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDeleteReading = (itemId: string) => {
    Alert.alert("Delete Reading", "Are you sure you want to delete this reading material?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          dispatch({ type: "DELETE_READING_ITEM", payload: itemId });
          setShowDetailModal(false);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        },
      },
    ]);
  };

  const averageProgress = useMemo(() => {
    if (state.readingItems.length === 0) return 0;
    const total = state.readingItems.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(total / state.readingItems.length);
  }, [state.readingItems]);

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
            <Text className="text-3xl font-bold text-foreground">Reading</Text>
            <Text className="text-sm text-muted">Track your reading progress</Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-primary">{state.readingItems.length}</Text>
              <Text className="text-xs text-muted mt-1">Items</Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-primary">{averageProgress}%</Text>
              <Text className="text-xs text-muted mt-1">Avg Progress</Text>
            </View>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            onPress={() => {
              setTitle("");
              setContent("");
              setProgress(0);
              setShowAddModal(true);
            }}
            className="bg-primary rounded-lg py-3 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">+ Add Article/Book</Text>
          </TouchableOpacity>

          {/* Reading Items List */}
          <View className="gap-3">
            {state.readingItems.length > 0 ? (
              state.readingItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSelectedItem(item);
                    setShowDetailModal(true);
                  }}
                  activeOpacity={0.7}
                  className="bg-surface rounded-lg p-4 border border-border"
                >
                  <View className="flex-row items-start justify-between mb-2">
                    <Text className="text-base font-semibold text-foreground flex-1">{item.title}</Text>
                    <Text className="text-sm font-medium text-primary">{item.progress}%</Text>
                  </View>

                  {/* Progress Bar */}
                  <View className="bg-border rounded-full h-2 overflow-hidden mb-2">
                    <View
                      className="bg-primary h-full"
                      style={{ width: `${item.progress}%` }}
                    />
                  </View>

                  <Text className="text-xs text-muted line-clamp-2">{item.content}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View className="bg-surface rounded-lg p-8 items-center border border-border">
                <IconSymbol size={40} name="book.fill" color={colors.muted} />
                <Text className="text-muted mt-3 text-center">No reading materials yet. Add one to get started!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Reading Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 gap-4 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-foreground">Add Reading Material</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text className="text-2xl text-muted">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-medium text-foreground mb-2">Title</Text>
                  <TextInput
                    placeholder="Article, book, or text title"
                    value={title}
                    onChangeText={setTitle}
                    className="bg-surface border border-border rounded-lg p-3 text-base text-foreground"
                    placeholderTextColor={colors.muted}
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-foreground mb-2">Content or Link</Text>
                  <TextInput
                    placeholder="Paste text or link"
                    value={content}
                    onChangeText={setContent}
                    multiline
                    numberOfLines={4}
                    className="bg-surface border border-border rounded-lg p-3 text-base text-foreground"
                    placeholderTextColor={colors.muted}
                    style={{ textAlignVertical: "top" }}
                  />
                </View>

                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-medium text-foreground">Initial Progress</Text>
                    <Text className="text-sm font-semibold text-primary">{Math.round(progress)}%</Text>
                  </View>
                  <View className="bg-border rounded-full h-2 overflow-hidden">
                    <View
                      className="bg-primary h-full"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                  <TextInput
                    placeholder="0-100"
                    value={Math.round(progress).toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      setProgress(Math.min(Math.max(num, 0), 100));
                    }}
                    keyboardType="number-pad"
                    className="bg-surface border border-border rounded-lg p-3 text-base text-foreground mt-2"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={handleAddReading}
              className="bg-primary rounded-lg py-3 items-center mt-4"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold">Add Reading</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              className="border border-border rounded-lg py-3 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-foreground font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal && selectedItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <ScreenContainer className="p-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-bold text-foreground">Reading Details</Text>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text className="text-2xl text-muted">×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <View>
                <Text className="text-base font-semibold text-foreground mb-2">{selectedItem?.title}</Text>
                <Text className="text-sm text-muted">{selectedItem?.content}</Text>
              </View>

              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-medium text-foreground">Progress</Text>
                  <Text className="text-sm font-semibold text-primary">{selectedItem?.progress}%</Text>
                </View>
                <View className="bg-border rounded-full h-3 overflow-hidden mb-3">
                  <View
                    className="bg-primary h-full"
                    style={{ width: `${selectedItem?.progress}%` }}
                  />
                </View>
                <TextInput
                  placeholder="0-100"
                  value={selectedItem?.progress?.toString() || "0"}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    handleUpdateProgress(Math.min(Math.max(num, 0), 100));
                  }}
                  keyboardType="number-pad"
                  className="bg-surface border border-border rounded-lg p-3 text-base text-foreground"
                  placeholderTextColor={colors.muted}
                />
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={() => handleDeleteReading(selectedItem?.id)}
            className="border border-error rounded-lg py-3 items-center mt-6"
            activeOpacity={0.8}
          >
            <Text className="text-error font-semibold">Delete Reading</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDetailModal(false)}
            className="bg-primary rounded-lg py-3 items-center mt-3"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Close</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
