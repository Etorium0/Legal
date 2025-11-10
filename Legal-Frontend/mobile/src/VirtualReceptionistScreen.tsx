import React, { useEffect, useState } from 'react';
import { View, SafeAreaView, Text, ScrollView, Button, StyleSheet } from 'react-native';
import AssistantAvatar from './components/AssistantAvatar';
import QueryBox from './components/QueryBox';
import ResponseCard from './components/ResponseCard';
import * as Speech from 'expo-speech';
import { queryEndpoint } from './api';

export default function VirtualReceptionistScreen() {
  const [state, setState] = useState<'idle'|'listening'|'processing'|'speaking'>('idle');
  const [response, setResponse] = useState<any|null>(null);
  const [history, setHistory] = useState<any[]>([]);

  async function handleSubmit(text: string) {
    if (!text) return;
    setState('processing');
    try {
      const res = await queryEndpoint(text);
      setResponse(res);
      setHistory((h) => [{ question: text, answer: res.answer }, ...h].slice(0,5));
      setState('speaking');
      Speech.speak(res.answer, { onDone: () => setState('idle') });
    } catch (e) {
      setResponse({ answer: 'Lỗi: không thể kết nối' });
      setState('idle');
    }
  }

  function startVoice() {
    // For brevity, we're not integrating react-native-voice here; instead simulate a flow.
    setState('listening');
    setTimeout(() => {
      setState('processing');
      setTimeout(() => {
        handleSubmit('Câu hỏi mô phỏng từ giọng nói');
      }, 1200);
    }, 2500);
  }

  return (
    <SafeAreaView style={{flex:1, backgroundColor: '#f3f4f6'}}>
      <ScrollView contentContainerStyle={{padding:16}}>
        <View style={{alignItems:'center', marginBottom:12}}>
          <AssistantAvatar state={state} />
        </View>
        <QueryBox onSubmit={handleSubmit} onStartVoice={startVoice} disabled={state!=='idle'} />
        {response && <ResponseCard answer={response.answer} references={response.references} />}

        <View style={{marginTop:16}}>
          <Text style={{fontWeight:'600', color:'#374151'}}>Lịch sử</Text>
          {history.map((h,i)=> (
            <View key={i} style={{backgroundColor:'#fff', padding:8, borderRadius:8, marginTop:8}}>
              <Text style={{fontSize:12, color:'#6b7280'}}>Q</Text>
              <Text>{h.question}</Text>
              <Text style={{fontSize:12, color:'#6b7280'}}>A: {h.answer.slice(0,120)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
