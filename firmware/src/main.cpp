#include <Arduino.h>
#include <ESP32Servo.h>

#include "secrets.h"

// Motor Driver Pins
const int LEFT_IN1_PIN = 17;
const int LEFT_IN2_PIN = 18;
const int RIGHT_IN3_PIN = 19;
const int RIGHT_IN4_PIN = 21;

const uint16_t PWM_FREQUENCY_HZ = 1000;
const int DRIVE_SPEED = 220;

// Hardware timers
ESP32PWM leftForwardPwm;
ESP32PWM leftReversePwm;
ESP32PWM rightForwardPwm;
ESP32PWM rightReversePwm;

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

void setup()
{
    Serial.begin(115200);
    delay(100);
    setupPwm(); // Initialize tracks on boot
    Serial.println("System Booting...");
}

void loop()
{
}