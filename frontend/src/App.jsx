import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import StatusHeader from "./components/StatusHeader";
import VoiceController from "./components/VoiceController";
import TelemetryGrid from "./components/TelemetryGrid";
import "./App.css";

const MQTT_URL = import.meta.env.VITE_MQTT_URL;
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME;
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD;

const COMMAND_PATTERNS = [
    { command: "FORWARD", words: ["FORWARD"] },
    { command: "REVERSE", words: ["REVERSE", "BACK"] },
    { command: "LEFT", words: ["LEFT"] },
    { command: "RIGHT", words: ["RIGHT"] },
    { command: "STOP", words: ["STOP"] },
];

function parseCommand(transcript) {
    const normalized = transcript.toUpperCase();
    return COMMAND_PATTERNS.find(({ words }) =>
        words.some((word) => normalized.includes(word)),
    )?.command;
}

function createSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognition.interimResults = true;
    return recognition;
}

function App() {
    const mqttClientRef = useRef(null);
    const recognitionRef = useRef(null);
    const isIntentionallyListening = useRef(false);
    const activeCommandRef = useRef("STOP");

    const [connectionStatus, setConnectionStatus] = useState("Connecting");
    const [speechStatus, setSpeechStatus] = useState("Idle");
    const [transcript, setTranscript] = useState("");
    const [lastCommand, setLastCommand] = useState("None");
    const [error, setError] = useState("");

    // MQTT Connection Setup
    useEffect(() => {
        const client = mqtt.connect(MQTT_URL, {
            username: MQTT_USERNAME,
            password: MQTT_PASSWORD,
            clean: true,
            connectTimeout: 10_000,
            reconnectPeriod: 2_000,
            clientId: `floor-e-web-${Math.random().toString(16).slice(2)}`, 
        });

        mqttClientRef.current = client;

        client.on("connect", () => {
            setConnectionStatus("Connected");
            setError("");
        });
        client.on("reconnect", () => setConnectionStatus("Reconnecting"));
        client.on("close", () => setConnectionStatus("Disconnected"));
        client.on("offline", () => setConnectionStatus("Offline"));
        client.on("error", (mqttError) => {
            console.error("MQTT Error:", mqttError);
            setConnectionStatus("Error");
            setError(mqttError.message || "Connection refused");
        });

        return () => {
            client.end(true);
            mqttClientRef.current = null;
        };
    }, []);

    // Heartbeat Interval for Watchdog Safety
    useEffect(() => {
        const heartbeat = setInterval(() => {
            const client = mqttClientRef.current;
            const currentCmd = activeCommandRef.current;

            if (client?.connected && currentCmd !== "STOP") {
                client.publish(MQTT_TOPIC, currentCmd, { qos: 0, retain: false });
            }
        }, 500);

        return () => clearInterval(heartbeat);
    }, []);

    // Speech Recognition Init
    useEffect(() => {
        recognitionRef.current = createSpeechRecognition();
        return () => {
            recognitionRef.current?.abort();
        };
    }, []);

    const publishCommand = (command) => {
        const client = mqttClientRef.current;
        if (!client?.connected) {
            setError("MQTT is not connected yet.");
            return;
        }

        activeCommandRef.current = command;

        client.publish(MQTT_TOPIC, command, { qos: 0, retain: false }, (err) => {
            if (err) {
                setError(err.message);
                return;
            }
            setLastCommand(command);
            setError("");
        });
    };

    const toggleListening = () => {
        const recognition = recognitionRef.current;
        if (!recognition) {
            setError("This browser does not support the Web Speech API.");
            return;
        }

        if (isIntentionallyListening.current) {
            isIntentionallyListening.current = false;
            recognition.stop();
            setSpeechStatus("Idle");
            publishCommand("STOP");
            return;
        }

        isIntentionallyListening.current = true;
        setSpeechStatus("Listening");
        setTranscript("");
        setError("");

        recognition.onresult = (event) => {
            const latestResultIndex = event.results.length - 1;
            const spokenText = event.results[latestResultIndex][0].transcript;
            const command = parseCommand(spokenText);

            setTranscript(spokenText);

            if (command && command !== activeCommandRef.current) {
                publishCommand(command);
            }
        };

        recognition.onerror = (event) => {
            if (event.error === "no-speech") return;
            setSpeechStatus("Idle");
            isIntentionallyListening.current = false;
            setError(`Speech recognition error: ${event.error}`);
        };

        recognition.onend = () => {
            if (isIntentionallyListening.current) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Auto-restart failed", e);
                }
            } else {
                setSpeechStatus("Idle");
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.error("Recognition already started");
        }
    };

    return (
        <main className="app-shell">
            <section className="control-panel" aria-labelledby="app-title">
                <StatusHeader connectionStatus={connectionStatus} topic={MQTT_TOPIC} />
                
                <VoiceController speechStatus={speechStatus} onToggleListening={toggleListening} />
                
                <TelemetryGrid transcript={transcript} lastCommand={lastCommand} speechStatus={speechStatus} />

                {error && (
                    <p className="error-message" role="alert">
                        {error}
                    </p>
                )}
            </section>
        </main>
    );
}

export default App;