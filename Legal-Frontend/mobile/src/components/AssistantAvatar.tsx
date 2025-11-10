import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const AssistantAvatar = ({ state }: { state: 'idle'|'listening'|'processing'|'speaking' }) => {
  const bg = {
    idle: '#6366f1',
    listening: '#10b981',
    processing: '#f59e0b',
    speaking: '#0ea5e9'
  }[state];

  return (
    <View style={styles.container}>
      <View style={[styles.circle, { backgroundColor: bg }]}> 
        <Text style={styles.text}>{state === 'listening' ? '🎙️' : 'VA'}</Text>
      </View>
      <Text style={styles.state}>{state.toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  circle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  text: { color: 'white', fontSize: 24, fontWeight: '700' },
  state: { marginTop: 8, color: '#6b7280' }
});

export default AssistantAvatar;
