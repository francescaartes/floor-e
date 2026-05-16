#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

#include "secrets.h"

// Motor Driver Pins
const int LEFT_IN1_PIN = 17;
const int LEFT_IN2_PIN = 18;
const int RIGHT_IN3_PIN = 19;
const int RIGHT_IN4_PIN = 21;

const uint16_t PWM_FREQUENCY_HZ = 1000;
const int DRIVE_SPEED = 220;

// Network Config
const char *MQTT_HOST = "88851ab995354e9da75db5b5a3e5560b.s1.eu.hivemq.cloud";
const uint16_t MQTT_PORT = 8883;
const char *MQTT_TOPIC = "robot/drive";

const unsigned long WIFI_RETRY_INTERVAL_MS = 5000;
const unsigned long MQTT_RETRY_INTERVAL_MS = 5000;

WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// Hardware timers
ESP32PWM leftForwardPwm;
ESP32PWM leftReversePwm;
ESP32PWM rightForwardPwm;
ESP32PWM rightReversePwm;

unsigned long lastWifiAttemptAt = 0;
unsigned long lastMqttAttemptAt = 0;

// Network Functions
void connectWifi()
{
    if (WiFi.status() == WL_CONNECTED)
        return;
    const unsigned long now = millis();
    if (now - lastWifiAttemptAt < WIFI_RETRY_INTERVAL_MS)
        return;

    lastWifiAttemptAt = now;
    Serial.print("Connecting to Wi-Fi: ");
    Serial.println(WIFI_SSID);
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void connectMqtt()
{
    if (WiFi.status() != WL_CONNECTED || mqttClient.connected())
        return;
    const unsigned long now = millis();
    if (now - lastMqttAttemptAt < MQTT_RETRY_INTERVAL_MS)
        return;

    lastMqttAttemptAt = now;
    String clientId = "floor-e-esp32-" + String(static_cast<uint32_t>(ESP.getEfuseMac()), HEX);

    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD))
    {
        Serial.println("MQTT connected");
        mqttClient.subscribe(MQTT_TOPIC);
    }
}

// Motor Functions
void writePwm(ESP32PWM &pwm, int speed)
{
    speed = constrain(speed, 0, 255);
    pwm.writeScaled(speed / 255.0f);
}

void setTrack(ESP32PWM &forwardPwm, ESP32PWM &reversePwm, int speed)
{
    speed = constrain(speed, -255, 255);
    if (speed > 0)
    {
        writePwm(forwardPwm, speed);
        writePwm(reversePwm, 0);
    }
    else if (speed < 0)
    {
        writePwm(forwardPwm, 0);
        writePwm(reversePwm, -speed);
    }
    else
    {
        writePwm(forwardPwm, 0);
        writePwm(reversePwm, 0);
    }
}

void drive(int leftSpeed, int rightSpeed)
{
    setTrack(leftForwardPwm, leftReversePwm, leftSpeed);
    setTrack(rightForwardPwm, rightReversePwm, rightSpeed);
}

void stopMotors()
{
    drive(0, 0);
}

void setupPwm()
{
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);

    leftForwardPwm.attachPin(LEFT_IN1_PIN, PWM_FREQUENCY_HZ);
    leftReversePwm.attachPin(LEFT_IN2_PIN, PWM_FREQUENCY_HZ);
    rightForwardPwm.attachPin(RIGHT_IN3_PIN, PWM_FREQUENCY_HZ);
    rightReversePwm.attachPin(RIGHT_IN4_PIN, PWM_FREQUENCY_HZ);
    stopMotors();
}

// Command Parser
String payloadToCommand(byte *payload, unsigned int length)
{
    String command;
    command.reserve(length);
    for (unsigned int i = 0; i < length; i++)
    {
        command += static_cast<char>(payload[i]);
    }
    command.trim();
    command.toUpperCase();
    return command;
}

// Dispatch Command
void handleCommand(const String &command)
{
    if (command == "FORWARD")
    {
        drive(DRIVE_SPEED, DRIVE_SPEED);
    }
    else if (command == "REVERSE" || command == "BACK")
    {
        drive(-DRIVE_SPEED, -DRIVE_SPEED);
    }
    else if (command == "LEFT")
    {
        drive(-DRIVE_SPEED, DRIVE_SPEED);
    }
    else if (command == "RIGHT")
    {
        drive(DRIVE_SPEED, -DRIVE_SPEED);
    }
    else if (command == "STOP")
    {
        stopMotors();
    }
    else
    {
        Serial.println("Unknown: " + command);
    }
}

// MQTT Callback
void mqttCallback(char *topic, byte *payload, unsigned int length)
{
    if (String(topic) != MQTT_TOPIC)
        return;
    handleCommand(payloadToCommand(payload, length));
}

void setup()
{
    Serial.begin(115200);
    delay(100);

    setupPwm(); // Initialize tracks on boot

    // Setup Network
    WiFi.mode(WIFI_STA);
    espClient.setInsecure();
    mqttClient.setServer(MQTT_HOST, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setKeepAlive(15);

    lastWifiAttemptAt = millis() - WIFI_RETRY_INTERVAL_MS;
    lastMqttAttemptAt = millis() - MQTT_RETRY_INTERVAL_MS;

    Serial.println("System Booting...");
}

void loop()
{
    connectWifi(); // Check Wifi every frame
    connectMqtt(); // Check MQTT every frame

    if (mqttClient.connected())
    {
        mqttClient.loop(); // MQTT loop
    }
}