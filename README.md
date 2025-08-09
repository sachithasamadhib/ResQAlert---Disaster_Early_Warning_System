# 🚨 Disaster Management Admin Panel (ElectronJS App)

A robust, cross-platform desktop application built with Electron, meticulously engineered to facilitate comprehensive management, real-time monitoring, and precise control of disaster-related resources and critical data.

## 📦 Key Features

- **Real-time Monitoring Dashboard**: Provides immediate insights into critical disaster metrics and resource status
- **Admin-Level Control Panel**: Offers granular control over operational parameters and resource allocation
- **Modern ElectronJS UI**: Delivers an intuitive and responsive user experience across various desktop environments
- **Firebase Integration**: Real-time database connection for disaster alert system
- **Connection Testing**: Built-in Firebase connection testing functionality
- **Professional Data Visualization**: Interactive charts and graphs using Chart.js
- **Multi-Sensor Monitoring**: Comprehensive monitoring of environmental, seismic, and landslide sensors
- **Intelligent Alert System**: Automated alerts based on sensor thresholds and anomaly detection
- **Auto-Refresh Capability**: Real-time data updates every 30 seconds
- **Responsive Design**: Optimized for various screen sizes and resolutions
- **User Management System**: Complete user administration with role-based access control
- **Activity Logging**: Real-time tracking of user actions and system events

## 🔥 Firebase Integration

The app is now integrated with Firebase for real-time data management:

- **Project ID**: disasteralertsystem-78a0c
- **Database URL**: https://disasteralertsystem-78a0c-default-rtdb.asia-southeast1.firebasedatabase.app
- **Auth Domain**: disasteralertsystem-78a0c.firebaseapp.com

## 🌡️ Sensor Monitoring

### 1. **BMP180 Environmental Sensor (Gampaha)**
- **Temperature Monitoring**: Real-time temperature readings in Celsius
- **Atmospheric Pressure**: Pressure readings in hectopascals (hPa)
- **Altitude Calculation**: Calculated altitude based on pressure readings
- **Alerts**: Triggers warnings for high temperature (>35°C) or low pressure (<1000 hPa)

### 2. **MPU6050 Seismic Activity Monitor (Rathnapura)**
- **3-Axis Accelerometer**: X, Y, Z acceleration measurements in g-force
- **3-Axis Gyroscope**: Angular velocity measurements
- **Earthquake Detection**: Automatic alert when total acceleration exceeds 1.5g
- **Warning System**: Yellow warning for moderate activity (1.2-1.5g)

### 3. **Tilt Sensor Landslide Detection (Rathnapura)**
- **Digital Tilt Detection**: Binary status (Normal/Tilted)
- **Real-time Status**: Immediate notification of tilt changes
- **Critical Alerts**: Red alert when tilt is detected (potential landslide)
- **Reading Counter**: Total number of readings recorded

## 👥 User Management System

### **User Administration**
- **Role-Based Access Control**: 8 different user roles with specific permissions
- **Real-time Status Tracking**: Active, Offline, and Training status monitoring
- **User Profiles**: Comprehensive user information with avatars and contact details
- **Permission Management**: Granular permission system for different access levels

### **User Roles & Permissions**
1. **Administrator**: Full system access, user management, emergency response
2. **Meteorologist**: Weather data access, environmental monitoring, weather alerts
3. **Seismologist**: Seismic data access, earthquake monitoring, geological alerts
4. **Emergency Coordinator**: Emergency response, alert broadcasting, resource management
5. **Field Officer**: Field data collection, equipment maintenance
6. **Data Analyst**: Data analysis, report generation, statistical modeling
7. **System Technician**: System maintenance, equipment repair
8. **Trainee Observer**: Basic data viewing, training modules

### **Activity Monitoring**
- **Real-time Activity Log**: Live tracking of all user actions
- **Action Classification**: Login events, data access, alerts, maintenance activities
- **Severity Levels**: Info, Warning, and Critical activity classification
- **Detailed Logging**: Comprehensive details for each user action with timestamps

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm package manager
- Active internet connection for Firebase

### Installation & Setup

1. **Clone or Download the Project**
   ```bash
   cd e:\NIBM\HDSE\IOT\disastermanagement_admin_panel
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit the .env file with your Firebase credentials
   # You can use any text editor like notepad, VS Code, etc.
   notepad .env
   ```

4. **Set Up Firebase Credentials**
   - Open your Firebase project console
   - Go to Project Settings > General
   - Copy your Firebase configuration values
   - Paste them into the `.env` file

