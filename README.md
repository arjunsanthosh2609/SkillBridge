const int sensorPin=A0;

void setup()
{
  Serial.begin(115200);
  Serial.print("Smart Enery Monitoring System");
}

void loop()
{
  int sensorValue=analogRead(sensorPin);

  float voltage=sensorValue * (3.3/1023.0);

  float current=voltage/0.185;

  Serial.print(" Sensor Value:");
  Serial.print(sensorValue);

  Serial.print(" Voltage: ");
  Serial.println(voltage);

  //approximate
  Serial.print(" V  Current: ");
  Serial.print(current);

  Serial.print(" A");

  delay(1000);
}
