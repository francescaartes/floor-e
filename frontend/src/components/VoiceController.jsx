import React from "react";

export default function VoiceController({ speechStatus, onToggleListening }) {
    const isListening = speechStatus === "Listening";

    return (
        <button
            type="button"
            className="speak-button"
            onClick={onToggleListening}
            style={{
                backgroundColor: isListening ? "#ff4444" : "",
                color: isListening ? "white" : "",
            }}
        >
            {isListening ? "Stop Listening" : "Tap to Speak"}
        </button>
    );
}