import React from 'react';
import { View, Text, Linking, TouchableOpacity, StyleSheet } from 'react-native';

export const ResponseCard = ({ answer, references }: any) => {
  return (
    <View style={styles.card}>
      <Text style={styles.answer}>{answer}</Text>
      {references?.length > 0 && (
        <View style={{marginTop: 8}}>
          <Text style={styles.title}>Legal References</Text>
          {references.map((r: any, i: number) => (
            <TouchableOpacity key={i} onPress={() => Linking.openURL(r.url)}>
              <Text style={styles.link}>{r.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, width: '100%' },
  answer: { color: '#111827' },
  title: { color: '#6b7280', fontWeight: '600' },
  link: { color: '#4f46e5', marginTop: 6 }
});

export default ResponseCard;
