# ResQAlert  Disaster Early Warning System

A robust, integrated platform for early disaster alerts and response in Sri Lanka. Built with Electron, Firebase, Kotlin, and Arduino, ResQAlert delivers real-time warnings to help safeguard communities and support disaster management efforts.

This project provides a disaster early warning system for Sri Lanka, focusing on proactive alerts and response for floods and landslides. It leverages real-time data from sensors (e.g., water level, soil moisture, rainfall, seismic) to enable timely disaster mitigation. The system comprises two main components:

- **Villager Pre-Warning Mobile App**: An Android app delivering real-time alerts to villagers about potential floods and landslides, with an SOS feature for emergency rescue requests.
- **Admin Disaster Command Center**: A desktop application built with Electron JS for authorities to monitor sensor activity, manage SOS calls, and generate reports for disaster response and research.

Data is processed in real-time using Firebase Realtime Database for the mobile app, while historical data is stored in a MySQL database for research and analysis. The system is designed to support Sri Lanka’s disaster-prone regions and align with national disaster management efforts.

## 📦 Features

### Common Features
- Real-time integration of sensor data for flood (water levels, rainfall) and landslide (soil stability, ground movement) monitoring.
- Persistent storage in MySQL for historical data analysis and research.
- Scalable architecture to support Sri Lanka’s disaster management needs.
- Intelligent alert system with automated notifications based on sensor thresholds and anomaly detection.
- Multi-sensor monitoring for environmental, seismic, and landslide sensors.

### Villager Pre-Warning Mobile App (Android)
- Real-time push notifications for flood and landslide warnings (e.g., "Flood Alert: Evacuate Now").
- Simple UI displaying current sensor readings and local risk levels.
- SOS button to send emergency rescue requests with GPS location.
- Powered by Firebase Realtime Database for low-latency alerts.
- Offline mode for basic alerts using cached data.
- Location-based alerts tailored to the user’s region in Sri Lanka.

### Admin Disaster Command Center (Electron JS)
- Real-time monitoring dashboard with insights into critical disaster metrics and resource status.
- Admin-level control panel for granular control over operational parameters and resource allocation.
- Modern Electron JS UI for an intuitive and responsive user experience across desktop environments.
- Firebase integration for real-time database connectivity.
- Built-in Firebase connection testing functionality.
- Professional data visualization with interactive charts and graphs using Chart.js.
- Auto-refresh capability for real-time data.
- Responsive design optimized for various screen sizes and resolutions.
- User management system with role-based access control.
- Activity logging for real-time tracking of user actions and system events.
- Real-time dashboard with visualizations (maps, graphs, heatmaps) of sensor activity across Sri Lanka.
- Management of SOS calls from the mobile app, including location tracking and response coordination.
- Report generation (PDF/CSV) for sensor data, incident logs, and disaster analytics.
- MySQL integration for querying historical data for research.
- Alerts for critical sensor thresholds to trigger immediate action.

## 🛠 Technologies Used
- **Mobile App**: Android (Java/Kotlin), Firebase Realtime Database, Firebase Authentication, Google Maps API.
- **Admin Command Center**: Electron JS (HTML/CSS/JS for UI, Node.js for backend).
- **Databases**:
  - Firebase Realtime Database: Real-time data syncing for mobile app alerts and SOS.
  - MySQL: Persistent storage for historical data and research queries.
- **Sensor Integration**: API feeds from sensors (extendable with IoT protocols like MQTT), Arduino for IoT sensor integration.
- **Visualization**: Chart.js for admin dashboard graphs.
- **Other**: Secure data transmission, Firebase push notifications.

## 🏗 Architecture
### Data Flow
- Sensors send data to a central server via API.
- Firebase Realtime Database syncs data for mobile app alerts.
- MySQL stores all data for long-term analysis.
- Mobile app receives push notifications via Firebase.
- SOS requests from the mobile app are routed to Firebase and displayed in the admin app.
- Admin app queries MySQL for reports and analytics.

### Security
- Firebase Authentication for users and admins.
- Encrypted API calls.
- MySQL access controls.

## ✅ Prerequisites
Before you begin, ensure you have the following software installed:

- **Node.js**: Version 16 or higher is recommended.
- **npm**: Node Package Manager, bundled with Node.js.
- **Android Studio**: For building and testing the mobile app.
- **Arduino IDE**: For programming and deploying sensor-related code.
- **Firebase Account**: For configuring Firebase Realtime Database and Authentication.
- **MySQL**: For setting up the historical data database.

## 📥 Installation
Execute the following commands in your terminal to clone the repository and install the necessary dependencies for the Admin Disaster Command Center:

```bash
# Clone the repository from GitHub
git clone https://github.com/sachithasamadhib/ResQAlert---Disaster_Early_Warning_System.git

# Navigate into the project directory
cd ResQAlert---Disaster_Early_Warning_System\command_center

# Install all required project dependencies
npm install
```

For the mobile app and sensor integration, refer to the respective subdirectories (`mobile-app` and `arduino-sensors`) in the repository for specific setup instructions.

## ▶️ Running the Application
After installing the dependencies, you can launch the Admin Disaster Command Center in development mode:

```bash
# Start the Electron application in development mode
npm start
```

For the mobile app, use Android Studio to build and deploy the app to an Android device or emulator. For Arduino, upload the sensor code to your Arduino board using the Arduino IDE.

## 🤝 Contributing
We welcome contributions to enhance ResQAlert. To contribute, please follow these guidelines:

1. **Fork** this repository to your GitHub account.
2. **Create** a new feature branch: `git checkout -b feature/your-feature-name`
3. **Implement** your changes, ensuring code quality and adherence to existing patterns.
4. **Commit** your changes with a clear and descriptive message (e.g., `feat: Add user authentication module`).
5. **Push** your branch to your forked repository: `git push origin feature/your-feature-name`
6. **Open** a Pull Request against the main branch of this repository, providing a detailed description of your changes.

For minor suggestions or bug reports, feel free to open an issue with the appropriate tag.

## 👥 Contributors
We are grateful to the following contributors for their valuable efforts in building ResQAlert:

- [Viraj Wathsala Gunasinghe](https://github.com/virajwathsalag)
- [Ravin Jayasanka](https://github.com/MrRaveen)
- [Sanuja Rasanajna](https://github.com/SanujaRasanajna2007)

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact
For inquiries, support, or collaboration opportunities, please reach out to the project maintainer:

- **Project Maintainer**: Sachitha Samadhi
- **GitHub Profile**: [@sachithasamadhib](https://github.com/sachithasamadhib)

---

Thank you for your interest in ResQAlert! Together, we can help protect Sri Lanka from natural disasters.
