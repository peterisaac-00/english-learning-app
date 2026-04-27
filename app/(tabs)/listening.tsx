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

export default function ListeningScreen() {
  const { state, dispatch } = useLearning();
  const colors = useColors();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState("");

  const handleAddListening = () => {
    if (!title.trim()) {
      Alert.alert("Empty Title", "Please enter a title for the podcast/video.");
      return;
    }

    if (!source.trim()) {
      Alert.alert("Empty Source", "Please enter a link or source.");
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    dispatch({
      type: "ADD_LISTENING_ITEM",
      payload: {
        id: Date.now().toString(),
        title,
        source,
        progress: Math.round(progress),
        summary: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    setTitle("");
    setSource("");
    setProgress(0);
    setShowAddModal(false);
    Alert.alert("Added", "Listening material has been added!");
  };

  const handleUpdateProgress = (newProgress: number) => {
    if (!selectedItem) return;

    dispatch({
      type: "UPDATE_LISTENING_ITEM",
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

  const handleSaveSummary = () => {
    if (!selectedItem) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    dispatch({
      type: "UPDATE_LISTENING_ITEM",
      payload: {
        ...selectedItem,
        summary,
        updatedAt: Date.now(),
      },
    });

    setSelectedItem({
      ...selectedItem,
      summary,
    });

    Alert.alert("Saved", "Summary has been saved!");
  };

  const handleDeleteListening = (itemId: string) => {
    Alert.alert("Delete Listening", "Are you sure you want to delete this listening material?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          dispatch({ type: "DELETE_LISTENING_ITEM", payload: itemId });
          setShowDetailModal(false);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        },
      },
    ]);
  };

  const averageProgress = useMemo(() => {
    if (state.listeningItems.length === 0) return 0;
    const total = state.listeningItems.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(total / state.listeningItems.length);
  }, [state.listeningItems]);

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
            <Text className="text-3xl font-bold text-foreground">Listening</Text>
            <Text className="text-sm text-muted">Track podcasts and videos</Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-primary">{state.listeningItems.length}</Text>
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
              setSource("");
              setProgress(0);
              setShowAddModal(true);
            }}
            className="bg-primary rounded-lg py-3 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">+ Add Podcast/Video</Text>
          </TouchableOpacity>

          {/* Listening Items List */}
          <View className="gap-3">
            {state.listeningItems.length > 0 ? (
              state.listeningItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSelectedItem(item);
                    setSummary(item.summary);
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

                  <Text className="text-xs text-muted line-clamp-1">{item.source}</Text>
                  {item.summary && (
                    <Text className="text-xs text-primary mt-2">✓ Summary added</Text>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View className="bg-surface rounded-lg p-8 items-center border border-border">
                <IconSymbol size={40} name="headphones" color={colors.muted} />
                <Text className="text-muted mt-3 text-center">No listening materials yet. Add one to get started!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Add Listening Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 gap-4 max-h-[90%]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xl font-bold text-foreground">Add Listening Material</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text className="text-2xl text-muted">×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-medium text-foreground mb-2">Title</Text>
                  <TextInput
                    placeholder="Podcast or video title"
                    value={title}
                    onChangeText={setTitle}
                    className="bg-surface border border-border rounded-lg p-3 text-base text-foreground"
                    placeholderTextColor={colors.muted}
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-foreground mb-2">Source Link</Text>
                  <TextInput
                    placeholder="YouTube, Spotify, or other link"
                    value={source}
                    onChangeText={setSource}
                    className="bg-surface border border-border rounded-lg p-3 text-base text-foreground"
                    placeholderTextColor={colors.muted}
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
              onPress={handleAddListening}
              className="bg-primary rounded-lg py-3 items-center mt-4"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold">Add Listening</Text>
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
            <Text className="text-2xl font-bold text-foreground">Listening Details</Text>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text className="text-2xl text-muted">×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-4">
              <View>
                <Text className="text-base font-semibold text-foreground mb-2">{selectedItem?.title}</Text>
                <Text className="text-sm text-muted">{selectedItem?.source}</Text>
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

              <View>
                <Text className="text-sm font-medium text-foreground mb-2">What did you understand?</Text>
                <TextInput
                  placeholder="Write a short summary..."
                  value={summary}
                  onChangeText={setSummary}
                  multiline
                  numberOfLines={4}
                  className="bg-surface border border-border rounded-lg p-3 text-base text-foreground"
                  placeholderTextColor={colors.muted}
                  style={{ textAlignVertical: "top" }}
                />
              </View>

              {selectedItem?.summary && (
                <View className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <Text className="text-xs text-green-700 font-medium mb-1">Previous Summary:</Text>
                  <Text className="text-xs text-green-700">{selectedItem.summary}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={handleSaveSummary}
            className="bg-primary rounded-lg py-3 items-center mt-6"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Save Summary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeleteListening(selectedItem?.id)}
            className="border border-error rounded-lg py-3 items-center mt-3"
            activeOpacity={0.8}
          >
            <Text className="text-error font-semibold">Delete Listening</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDetailModal(false)}
            className="border border-border rounded-lg py-3 items-center mt-3"
            activeOpacity={0.8}
          >
            <Text className="text-foreground font-semibold">Close</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
