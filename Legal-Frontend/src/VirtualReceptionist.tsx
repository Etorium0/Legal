import React from "react";
import { useWakeWord } from "./services/useWakeWord";
import { useVoiceSTT } from "./services/useVoiceSTT";

export default function VirtualReceptionist() 
{
  const { start: startSTT } = useVoiceSTT({
    onText: (text) => 
{
      console.log("User said:", text);
    },
    onComplete: () => 
{
      console.log("Done speaking.");
    },
  });

  useWakeWord({
    wakeWords: ["hey legal", "trợ lý ơi", "assistant", "hey assistant"],
    onWake: () => 
{
      console.log("Wake word detected!");
      startSTT(); // bắt đầu STT chính
    },
  });

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2>Assistant is listening (SIRI MODE)</h2>
      <p>Try saying: "Hey Legal", "Trợ lý ơi", "Assistant", ...</p>
    </div>
  );
}