5. **Start the Application**
   ```bash
   # Standard mode
   npm start
   
   # Development mode (with DevTools if enabled)
   npm run start:dev
   
   # Production mode
   npm run start:prod
   
   # Validate environment setup
   npm run validate-env
   ```

### 🔧 Development Scripts

- `npm start` - Start the application in normal mode
- `npm run start:dev` - Start in development mode with DevTools enabled
- `npm run start:prod` - Start in production mode
- `npm run setup` - Run setup wizard for environment configuration
- `npm run validate-env` - Validate that all environment variables are properly configured

### 🔐 Environment Variables

The application uses environment variables to securely store sensitive information. All credentials are stored in a `.env` file that is not committed to the repository.

#### Required Variables:
- `FIREBASE_API_KEY` - Your Firebase API key
- `FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `FIREBASE_DATABASE_URL` - Firebase Realtime Database URL
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `FIREBASE_APP_ID` - Firebase app ID

#### Optional Configuration:
- `NODE_ENV` - Environment mode (development/production)
- `ENABLE_DEV_TOOLS` - Enable Chrome DevTools in development
- `ALERT_THRESHOLD_TEMPERATURE` - Temperature alert threshold (default: 35°C)
- `ALERT_THRESHOLD_PRESSURE` - Pressure alert threshold (default: 1000 hPa)
- `ALERT_THRESHOLD_ACCELERATION` - Acceleration alert threshold (default: 1.5g)

### 🛡️ Security Features

- **Environment Variables**: All sensitive credentials stored securely
- **Git Ignore**: `.env` file excluded from version control
- **Validation**: Startup validation ensures all required variables are set
- **Context Isolation**: Electron security best practices implemented
- **No Hardcoded Secrets**: All credentials configurable via environment

## 🎯 Dashboard Features

### **Professional Interface**
- **Modern Design**: Glass-morphism design with gradient backgrounds
- **Responsive Layout**: Adaptive grid system for optimal viewing
- **Color-Coded Status**: Visual indicators for normal, warning, and alert states
- **Real-time Charts**: Interactive line charts showing sensor trends

### **Alert System**
- **Automatic Detection**: Intelligent threshold-based alert generation
- **Priority Levels**: Different alert types (Info, Warning, Critical)
- **Visual Indicators**: Color-coded cards and status indicators
- **Timestamp Tracking**: Precise time logging for all alerts

### **Data Visualization**
- **Environmental Chart**: Dual-axis chart showing temperature and pressure trends
- **Seismic Activity Chart**: Multi-line chart displaying X, Y, Z acceleration
- **Landslide Chart**: Step chart showing tilt sensor status over time
- **Real-time Updates**: Charts update automatically with new data
- **User Statistics**: Visual representation of user status and activity metrics

## 📊 Alert Thresholds

| Sensor | Parameter | Warning Level | Critical Level |
|--------|-----------|---------------|----------------|
| BMP180 | Temperature | > 35°C | > 40°C |
| BMP180 | Pressure | < 1000 hPa | < 990 hPa |
| MPU6050 | Total Acceleration | > 1.2g | > 1.5g |
| Tilt | Status | N/A | Tilted (1) |
| Users | Failed Login Attempts | > 3 attempts | > 5 attempts |
| System | Offline Duration | > 5 minutes | > 15 minutes |

## 🔧 Technical Architecture

### **Frontend Technologies**
- **HTML5**: Modern semantic markup
- **CSS3**: Advanced styling with gradients, animations, and responsive design
- **JavaScript ES6+**: Modern JavaScript with async/await patterns
- **Chart.js**: Professional data visualization library

### **Backend Integration**
- **Electron Main Process**: Secure Firebase integration
- **IPC Communication**: Secure renderer-main process communication
- **Firebase SDK**: Real-time database connectivity
- **Context Isolation**: Enhanced security architecture

### **Security Features**
- **Context Isolation**: Enabled for secure renderer process
- **Node Integration**: Disabled in renderer for security
- **IPC Communication**: Secure communication between main and renderer processes
- **Preload Script**: Safe exposure of Electron APIs to renderer

## 🛠️ Development

### **Project Structure**
```
├── main.js              # Main Electron process with Firebase integration
├── preload.js           # Secure preload script for IPC communication
├── index.html           # Comprehensive dashboard interface
├── firebase-config.js   # Firebase configuration (ES6 modules)
├── package.json         # Project dependencies and scripts
└── README.md           # Documentation
```

### **Adding New Sensors**
1. Update `main.js` to add new Firebase data fetching functions
2. Add new IPC handlers in `main.js`
3. Expose new API methods in `preload.js`
4. Create new card sections in `index.html`
5. Add corresponding chart and update functions in JavaScript

### **Adding New User Roles**
1. Update the `dummyUsers` array in `main.js`
2. Add new role permissions in the user object
3. Update role-specific styling in CSS if needed
4. Add new permission categories to the permission management system

## 📱 Responsive Design

The dashboard is fully responsive and optimized for:
- **Desktop**: 1400x900 minimum resolution
- **Laptop**: Adaptive layout for smaller screens
- **Tablet**: Touch-friendly interface (if using touch-enabled devices)

## 🔍 Troubleshooting

### **Common Issues**

1. **Firebase Connection Issues**
   - Verify internet connection
   - Check Firebase API key validity
   - Ensure Firebase project is active
   - Verify database rules allow read access

2. **Charts Not Displaying**
   - Ensure Chart.js is properly loaded
   - Check browser console for JavaScript errors
   - Verify sensor data is being received

3. **Application Won't Start**
   - Run `npm install` to ensure all dependencies are installed
   - Check if Node.js and npm are properly installed
   - Verify Electron is installed: `npm list electron`

4. **Data Not Updating**
   - Check Firebase connection status
   - Verify ESP32 device is online and sending data
   - Use "Refresh Data" button to manually update

5. **User Management Issues**
   - Verify user data is loading correctly
   - Check browser console for JavaScript errors
   - Ensure all user management API calls are working

### **Development Debugging**
- Uncomment `win.webContents.openDevTools();` in `main.js` to enable DevTools
- Check console logs for error messages
- Monitor network tab for Firebase requests

## 🚀 Future Enhancements

- **Historical Data Analysis**: Extended data storage and analysis capabilities
- **Export Functionality**: CSV/PDF export of sensor data and reports
- **Email Alerts**: Automated email notifications for critical alerts
- **Mobile App Integration**: Companion mobile application
- **Advanced Analytics**: Machine learning-based anomaly detection
- **Multi-location Support**: Support for additional sensor locations
- **User Management**: Multi-user access control and permissions
- **Real-time Notifications**: Desktop and mobile push notifications
- **Database Integration**: Support for additional database systems
- **API Development**: RESTful API for third-party integrations

## 📞 Support

For technical support or feature requests, please refer to the project documentation or contact the development team.

## � License

This project is licensed under the ISC License - see the package.json file for details.

---

**Developed with ❤️ for Disaster Management and Public Safety**

## 🛠️ Technologies Utilized

This application is built upon a modern technology stack to ensure performance, scalability, and maintainability:

| Technology | Role |
|------------|------|
| Electron | Core framework for desktop application shell |
| Node.js | Backend runtime environment for application logic |
| HTML/CSS | Front-end structure and aesthetic styling |
| JavaScript | Client-side and server-side application logic |

## 🚀 Getting Started

To set up and run this project on your local machine for development and testing purposes, please follow the instructions below.

### ✅ Prerequisites

Before you begin, ensure you have the following software installed:

- **Node.js**: Version 16 or higher is recommended
- **npm**: Node Package Manager, which is bundled with Node.js

### 📥 Installation

Execute the following commands in your terminal to clone the repository and install the necessary dependencies:

```bash
# Clone the repository from GitHub
git clone https://github.com/sachithasamadhib/disastermanagement_admin_panel.git

