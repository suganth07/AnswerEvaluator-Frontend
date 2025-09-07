import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  ActivityIndicator,
  Chip,
  Appbar,
  IconButton,
  List,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { paperService } from '../../services/api';
import { router } from 'expo-router';

interface Paper {
  id: number;
  name: string;
  created_at: string;
  questions: any[];
}

export default function Dashboard() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout, user } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      const response = await paperService.getAll();
      setPapers(response);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to load papers'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPapers();
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPaperItem = ({ item }: { item: Paper }) => (
    <List.Item
      title={item.name}
      description={`${item.questions?.length || 0} questions • Created ${formatDate(item.created_at)}`}
      left={() => <List.Icon icon="file-document" color={theme.colors.primary} />}
      right={() => 
        <View style={styles.paperActions}>
          <Chip 
            mode="outlined" 
            compact
            textStyle={{ color: theme.colors.primary }}
            style={{ borderColor: theme.colors.primary }}
          >
            {item.questions?.length || 0} Q
          </Chip>
        </View>
      }
      onPress={() => {
        router.push({
          pathname: '/result',
          params: { paperId: item.id }
        });
      }}
      style={[styles.paperItem, { backgroundColor: theme.colors.surface }]}
      titleStyle={{ color: theme.colors.onSurface }}
      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
    />
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          Loading papers...
        </Paragraph>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content 
          title="Admin Dashboard" 
          subtitle={`Welcome, ${user?.username}`}
          titleStyle={{ color: theme.colors.onSurface }}
          subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
        />
        <IconButton
          icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
          iconColor={theme.colors.primary}
          onPress={toggleTheme}
        />
        <Appbar.Action 
          icon="logout" 
          onPress={handleLogout} 
          iconColor={theme.colors.error}
        />
      </Appbar.Header>

      {/* Content */}
      <View style={styles.content}>
        {/* Stats Card */}
        <Card style={[styles.statsCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Title style={[styles.statNumber, { color: theme.colors.primary }]}>
                  {papers.length}
                </Title>
                <Paragraph style={[styles.statLabel, { color: theme.colors.primary }]}>
                  Total Papers
                </Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={[styles.statNumber, { color: theme.colors.primary }]}>
                  {papers.reduce((sum, paper) => sum + (paper.questions?.length || 0), 0)}
                </Title>
                <Paragraph style={[styles.statLabel, { color: theme.colors.primary }]}>
                  Total Questions
                </Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Papers List */}
        <Card style={[styles.listCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.listTitle, { color: theme.colors.onSurface }]}>
              Question Papers
            </Title>
            {papers.length === 0 ? (
              <View style={styles.emptyState}>
                <Paragraph style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                  No question papers uploaded yet.
                </Paragraph>
                <Button
                  mode="outlined"
                  onPress={() => router.push('/(tabs)/upload')}
                  style={[styles.emptyButton, { borderColor: theme.colors.primary }]}
                  textColor={theme.colors.primary}
                >
                  Upload First Paper
                </Button>
              </View>
            ) : (
              <FlatList
                data={papers}
                renderItem={renderPaperItem}
                keyExtractor={(item) => item.id.toString()}
                ItemSeparatorComponent={() => <Divider />}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[theme.colors.primary]}
                  />
                }
                showsVerticalScrollIndicator={false}
              />
            )}
          </Card.Content>
        </Card>
      </View>

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/(tabs)/upload')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    marginBottom: 16,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  listCard: {
    flex: 1,
    elevation: 3,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  paperItem: {
    paddingVertical: 12,
  },
  paperActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
});
