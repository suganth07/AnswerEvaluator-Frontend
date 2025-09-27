import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  // Original StudentAnswer fields (camelCase from Prisma)
  id: number;
  submissionId: number;
  questionNumber: number;
  selectedOption?: string;
  isCorrect: boolean;
  textAnswer?: string;
  blankAnswers?: any;
  answerType: string;
  selectedOptions?: any;
  
  // Legacy snake_case fields for backward compatibility
  question_number?: number;
  extracted_answer?: string;
  correct_answer?: string;
  is_correct?: boolean;
  
  // Merged question details from backend
  questionText?: string;
  correctOptions?: any;
  options?: any;
  questionFormat?: string;
  
  // NEW: Weightage-based evaluation fields
  partialScore?: number;
  maxPoints?: number;
  details?: string;
  weightageBreakdown?: Array<{ option: string; weight: number }>;
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
  
  // NEW: Evaluation method information
  evaluationMethod?: 'traditional' | 'weightage';
  maxPossibleScore?: number;
  evaluationDetails?: string;
}

export default function ResultScreen() {
  const params = useLocalSearchParams();
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    loadSubmissionDetails();
  }, []);

  // Helper function to detect if this is a weightage-based evaluation
  const isWeightageBasedEvaluation = (submission: SubmissionDetails): boolean => {
    return submission.answers?.some(answer => 
      answer.weightageBreakdown && answer.weightageBreakdown.length > 0
    ) || false;
  };

  // Helper function to format weightage breakdown
  const formatWeightageBreakdown = (breakdown: Array<{ option: string; weight: number }>): string => {
    if (!breakdown || breakdown.length === 0) return '';
    return breakdown.map(item => `${item.option}(${item.weight})`).join(' + ');
  };

  // Helper function to get evaluation method display name
  const getEvaluationMethodName = (submission: SubmissionDetails): string => {
    return isWeightageBasedEvaluation(submission) ? 'Weightage-Based Evaluation' : 'Traditional Evaluation';
  };

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
        
        // Process the submission details with proper field mapping
        const processedSubmission = {
          id: details.id,
          student_name: details.student_name || details.studentName || 'Unknown Student',
          paper_name: details.paper_name || details.paperName || params.paperName || 'Unknown Paper',
          score: Number(details.score) || 0,
          total_questions: Number(details.total_questions || details.totalQuestions) || 0,
          percentage: Number(details.percentage) || 0,
          submitted_at: details.submitted_at || details.submittedAt || new Date().toISOString(),
          answers: details.answers || []
        };
        
        console.log('Processed submission:', processedSubmission);
        setSubmission(processedSubmission);
      } else {
        console.log('Using params for quick display');
        // Create submission object from params for quick display
        const score = Number(params.score) || 0;
        const total = Number(params.total) || 0;
        const percentage = total > 0 ? (score / total) * 100 : Number(params.percentage) || 0;
        
        setSubmission({
          id: 0,
          student_name: params.studentName as string || 'Unknown Student',
          paper_name: params.paperName as string || 'Unknown Paper',
          score: score,
          total_questions: total,
          percentage: percentage,
          submitted_at: new Date().toISOString(),
          answers: []
        });
      }
    } catch (error) {
      console.error('Error loading submission details:', error);
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
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
      >
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
                  {submission.maxPossibleScore ? 
                    `${submission.score}/${submission.maxPossibleScore}` : 
                    `${submission.score}/${submission.total_questions}`
                  }
                </Title>
                <Paragraph style={[styles.scoreSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {submission.maxPossibleScore ? 'Marks Scored' : 'Questions Correct'}
                </Paragraph>
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
                    width: `${Math.min(Math.max(submission.percentage || 0, 0), 100)}%`,
                    backgroundColor: getScoreColor(submission.percentage || 0)
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
              {isWeightageBasedEvaluation(submission) ? (
                <>
                  {/* Weightage-based statistics */}
                  <View style={styles.statItem}>
                    <Chip 
                      mode="outlined" 
                      textStyle={{ color: '#4caf50' }}
                      style={{ borderColor: '#4caf50' }}
                    >
                      {submission.score.toFixed(1)} Earned
                    </Chip>
                  </View>
                  <View style={styles.statItem}>
                    <Chip 
                      mode="outlined"
                      textStyle={{ color: '#2196f3' }}
                      style={{ borderColor: '#2196f3' }}
                    >
                      {submission.maxPossibleScore || submission.total_questions} Max
                    </Chip>
                  </View>
                  <View style={styles.statItem}>
                    <Chip 
                      mode="outlined"
                      textStyle={{ color: '#ff9800' }}
                      style={{ borderColor: '#ff9800' }}
                    >
                      {submission.answers.filter(a => a.partialScore && a.partialScore > 0 && a.partialScore < (a.maxPoints || 1)).length} Partial
                    </Chip>
                  </View>
                  <View style={styles.statItem}>
                    <Chip 
                      mode="outlined"
                      textStyle={{ color: '#f44336' }}
                      style={{ borderColor: '#f44336' }}
                    >
                      {submission.answers.filter(a => a.details && a.details.includes('Wrong option')).length} Zero (Wrong)
                    </Chip>
                  </View>
                </>
              ) : (
                <>
                  {/* Traditional statistics */}
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
                </>
              )}
            </View>
            
            <Paragraph style={styles.performanceText}>
              {isWeightageBasedEvaluation(submission) ? (
                (submission.percentage || 0) >= 80 
                  ? "Excellent! You've mastered the weightage-based evaluation system and demonstrated strong understanding." 
                  : (submission.percentage || 0) >= 60 
                  ? "Good work! Remember: any wrong option means zero marks for that question. Focus on accuracy."
                  : "Keep practicing! In weightage-based tests, accuracy is crucial - wrong options eliminate partial credit."
              ) : (
                (submission.percentage || 0) >= 80 
                  ? "Excellent work! You have a strong understanding of the material." 
                  : (submission.percentage || 0) >= 60 
                  ? "Good effort! Review the incorrect answers to improve your understanding."
                  : "Keep studying! Focus on the areas where you had incorrect answers."
              )}
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Question-wise Results */}
        {submission.answers && submission.answers.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Question-wise Results</Title>
              <Paragraph style={styles.answersSubtitle}>
                {isWeightageBasedEvaluation(submission) 
                  ? "Review your answers with weightage breakdown"
                  : "Review your answers compared to the correct ones"
                }
              </Paragraph>
            </Card.Content>
            
            {submission.answers.map((answer, index) => {
              console.log(`Answer ${index}:`, answer); // Debug logging
              
              // Determine if this is a weightage-based question
              const hasWeightages = answer.weightageBreakdown && answer.weightageBreakdown.length > 0;
              const partialScore = answer.partialScore ?? (answer.isCorrect || answer.is_correct ? 1 : 0);
              const maxPoints = answer.maxPoints ?? 1;
              
              return (
                <View key={index}>
                  <List.Item
                    title={`Question ${answer.questionNumber || answer.question_number || index + 1}: ${answer.questionText || 'Question text not available'}`}
                    description={
                      <View style={{ marginTop: 4 }}>
                        <Text style={styles.questionDescription}>
                          Your answer: {answer.selectedOptions 
                            ? (Array.isArray(answer.selectedOptions) ? answer.selectedOptions.join(', ') : answer.selectedOptions)
                            : answer.selectedOption || answer.textAnswer || answer.extracted_answer || 'Not detected'
                          }
                        </Text>
                        <Text style={styles.questionDescription}>
                          Correct: {answer.correctOptions 
                            ? (Array.isArray(answer.correctOptions) ? answer.correctOptions.join(', ') : answer.correctOptions)
                            : answer.correct_answer || 'Not available'
                          }
                        </Text>
                        
                        {/* Score Display */}
                        <Text style={[styles.questionDescription, { fontWeight: 'bold', marginTop: 2 }]}>
                          Score: {partialScore}{maxPoints > 1 ? `/${maxPoints}` : ''}
                          {maxPoints > 1 && ` (${((partialScore/maxPoints) * 100).toFixed(1)}%)`}
                        </Text>
                        
                        {/* Weightage Breakdown */}
                        {hasWeightages && (
                          <View style={styles.weightageDisplay}>
                            <Text style={styles.weightageText}>
                              Weightage: {formatWeightageBreakdown(answer.weightageBreakdown || [])}
                            </Text>
                          </View>
                        )}
                        
                        {/* Detailed Explanation */}
                        {answer.details && (
                          <Text style={[styles.detailsText, { 
                            color: answer.details.includes('Wrong option') ? '#f44336' : '#666'
                          }]}>
                            {answer.details}
                          </Text>
                        )}
                      </View>
                    }
                    left={() => (
                      <View style={styles.questionIcon}>
                        <Paragraph style={[
                          styles.questionNumber,
                          { 
                            backgroundColor: partialScore > 0 ? '#4caf50' : '#f44336',
                            color: 'white'
                          }
                        ]}>
                          {answer.questionNumber || answer.question_number || index + 1}
                        </Paragraph>
                      </View>
                    )}
                    right={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Chip 
                          mode="outlined"
                          compact
                          textStyle={{ 
                            color: partialScore >= maxPoints ? '#4caf50' : 
                                   partialScore > 0 ? '#ff9800' : '#f44336',
                            fontSize: 10
                          }}
                          style={{ 
                            borderColor: partialScore >= maxPoints ? '#4caf50' : 
                                        partialScore > 0 ? '#ff9800' : '#f44336',
                            marginBottom: 2
                          }}
                        >
                          {partialScore >= maxPoints ? 'Perfect' : 
                           partialScore > 0 ? 'Partial' : 'Incorrect'}
                        </Chip>
                        {hasWeightages && (
                          <Text style={{ fontSize: 10, color: '#666' }}>
                            {partialScore}/{maxPoints}
                          </Text>
                        )}
                      </View>
                    )}
                    titleStyle={styles.questionTitle}
                  />
                  {index < submission.answers.length - 1 && <Divider />}
                </View>
              );
            })}
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
    </SafeAreaView>
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
    paddingTop: 20, // Reduced since we're using SafeAreaView
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
    paddingBottom: 100, // Extra bottom padding to ensure content is visible
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
  
  // NEW: Styles for weightage-based evaluation display
  evaluationMethodCard: {
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  evaluationMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  evaluationDescription: {
    fontStyle: 'italic',
    marginBottom: 12,
    fontSize: 14,
  },
  evaluationRules: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
  },
  evaluationRule: {
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  weightageDisplay: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  weightageText: {
    fontSize: 12,
    color: '#1976d2',
    fontFamily: 'monospace',
  },
  detailsText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
