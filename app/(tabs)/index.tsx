import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLearning } from "@/lib/learning-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useMemo } from "react";

interface ModuleCard {
  title: string;
  icon: string;
  route: string;
  color: string;
  getCount: (state: any) => number;
}

export default function HomeScreen() {
  const { state, dispatch } = useLearning();
  const router = useRouter();
  const colors = useColors();

  const today = new Date().toISOString().split("T")[0];

  const modules: ModuleCard[] = [
    {
      title: "Reading",
      icon: "book.fill",
      route: "/reading",
      color: "#22C55E",
      getCount: (s) => s.readingItems.length,
    },
    {
      title: "Writing",
      icon: "pencil",
      route: "/writing",
      color: "#16A34A",
      getCount: (s) => s.writingEntries.filter((e: any) => e.date === today).length,
    },
    {
      title: "Listening",
      icon: "headphones",
      route: "/listening",
      color: "#22C55E",
      getCount: (s) => s.listeningItems.length,
    },
    {
      title: "Speaking",
      icon: "mic.fill",
      route: "/speaking",
      color: "#16A34A",
      getCount: (s) => s.recordings.filter((r: any) => r.date === today).length,
    },
  ];

  const stats = useMemo(() => {
    return {
      totalEntries: state.writingEntries.length + state.readingItems.length + state.listeningItems.length,
      todayActivities: modules.reduce((sum, m) => sum + m.getCount(state), 0),
      wordsLearned: state.vocabularyWords.length,
      recordings: state.recordings.length,
    };
  }, [state]);

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
        <View className="gap-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">English Learning</Text>
            <Text className="text-base text-muted">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Text>
          </View>

          {/* Quick Stats */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-primary">{stats.todayActivities}</Text>
              <Text className="text-xs text-muted mt-1">Today's Activities</Text>
            </View>
            <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-2xl font-bold text-primary">{stats.wordsLearned}</Text>
              <Text className="text-xs text-muted mt-1">Words Learned</Text>
            </View>
          </View>

          {/* Module Cards */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Learning Modules</Text>
            <View className="gap-3">
              {modules.map((module, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => router.push(module.route as any)}
                  activeOpacity={0.7}
                  className="bg-surface rounded-xl p-4 border border-border flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View
                      className="w-12 h-12 rounded-lg items-center justify-center"
                      style={{ backgroundColor: module.color + "20" }}
                    >
                      <IconSymbol size={24} name={module.icon as any} color={module.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-foreground">{module.title}</Text>
                      <Text className="text-xs text-muted mt-1">
                        {module.getCount(state)} {module.getCount(state) === 1 ? "item" : "items"}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-primary text-lg">→</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Motivational Message */}
          <View className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <Text className="text-sm font-medium text-green-900">
              Keep learning! Consistency is key to mastering English. 🌱
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
