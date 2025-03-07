import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { X, Users as Users2, Tags, File as FileEdit, Camera, Calendar, Lock, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [sentiment, setSentiment] = useState<'liked' | 'fine' | 'disliked' | null>(null);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.courseName}>Augusta National</Text>
            <Text style={styles.courseLocation}>Augusta, GA • Private</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color="#000" />
          </Pressable>
        </View>

        <View style={styles.addToList}>
          <Text style={styles.addToListText}>Add to my list of</Text>
          <Pressable style={styles.courseTypeButton}>
            <Text style={styles.courseTypeText}>Golf Courses ▼</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Sentiment Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How was it?</Text>
          <View style={styles.sentimentContainer}>
            <Pressable
              style={[
                styles.sentimentButton,
                sentiment === 'liked' && styles.sentimentButtonSelected,
                { backgroundColor: sentiment === 'liked' ? '#4ade80' : '#e2e8f0' },
              ]}
              onPress={() => setSentiment('liked')}>
              <Text style={styles.sentimentText}>I liked it!</Text>
            </Pressable>
            <Pressable
              style={[
                styles.sentimentButton,
                sentiment === 'fine' && styles.sentimentButtonSelected,
                { backgroundColor: sentiment === 'fine' ? '#fbbf24' : '#e2e8f0' },
              ]}
              onPress={() => setSentiment('fine')}>
              <Text style={styles.sentimentText}>It was fine</Text>
            </Pressable>
            <Pressable
              style={[
                styles.sentimentButton,
                sentiment === 'disliked' && styles.sentimentButtonSelected,
                { backgroundColor: sentiment === 'disliked' ? '#f87171' : '#e2e8f0' },
              ]}
              onPress={() => setSentiment('disliked')}>
              <Text style={styles.sentimentText}>I didn't like it</Text>
            </Pressable>
          </View>
        </View>

        {/* Review Options */}
        <View style={styles.section}>
          <Pressable style={styles.option}>
            <Users2 size={24} color="#64748b" />
            <Text style={styles.optionText}>Who did you play with?</Text>
            <ChevronRight size={24} color="#64748b" style={styles.chevron} />
          </Pressable>

          <Pressable style={styles.option}>
            <Tags size={24} color="#64748b" />
            <Text style={styles.optionText}>Add labels (conditions, etc.)</Text>
            <ChevronRight size={24} color="#64748b" style={styles.chevron} />
          </Pressable>

          <Pressable style={styles.option}>
            <FileEdit size={24} color="#64748b" />
            <Text style={styles.optionText}>Add notes</Text>
            <ChevronRight size={24} color="#64748b" style={styles.chevron} />
          </Pressable>

          <Pressable style={styles.option}>
            <Camera size={24} color="#64748b" />
            <Text style={styles.optionText}>Add photos</Text>
            <Text style={styles.required}>Required (min. 5)</Text>
            <ChevronRight size={24} color="#64748b" style={styles.chevron} />
          </Pressable>

          <Pressable style={styles.option}>
            <Calendar size={24} color="#64748b" />
            <Text style={styles.optionText}>Add visit date</Text>
            <ChevronRight size={24} color="#64748b" style={styles.chevron} />
          </Pressable>

          <View style={styles.option}>
            <Lock size={24} color="#64748b" />
            <View style={styles.stealthModeContainer}>
              <Text style={styles.optionText}>Stealth mode</Text>
              <Text style={styles.stealthDescription}>Hide this activity from newsfeed</Text>
            </View>
            <View style={styles.toggle}>
              <View style={styles.toggleKnob} />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.submitButton, !sentiment && styles.submitButtonDisabled]}
          disabled={!sentiment}>
          <Text style={[styles.submitButtonText, !sentiment && styles.submitButtonTextDisabled]}>
            Submit Review
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  courseLocation: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  addToList: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  addToListText: {
    fontSize: 16,
    color: '#64748b',
  },
  courseTypeButton: {
    marginLeft: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  courseTypeText: {
    fontSize: 16,
    color: '#000',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#000',
  },
  sentimentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sentimentButton: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  sentimentButtonSelected: {
    transform: [{ scale: 1.05 }],
  },
  sentimentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  required: {
    fontSize: 14,
    color: '#ef4444',
    marginRight: 8,
  },
  chevron: {
    marginLeft: 'auto',
  },
  stealthModeContainer: {
    flex: 1,
    marginLeft: 12,
  },
  stealthDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: '#e2e8f0',
    borderRadius: 14,
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#94a3b8',
  },
});