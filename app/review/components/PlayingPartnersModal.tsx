import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeProvider';
import { X, UserPlus, Check } from 'lucide-react-native';
import { User } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { getFollowingUsers } from '../../utils/friends';

interface PlayingPartnersModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (selectedUsers: User[]) => void;
  selectedUsers: User[];
}

export const PlayingPartnersModal: React.FC<PlayingPartnersModalProps> = ({
  visible,
  onClose,
  onSave,
  selectedUsers,
}) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedUsers, setLocalSelectedUsers] = useState<User[]>(selectedUsers);

  useEffect(() => {
    console.log('PlayingPartnersModal mounted');
    if (visible && user) {
      loadFollowingUsers();
    }
  }, [visible, user]);

  useEffect(() => {
    setLocalSelectedUsers(selectedUsers);
  }, [selectedUsers]);

  const loadFollowingUsers = async () => {
    if (!user) return;
    try {
      console.log('Loading following users...');
      const users = await getFollowingUsers(user.id);
      console.log('Following users loaded:', users);
      setFollowingUsers(users);
    } catch (error) {
      console.error('Error loading following users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (user: User) => {
    console.log('Toggling user:', user.id);
    setLocalSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      }
      if (prev.length >= 3) {
        console.log('Maximum number of users (3) reached');
        return prev;
      }
      return [...prev, user];
    });
  };

  const handleSave = () => {
    console.log('Saving selected users:', localSelectedUsers);
    onSave(localSelectedUsers);
    onClose();
  };

  const handleInviteNonAppUser = () => {
    console.log('Invite non-app user pressed');
    // This will be implemented in the future
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    headerTitle: {
      ...theme.typography.h3,
      color: theme.colors.text,
    },
    closeButton: {
      padding: theme.spacing.sm,
    },
    content: {
      flex: 1,
      padding: theme.spacing.md,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: theme.spacing.md,
    },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: theme.colors.onSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    userName: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
    },
    inviteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.md,
    },
    inviteButtonText: {
      ...theme.typography.body,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    saveButton: {
      margin: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    saveButtonText: {
      ...theme.typography.body,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Who did you play with?</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : (
            <>
              {followingUsers.map((user) => {
                const isSelected = localSelectedUsers.some((u) => u.id === user.id);
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.userItem}
                    onPress={() => toggleUser(user)}
                  >
                    <View style={styles.userInfo}>
                      {user.profileImage ? (
                        <Image
                          source={{ uri: user.profileImage }}
                          style={styles.avatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {user.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.userName}>{user.name}</Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected
                    ]}>
                      {isSelected && (
                        <Check size={16} color={theme.colors.onPrimary} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleInviteNonAppUser}
              >
                <UserPlus size={20} color={theme.colors.primary} />
                <Text style={styles.inviteButtonText}>
                  Invite non-app user
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            Done ({localSelectedUsers.length}/3)
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}; 