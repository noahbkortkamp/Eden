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
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useEdenTheme } from '../../theme/ThemeProvider';
import { colors, spacing, borderRadius } from '../../theme/tokens';
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
  const edenTheme = useEdenTheme();
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background.base }]}>
        <View style={[styles.header, {
          borderBottomColor: colors.border.default,
          backgroundColor: colors.background.paper
        }]}>
          <Text style={[styles.headerTitle, edenTheme.typography.h3]}>
            Who did you play with?
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.primary} />
              <Text style={[styles.loadingText, edenTheme.typography.bodySmall]}>
                Loading friends...
              </Text>
            </View>
          ) : (
            <>
              {followingUsers.map((user) => {
                const isSelected = localSelectedUsers.some((u) => u.id === user.id);
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userItem, edenTheme.components.card.listItem]}
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
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border.default }]}>
                          <Text style={[styles.avatarText, { color: colors.text.primary }]}>
                            {user.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.userName, edenTheme.typography.body]}>{user.name}</Text>
                    </View>
                    <View style={[
                      styles.checkbox,
                      { borderColor: colors.accent.primary },
                      isSelected && { backgroundColor: colors.accent.primary }
                    ]}>
                      {isSelected && (
                        <Check size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.inviteButton, edenTheme.components.button.secondary]}
                onPress={handleInviteNonAppUser}
              >
                <UserPlus size={20} color={colors.accent.primary} />
                <Text style={[styles.inviteButtonText, edenTheme.typography.buttonSecondary]}>
                  Invite non-app user
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <TouchableOpacity 
          style={{
            backgroundColor: colors.accent.primary,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            marginHorizontal: spacing.md,
            marginBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
            marginTop: spacing.md,
          }}
          onPress={handleSave}
        >
          <Text style={{
            color: '#FFFFFF',
            textAlign: 'center',
            fontSize: 16,
            fontWeight: '600',
          }}>
            Done ({localSelectedUsers.length}/3)
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userName: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  inviteButtonText: {
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
  },
}); 