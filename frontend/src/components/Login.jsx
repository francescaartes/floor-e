import React, { useState } from "react";

export default function Login({ onAuthenticated }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const securePassword = import.meta.env.VITE_ROBOT_PASSWORD;

        if (password === securePassword) {
            setError("");
            onAuthenticated(true);
        } else {
            setError("Incorrect password! Access denied.");
        }
    };

    return (
        <main className="app-shell">
            <section className="control-panel auth-card" aria-labelledby="auth-title">
                <div className="title-block auth-title-block">
                    <h1 id="auth-title">LOGIN</h1>
                    <p>Enter the password to establish connection with FLOOR-E.</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        type="password"
                        placeholder="Enter Robot Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                    />
                    <button type="submit" className="speak-button connect-btn">
                        Connect to Robot
                    </button>
                </form>

                {/* Reserves space so the button stays locked in place even when error triggers */}
                <div className="error-zone">
                    {error && (
                        <p className="error-message" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            </section>
        </main>
    );
}