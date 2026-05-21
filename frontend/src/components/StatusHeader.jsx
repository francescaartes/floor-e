import React from "react";

export default function StatusHeader({ connectionStatus, topic }) {
    return (
        <>
            <div className="status-row">
                <span className="status-label">MQTT</span>
                <span
                    className={`status-pill ${connectionStatus.toLowerCase()}`}
                    aria-live="polite"
                >
                    {connectionStatus}
                </span>
            </div>

            <div className="title-block">
                <h1 id="app-title">FLOOR-E</h1>
                <p>Speak a drive command and send it to {topic}.</p>
            </div>
        </>
    );
}