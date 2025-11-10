import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

export const QueryBox = ({ onSubmit, onStartVoice, disabled }: any) => {
  const [text, setText] = useState('');
  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Hỏi luật bằng văn bản hoặc bấm mic để nói..."
        style={styles.input}
        editable={!disabled}
        onSubmitEditing={() => { onSubmit(text); setText(''); }}
      />
      <TouchableOpacity style={styles.voice} onPress={onStartVoice}>
        <Text style={{color: 'white'}}>🎙️</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  input: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#fff', marginRight: 8 },
  voice: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }
});

export default QueryBox;
