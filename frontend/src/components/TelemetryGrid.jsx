import React from "react";

export default function TelemetryGrid({ transcript, lastCommand, speechStatus }) {
    return (
        <div className="telemetry-grid">
            <article>
                <span>Transcript</span>
                <strong>{transcript || ". . ."}</strong>
            </article>
            <article>
                <span>Command sent</span>
                <strong>{lastCommand}</strong>
            </article>
            <article>
                <span>Speech</span>
                <strong>{speechStatus}</strong>
            </article>
        </div>
    );
}