# Navigate into the project directory
cd disastermanagement_admin_panel

# Install all required project dependencies
npm install
```

### ▶️ Running the Application

After successfully installing the dependencies, you can launch the application in development mode:

```bash
# Start the Electron application in development mode
npm start
```

## 🤝 Contributing

We welcome and appreciate contributions to this project. Your efforts help us improve and expand the capabilities of the Disaster Management Admin Panel.

To contribute, please follow these guidelines:

1. **Fork** this repository to your GitHub account
2. **Create** a new feature branch: `git checkout -b feature/your-feature-name`
3. **Implement** your changes, ensuring code quality and adherence to existing patterns
4. **Commit** your changes with a clear and descriptive message (e.g., `feat: Add user authentication module`)
5. **Push** your branch to your forked repository: `git push origin feature/your-feature-name`
6. **Open** a Pull Request against the main branch of this repository, providing a detailed description of your changes

For minor suggestions or bug reports, feel free to open an issue with the appropriate tag.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

For any inquiries, support, or collaboration opportunities, please reach out to the project maintainer:

- **Project Maintainer**: Sachitha Samadhi
- **GitHub Profile**: [@sachithasamadhib](https://github.com/sachithasamadhib)

---

Thank you for your interest in the Disaster Management Admin Panel! 🙏
`
