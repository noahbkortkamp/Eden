import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { Heart, MessageCircle, Bookmark } from 'lucide-react-native';

export const TouchTestComponent: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Touch Test Component</Text>
      
      {/* Test the same structure as our fixed FriendReviewCard */}
      <View style={styles.card}>
        {/* Main touchable area for navigation */}
        <Pressable 
          style={styles.cardContent}
          onPress={() => {
            console.log('🖱️ Card navigation pressed!');
          }}
        >
          <Text style={styles.cardText}>Tap here for navigation</Text>
        </Pressable>
        
        {/* Interaction buttons - separate from navigation */}
        <View style={styles.interactionsContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed
            ]}
            onPress={() => {
              console.log('🖱️ Like button pressed!');
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Heart size={24} color="#007AFF" />
          </Pressable>
          
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed
            ]}
            onPress={() => {
              console.log('🖱️ Comment button pressed!');
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <MessageCircle size={24} color="#007AFF" />
          </Pressable>
          
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed
            ]}
            onPress={() => {
              console.log('🖱️ Bookmark button pressed!');
            }}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Bookmark size={24} color="#007AFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  cardText: {
    fontSize: 16,
    textAlign: 'center',
  },
  interactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
}); 