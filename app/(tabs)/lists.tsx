import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Plus, ChevronRight, Star, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ListsScreen() {
  // Mock data - would come from your backend
  const lists = [
    {
      id: '1',
      title: 'Recently Played',
      description: 'Courses you\'ve played recently',
      courseCount: 5,
      image: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=3270&auto=format&fit=crop',
    },
    {
      id: '2',
      title: 'Favorite Courses',
      description: 'Your top-rated golf courses',
      courseCount: 8,
      image: 'https://images.unsplash.com/photo-1600740288397-83cae0357539?q=80&w=3270&auto=format&fit=crop',
    },
    {
      id: '3',
      title: 'Want to Play',
      description: 'Your golf course bucket list',
      courseCount: 12,
      image: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=3270&auto=format&fit=crop',
    },
    {
      id: '4',
      title: 'Local Courses',
      description: 'Courses near you',
      courseCount: 15,
      image: 'https://images.unsplash.com/photo-1600740288397-83cae0357539?q=80&w=3270&auto=format&fit=crop',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Courses</Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {lists.map((list) => (
          <TouchableOpacity key={list.id} style={styles.listCard}>
            <Image source={{ uri: list.image }} style={styles.listImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gradient}>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>{list.title}</Text>
                <Text style={styles.listDescription}>{list.description}</Text>
                <View style={styles.listStats}>
                  <View style={styles.stat}>
                    <MapPin size={16} color="#fff" />
                    <Text style={styles.statText}>{list.courseCount} courses</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
            <ChevronRight size={24} color="#fff" style={styles.chevron} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listCard: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  listInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 14,
    color: '#e2e8f0',
    marginBottom: 8,
  },
  listStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#fff',
  },
  chevron: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
}); 