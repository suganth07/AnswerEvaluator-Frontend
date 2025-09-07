import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  List,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { submissionService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface Answer {
  question_number: number;
  extracted_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

interface SubmissionDetails {
  id: number;
  student_name: string;
  paper_name: string;
  score: number;
  total_questions: number;
  percentage: number;
  submitted_at: string;
  answers: Answer[];
}

export default function ResultScreen() {
  const params = useLocalSearchParams();
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    loadSubmissionDetails();
  }, []);

  const loadSubmissionDetails = async () => {
    try {
      console.log('Result screen params:', params);
      
      if (params.submissionId && params.submissionId !== '0') {
        console.log('Loading detailed submission data for ID:', params.submissionId);
        const details = await submissionService.getDetails(params.submissionId as string);
        console.log('Received detailed submission:', details);
        setSubmission(details);
      } else {
        console.log('Using params for quick display');
        // Create submission object from params for quick display
        setSubmission({
          id: 0,
          student_name: params.studentName as string,
          paper_name: params.paperName as string,
          score: Number(params.score) || 0,
          total_questions: Number(params.total) || 0,
          percentage: Number(params.percentage) || 0,
          submitted_at: new Date().toISOString(),
          answers: []
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return '#4caf50'; // Green
    if (percentage >= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading results...</Paragraph>
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Paragraph style={[styles.errorText, { color: theme.colors.onSurfaceVariant }]}>No submission data found</Paragraph>
        <Button mode="contained" onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Evaluation Results</Title>
        <Paragraph style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Answer sheet evaluation complete
        </Paragraph>
      </View>

      <View style={styles.content}>
        {/* Score Summary */}
        <Card style={[styles.scoreCard, { borderColor: getScoreColor(submission.percentage), backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.scoreHeader}>
              <View style={styles.scoreMain}>
                <Title style={[styles.scoreTitle, { color: getScoreColor(submission.percentage) }]}>
                  {submission.score}/{submission.total_questions}
                </Title>
                <Paragraph style={[styles.scoreSubtitle, { color: theme.colors.onSurfaceVariant }]}>Questions Correct</Paragraph>
              </View>
              <View style={styles.gradeContainer}>
                <Title style={[styles.gradeText, { color: getScoreColor(submission.percentage) }]}>
                  {getGrade(submission.percentage)}
                </Title>
                <Paragraph style={[styles.percentageText, { color: theme.colors.onSurfaceVariant }]}>
                    {Number(submission.percentage || 0).toFixed(1)}%
                </Paragraph>

              </View>
            </View>
            
            <View style={[styles.progressBar, { backgroundColor: theme.colors.outline }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${submission.percentage}%`,
                    backgroundColor: getScoreColor(submission.percentage)
                  }
                ]} 
              />
            </View>
          </Card.Content>
        </Card>

        {/* Student Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Submission Details</Title>
            <View style={styles.detailRow}>
              <Paragraph style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>Student:</Paragraph>
              <Paragraph style={[styles.detailValue, { color: theme.colors.onSurface }]}>{submission.student_name}</Paragraph>
            </View>
            <View style={styles.detailRow}>
              <Paragraph style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>Paper:</Paragraph>
              <Paragraph style={[styles.detailValue, { color: theme.colors.onSurface }]}>{submission.paper_name}</Paragraph>
            </View>
            <View style={styles.detailRow}>
              <Paragraph style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>Submitted:</Paragraph>
              <Paragraph style={[styles.detailValue, { color: theme.colors.onSurface }]}>{formatDate(submission.submitted_at)}</Paragraph>
            </View>
          </Card.Content>
        </Card>

        {/* Performance Analysis */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Performance Analysis</Title>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Chip 
                  mode="outlined" 
                  textStyle={{ color: '#4caf50' }}
                  style={{ borderColor: '#4caf50' }}
                >
                  {submission.score} Correct
                </Chip>
              </View>
              <View style={styles.statItem}>
                <Chip 
                  mode="outlined"
                  textStyle={{ color: '#f44336' }}
                  style={{ borderColor: '#f44336' }}
                >
                  {submission.total_questions - submission.score} Incorrect
                </Chip>
              </View>
              <View style={styles.statItem}>
                <Chip 
                  mode="outlined"
                  textStyle={{ color: '#2196f3' }}
                  style={{ borderColor: '#2196f3' }}
                >
                  {submission.total_questions} Total
                </Chip>
              </View>
            </View>
            
            <Paragraph style={styles.performanceText}>
              {submission.percentage >= 80 
                ? "Excellent work! You have a strong understanding of the material." 
                : submission.percentage >= 60 
                ? "Good effort! Review the incorrect answers to improve your understanding."
                : "Keep studying! Focus on the areas where you had incorrect answers."}
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Question-wise Results */}
        {submission.answers && submission.answers.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Question-wise Results</Title>
              <Paragraph style={styles.answersSubtitle}>
                Review your answers compared to the correct ones
              </Paragraph>
            </Card.Content>
            
            {submission.answers.map((answer, index) => (
              <View key={index}>
                <List.Item
                  title={`Question ${answer.question_number}`}
                  description={`Your answer: ${answer.extracted_answer || 'Not detected'} | Correct: ${answer.correct_answer}`}
                  left={() => (
                    <View style={styles.questionIcon}>
                      <Paragraph style={[
                        styles.questionNumber,
                        { 
                          backgroundColor: answer.is_correct ? '#4caf50' : '#f44336',
                          color: 'white'
                        }
                      ]}>
                        {answer.question_number}
                      </Paragraph>
                    </View>
                  )}
                  right={() => (
                    <Chip 
                      mode="outlined"
                      compact
                      textStyle={{ 
                        color: answer.is_correct ? '#4caf50' : '#f44336',
                        fontSize: 12
                      }}
                      style={{ 
                        borderColor: answer.is_correct ? '#4caf50' : '#f44336'
                      }}
                    >
                      {answer.is_correct ? 'Correct' : 'Incorrect'}
                    </Chip>
                  )}
                  titleStyle={styles.questionTitle}
                  descriptionStyle={styles.questionDescription}
                />
                {index < submission.answers.length - 1 && <Divider />}
              </View>
            ))}
          </Card>
        )}

        {/* Action Buttons */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => router.push('/(tabs)/student')}
                style={styles.actionButton}
              >
                Submit Another
              </Button>
              <Button
                mode="contained"
                onPress={() => router.push('/(tabs)/dashboard')}
                style={styles.actionButton}
              >
                Back to Dashboard
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  scoreCard: {
    marginBottom: 20,
    elevation: 4,
    borderLeftWidth: 4,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreMain: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scoreSubtitle: {
    color: '#666',
    fontSize: 16,
  },
  gradeContainer: {
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  percentageText: {
    color: '#666',
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  card: {
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    width: 80,
    color: '#666',
  },
  detailValue: {
    flex: 1,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  statItem: {
    marginRight: 10,
    marginBottom: 8,
  },
  performanceText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  answersSubtitle: {
    color: '#666',
    marginBottom: 10,
  },
  questionIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  questionNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    textAlign: 'center',
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionTitle: {
    fontWeight: 'bold',
  },
  questionDescription: {
    color: '#666',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});
