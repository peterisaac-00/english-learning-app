import { ScrollView, Text, View, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLearning } from "@/lib/learning-context";
import { useColors } from "@/hooks/use-colors";
import { useMemo } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatDuration } from "@/lib/speaking-topics";

export default function ProgressScreen() {
  const { state } = useLearning();
  const colors = useColors();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split("T")[0];
    }).reverse();

    // Calculate daily streak
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];

      const hasActivity =
        state.writingEntries.some((e) => e.date === dateStr) ||
        state.readingItems.some((r) => r.updatedAt >= new Date(dateStr).getTime() && r.updatedAt < new Date(dateStr).getTime() + 86400000) ||
        state.listeningItems.some((l) => l.updatedAt >= new Date(dateStr).getTime() && l.updatedAt < new Date(dateStr).getTime() + 86400000) ||
        state.recordings.some((r) => r.date === dateStr);

      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Activity by day
    const activityByDay = last7Days.map((date) => {
      const count =
        (state.writingEntries.filter((e) => e.date === date).length > 0 ? 1 : 0) +
        (state.readingItems.filter((r) => r.updatedAt >= new Date(date).getTime() && r.updatedAt < new Date(date).getTime() + 86400000).length > 0 ? 1 : 0) +
        (state.listeningItems.filter((l) => l.updatedAt >= new Date(date).getTime() && l.updatedAt < new Date(date).getTime() + 86400000).length > 0 ? 1 : 0) +
        (state.recordings.filter((r) => r.date === date).length > 0 ? 1 : 0);
      return { date, count };
    });

    const totalRecordingTime = state.recordings.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalEntries: state.writingEntries.length + state.readingItems.length + state.listeningItems.length,
      dailyStreak: streak,
      wordsLearned: state.vocabularyWords.length,
      totalRecordings: state.recordings.length,
      totalRecordingTime,
      readingItems: state.readingItems.length,
      listeningItems: state.listeningItems.length,
      writingEntries: state.writingEntries.length,
      averageReadingProgress: state.readingItems.length > 0 ? Math.round(state.readingItems.reduce((sum, r) => sum + r.progress, 0) / state.readingItems.length) : 0,
      averageListeningProgress: state.listeningItems.length > 0 ? Math.round(state.listeningItems.reduce((sum, l) => sum + l.progress, 0) / state.listeningItems.length) : 0,
      activityByDay,
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
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Progress</Text>
            <Text className="text-sm text-muted">Your learning journey</Text>
          </View>

          {/* Key Metrics */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Overview</Text>

            {/* Streak Card */}
            <View className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200 flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-lg bg-green-200 items-center justify-center">
                <Text className="text-xl">🔥</Text>
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-green-900">{stats.dailyStreak}</Text>
                <Text className="text-xs text-green-700">Day Streak</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View className="gap-3">
              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                  <Text className="text-2xl font-bold text-primary">{stats.totalEntries}</Text>
                  <Text className="text-xs text-muted mt-1">Total Entries</Text>
                </View>
                <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                  <Text className="text-2xl font-bold text-primary">{stats.wordsLearned}</Text>
                  <Text className="text-xs text-muted mt-1">Words Learned</Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                  <Text className="text-2xl font-bold text-primary">{stats.totalRecordings}</Text>
                  <Text className="text-xs text-muted mt-1">Recordings</Text>
                </View>
                <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                  <Text className="text-2xl font-bold text-primary">{formatDuration(stats.totalRecordingTime)}</Text>
                  <Text className="text-xs text-muted mt-1">Speaking Time</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Module Breakdown */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Module Breakdown</Text>

            {/* Reading */}
            <View className="bg-surface rounded-xl p-4 border border-border">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-10 h-10 rounded-lg bg-blue-100 items-center justify-center">
                    <IconSymbol size={20} name="book.fill" color="#3b82f6" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-foreground">Reading</Text>
                    <Text className="text-xs text-muted">{stats.readingItems} items</Text>
                  </View>
                </View>
                <Text className="text-lg font-bold text-primary">{stats.averageReadingProgress}%</Text>
              </View>
              <View className="bg-border rounded-full h-2 overflow-hidden">
                <View
                  className="bg-blue-500 h-full"
                  style={{ width: `${stats.averageReadingProgress}%` }}
                />
              </View>
            </View>

            {/* Writing */}
            <View className="bg-surface rounded-xl p-4 border border-border">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-10 h-10 rounded-lg bg-purple-100 items-center justify-center">
                    <IconSymbol size={20} name="pencil" color="#a855f7" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-foreground">Writing</Text>
                    <Text className="text-xs text-muted">{stats.writingEntries} entries</Text>
                  </View>
                </View>
              </View>
              <Text className="text-xs text-muted">
                {state.vocabularyWords.length} vocabulary words learned
              </Text>
            </View>

            {/* Listening */}
            <View className="bg-surface rounded-xl p-4 border border-border">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-10 h-10 rounded-lg bg-orange-100 items-center justify-center">
                    <IconSymbol size={20} name="headphones" color="#f97316" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-foreground">Listening</Text>
                    <Text className="text-xs text-muted">{stats.listeningItems} items</Text>
                  </View>
                </View>
                <Text className="text-lg font-bold text-primary">{stats.averageListeningProgress}%</Text>
              </View>
              <View className="bg-border rounded-full h-2 overflow-hidden">
                <View
                  className="bg-orange-500 h-full"
                  style={{ width: `${stats.averageListeningProgress}%` }}
                />
              </View>
            </View>

            {/* Speaking */}
            <View className="bg-surface rounded-xl p-4 border border-border">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-10 h-10 rounded-lg bg-red-100 items-center justify-center">
                    <IconSymbol size={20} name="mic.fill" color="#ef4444" />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-foreground">Speaking</Text>
                    <Text className="text-xs text-muted">{stats.totalRecordings} recordings</Text>
                  </View>
                </View>
              </View>
              <Text className="text-xs text-muted">
                Total speaking time: {formatDuration(stats.totalRecordingTime)}
              </Text>
            </View>
          </View>

          {/* Activity Timeline */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">Last 7 Days</Text>

            <View className="bg-surface rounded-xl p-4 border border-border gap-2">
              {stats.activityByDay.map((day, idx) => (
                <View key={idx} className="flex-row items-center gap-3">
                  <Text className="text-xs text-muted w-12">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </Text>
                  <View className="flex-row gap-1 flex-1">
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        className={`flex-1 h-6 rounded ${
                          day.count > i ? "bg-primary" : "bg-border"
                        }`}
                      />
                    ))}
                  </View>
                  <Text className="text-xs text-muted w-8 text-right">{day.count}</Text>
                </View>
              ))}
            </View>

            <Text className="text-xs text-muted text-center">
              Each bar represents activity in one module (max 4 per day)
            </Text>
          </View>

          {/* Motivational Message */}
          <View className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <Text className="text-sm font-medium text-green-900">
              {stats.dailyStreak > 7
                ? "🌟 Amazing consistency! Keep up the great work!"
                : stats.dailyStreak > 0
                  ? "🚀 You're on a roll! Keep learning every day."
                  : "💪 Start your streak today by learning something new!"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
