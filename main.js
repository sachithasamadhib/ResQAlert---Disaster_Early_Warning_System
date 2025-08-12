const { app, BrowserWindow, ipcMain } = require('electron');

// Load environment variables
require('dotenv').config();

// Validate required environment variables
function validateEnvironmentVariables() {
  const required = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    console.error('📋 Refer to .env.example for the complete list of required variables.\n');
    process.exit(1);
  } else {
    console.log('✅ All required environment variables are set.');
  }
}

// Validate environment on startup
validateEnvironmentVariables();

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

let firebaseApp = null;
let database = null;

// Configuration constants from environment variables
const CONFIG = {
  ALERT_THRESHOLDS: {
    TEMPERATURE: parseFloat(process.env.ALERT_THRESHOLD_TEMPERATURE) || 35,
    PRESSURE: parseFloat(process.env.ALERT_THRESHOLD_PRESSURE) || 1000,
    ACCELERATION: parseFloat(process.env.ALERT_THRESHOLD_ACCELERATION) || 1.5
  },
  SESSION: {
    TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 3600000,
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5
  },
  DATABASE: {
    CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    RETRY_ATTEMPTS: parseInt(process.env.DB_RETRY_ATTEMPTS) || 3
  }
};

// Initialize Firebase
async function initializeFirebase() {
  try {
    const firebase = await import('firebase/app');
    const firebaseDatabase = await import('firebase/database');
    
    firebaseApp = firebase.initializeApp(firebaseConfig);
    database = firebaseDatabase.getDatabase(firebaseApp);
    
    return true;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return false;
  }
}

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    if (!database) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        return { success: false, message: 'Failed to initialize Firebase' };
      }
    }
    
    const firebaseDatabase = await import('firebase/database');
    const testRef = firebaseDatabase.ref(database, '/');
    const snapshot = await firebaseDatabase.get(testRef);
    
    return { 
      success: true, 
      message: 'Firebase connection successful!',
      connected: true
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Firebase connection failed: ${error.message}`,
      connected: false
    };
  }
}

// IPC handler for Firebase connection test
ipcMain.handle('test-firebase-connection', async () => {
  return await testFirebaseConnection();
});

// Fetch latest sensor readings
async function fetchLatestSensorData() {
  try {
    if (!database) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        return { success: false, message: 'Failed to initialize Firebase' };
      }
    }
    
    const firebaseDatabase = await import('firebase/database');
    
  // Fetch latest data from each sensor type
  const bmpRef = firebaseDatabase.ref(database, '/Sensors/BMP180Readings');
  const mpuRef = firebaseDatabase.ref(database, '/Sensors/MPU6050Readings');
  const rainRef = firebaseDatabase.ref(database, '/Sensors/RainReadings');
  // Support multiple possible soil paths
  const soilRefPrimary = firebaseDatabase.ref(database, '/Sensors/SoilReadings');
  const soilRefAlt1 = firebaseDatabase.ref(database, '/SoilMoistureReadings');
  const soilRefAlt2 = firebaseDatabase.ref(database, '/Sensors/SoilMoistureReadings');
  const tiltRef = firebaseDatabase.ref(database, '/Sensors/TiltReadings');
  // Water level sensor
  const waterLevelRef = firebaseDatabase.ref(database, '/Sensors/waterLevelSensor/levelData');
    
    // Get last 20 readings from each sensor
  const bmpQuery = firebaseDatabase.query(bmpRef, firebaseDatabase.limitToLast(20));
  const mpuQuery = firebaseDatabase.query(mpuRef, firebaseDatabase.limitToLast(20));
  const rainQuery = firebaseDatabase.query(rainRef, firebaseDatabase.limitToLast(20));
  const soilQueryPrimary = firebaseDatabase.query(soilRefPrimary, firebaseDatabase.limitToLast(20));
  const soilQueryAlt1 = firebaseDatabase.query(soilRefAlt1, firebaseDatabase.limitToLast(20));
  const soilQueryAlt2 = firebaseDatabase.query(soilRefAlt2, firebaseDatabase.limitToLast(20));
  const tiltQuery = firebaseDatabase.query(tiltRef, firebaseDatabase.limitToLast(20));
  const waterLevelQuery = firebaseDatabase.query(waterLevelRef, firebaseDatabase.limitToLast(20));
    
    const [bmpSnapshot, mpuSnapshot, rainSnapshot, soilSnapPrimary, soilSnapAlt1, soilSnapAlt2, tiltSnapshot, waterLevelSnapshot] = await Promise.all([
      firebaseDatabase.get(bmpQuery),
      firebaseDatabase.get(mpuQuery),
      firebaseDatabase.get(rainQuery),
      firebaseDatabase.get(soilQueryPrimary),
      firebaseDatabase.get(soilQueryAlt1),
      firebaseDatabase.get(soilQueryAlt2),
      firebaseDatabase.get(tiltQuery),
      firebaseDatabase.get(waterLevelQuery)
    ]);

    // Choose the first soil snapshot that exists
    const soilSnapshot = soilSnapAlt1.exists() ? soilSnapAlt1 : (soilSnapPrimary.exists() ? soilSnapPrimary : (soilSnapAlt2.exists() ? soilSnapAlt2 : soilSnapPrimary));
    
    // Process the soil data to ensure it's in the expected format
    let processedSoilData = {};
    if (soilSnapshot && soilSnapshot.exists()) {
      const rawData = soilSnapshot.val();
      // Check if the data is already in the expected format (object with numeric keys)
      if (typeof rawData === 'object' && rawData !== null) {
        if (Object.keys(rawData).length > 0 && Object.keys(rawData).every(k => !isNaN(Number(k)))) {
          // Data is already in expected format
          processedSoilData = rawData;
        } else {
          // Convert to expected format if it's a single reading or different structure
          // Create at least one entry with a timestamp
          const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
          processedSoilData = { '1': { ...rawData, timestamp } };
        }
      }
    }
    
    // Helper to get a readable location string from a reading record
    const getLocationString = (rec) => {
      if (!rec || typeof rec !== 'object') return '';
      const flat = [
        rec.location,
        rec.Location,
        rec.loc,
        rec.place,
        rec.site,
        rec.area,
        rec.city,
        rec.district,
        rec.region,
        rec.town
      ];
      const flatStr = flat.find(v => typeof v === 'string' && v.trim());
      if (flatStr) return flatStr.trim();
      const locObj = typeof rec.location === 'object' && rec.location !== null ? rec.location : null;
      if (locObj) {
        const { name, city, district, area, region, town } = locObj;
        const parts = [name, city, district, area, region, town].filter(s => typeof s === 'string' && s.trim());
        if (parts.length) return parts.join(', ');
      }
      if (typeof rec.latitude === 'number' && typeof rec.longitude === 'number') {
        return `${rec.latitude}, ${rec.longitude}`;
      }
      if (typeof rec.lat === 'number' && typeof rec.lng === 'number') {
        return `${rec.lat}, ${rec.lng}`;
      }
      return '';
    };

    // Helper to pick latest record by timestamp or numeric-like key
    const getLatestFromMap = (mapObj) => {
      if (!mapObj || typeof mapObj !== 'object') return null;
      const entries = Object.entries(mapObj);
      if (entries.length === 0) return null;
      const withTs = entries.map(([k, v]) => {
        let t = 0;
        if (v && typeof v === 'object' && v.timestamp) {
          const d = new Date(v.timestamp);
          if (!isNaN(d.getTime())) t = d.getTime();
        }
        return { k, v, t };
      });
      const anyTs = withTs.some(e => e.t > 0);
      if (anyTs) {
        withTs.sort((a, b) => a.t - b.t);
        return withTs[withTs.length - 1].v;
      }
      const parsed = entries.map(([k, v]) => {
        const n = Number(k);
        return { k, v, n: Number.isFinite(n) ? n : null };
      });
      const numericOnly = parsed.filter(e => e.n !== null);
      if (numericOnly.length > 0) {
        numericOnly.sort((a, b) => a.n - b.n);
        return numericOnly[numericOnly.length - 1].v;
      }
      return entries[entries.length - 1][1];
    };

    // Try to get locations from latest readings
    const rainData = rainSnapshot.exists() ? rainSnapshot.val() : {};
  const soilData = soilSnapshot && soilSnapshot.exists() ? soilSnapshot.val() : {};
    const latestRain = getLatestFromMap(rainData);
    const latestSoil = getLatestFromMap(soilData);
    let rainLocation = getLocationString(latestRain);
    let soilLocation = getLocationString(latestSoil);

    // Helper to fetch a location by trying multiple candidate paths
    const tryFetchLocationFromPaths = async (paths) => {
      for (const p of paths) {
        try {
          const refp = firebaseDatabase.ref(database, p);
          const snap = await firebaseDatabase.get(refp);
          if (snap.exists()) {
            const val = snap.val();
            const str = typeof val === 'string' ? val : getLocationString(val);
            if (str) return str;
          }
        } catch { /* ignore individual failures */ }
      }
      return '';
    };

    // If still missing soil/rain locations, try ID-based resolution first
    const idFields = ['deviceId','sensorId','device','node','stationId','id','sensor','station','nodeId','device_id','sensor_id'];
    const resolveByIds = async (latest) => {
      if (!latest || typeof latest !== 'object') return '';
      const ids = idFields.map(f => latest[f]).filter(v => typeof v === 'string' && v.trim());
      const bases = ['/Devices','/Sensors/Devices','/Sensors/Meta','/Sensors','/SensorNodes','/Nodes','/Stations','/SensorsInfo','/DevicesInfo'];
      for (const id of ids) {
        const paths = bases.map(b => `${b}/${id}`);
        const found = await tryFetchLocationFromPaths(paths);
        if (found) return found;
      }
      return '';
    };

    if (!soilLocation) {
      soilLocation = await resolveByIds(latestSoil);
    }
    if (!rainLocation) {
      rainLocation = await resolveByIds(latestRain);
    }

    // Fallback: try common meta nodes with more exhaustive keys
    const metaBases = ['/Sensors/Locations','/Locations','/Sensors/Meta','/Meta/Sensors','/SensorLocations','/Configs/Sensors','/Meta'];
    if (!rainLocation || !soilLocation) {
      for (const base of metaBases) {
        const candidates = [
          `${base}/Rain`, `${base}/rain`, `${base}/RainSensor`, `${base}/rainSensor`, `${base}/RainReadings`,
          `${base}/Soil`, `${base}/soil`, `${base}/SoilSensor`, `${base}/soilSensor`, `${base}/SoilReadings`
        ];
        try {
          // Try batch-like sequential attempts
          const found = await tryFetchLocationFromPaths(candidates);
          if (found) {
            if (!rainLocation && /rain/i.test(found) === false) {
              // If this is a generic string, still accept
              rainLocation = rainLocation || found;
            }
            if (!soilLocation) soilLocation = found; // we'll refine below
          }
        } catch { /* ignore */ }
        if (rainLocation && soilLocation) break;
      }
    }

    // As a final fallback, try explicit soil/rain location nodes
    const SOIL_LOC_PATH = process.env.SOIL_LOCATION_PATH;
    const RAIN_LOC_PATH = process.env.RAIN_LOCATION_PATH;
    if (!soilLocation) {
      const paths = ['/SoilLocation','/Soil/location','/Soil/Location','/Sensors/Soil/location','/Sensors/Soil/Location'];
      if (SOIL_LOC_PATH && typeof SOIL_LOC_PATH === 'string') paths.unshift(SOIL_LOC_PATH);
      soilLocation = await tryFetchLocationFromPaths(paths);
    }
    if (!rainLocation) {
      const paths = ['/RainLocation','/Rain/location','/Rain/Location','/Sensors/Rain/location','/Sensors/Rain/Location'];
      if (RAIN_LOC_PATH && typeof RAIN_LOC_PATH === 'string') paths.unshift(RAIN_LOC_PATH);
      rainLocation = await tryFetchLocationFromPaths(paths);
    }

    return {
      success: true,
      data: {
        bmp180: bmpSnapshot.exists() ? bmpSnapshot.val() : {},
        mpu6050: mpuSnapshot.exists() ? mpuSnapshot.val() : {},
        rain: rainSnapshot.exists() ? rainSnapshot.val() : {},
        soil: processedSoilData, // Use the processed soil data
        tilt: tiltSnapshot.exists() ? tiltSnapshot.val() : {},
        waterLevel: waterLevelSnapshot.exists() ? waterLevelSnapshot.val() : {},
        locations: { 
          rain: rainLocation || '', 
          soil: soilLocation || '',
          waterLevel: 'Gampaha' // Hardcoded for this example, can be dynamic in the future
        },
        debug: {
          soilPath: soilSnapshot.exists() ? soilSnapshot.ref.toString() : 'N/A',
          soilRawCount: soilSnapshot.exists() ? Object.keys(soilSnapshot.val() || {}).length : 0,
          processedSoilCount: Object.keys(processedSoilData).length
        }
      }
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to fetch sensor data: ${error.message}` 
    };
  }
}

// Fetch all sensor data for historical analysis
async function fetchAllSensorData() {
  try {
    if (!database) {
      const initialized = await initializeFirebase();
      if (!initialized) {
        return { success: false, message: 'Failed to initialize Firebase' };
      }
    }
    
    const firebaseDatabase = await import('firebase/database');
    
  const bmpRef = firebaseDatabase.ref(database, '/Sensors/BMP180Readings');
  const mpuRef = firebaseDatabase.ref(database, '/Sensors/MPU6050Readings');
  const rainRef = firebaseDatabase.ref(database, '/Sensors/RainReadings');
  const soilRefPrimary = firebaseDatabase.ref(database, '/Sensors/SoilReadings');
  const soilRefAlt1 = firebaseDatabase.ref(database, '/SoilMoistureReadings');
  const soilRefAlt2 = firebaseDatabase.ref(database, '/Sensors/SoilMoistureReadings');
  const tiltRef = firebaseDatabase.ref(database, '/Sensors/TiltReadings');
    
    const [bmpSnapshot, mpuSnapshot, rainSnapshot, soilSnapPrimary, soilSnapAlt1, soilSnapAlt2, tiltSnapshot] = await Promise.all([
      firebaseDatabase.get(bmpRef),
      firebaseDatabase.get(mpuRef),
      firebaseDatabase.get(rainRef),
      firebaseDatabase.get(soilRefPrimary),
      firebaseDatabase.get(soilRefAlt1),
      firebaseDatabase.get(soilRefAlt2),
      firebaseDatabase.get(tiltRef)
    ]);
    const soilSnapshot = soilSnapAlt1.exists() ? soilSnapAlt1 : (soilSnapPrimary.exists() ? soilSnapPrimary : (soilSnapAlt2.exists() ? soilSnapAlt2 : soilSnapPrimary));
    
    return {
      success: true,
      data: {
  bmp180: bmpSnapshot.exists() ? bmpSnapshot.val() : {},
  mpu6050: mpuSnapshot.exists() ? mpuSnapshot.val() : {},
  rain: rainSnapshot.exists() ? rainSnapshot.val() : {},
  soil: soilSnapshot && soilSnapshot.exists() ? soilSnapshot.val() : {},
        tilt: tiltSnapshot.exists() ? tiltSnapshot.val() : {}
      }
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to fetch all sensor data: ${error.message}` 
    };
  }
}

// IPC handlers for data fetching
ipcMain.handle('fetch-latest-sensor-data', async () => {
  return await fetchLatestSensorData();
});

ipcMain.handle('fetch-all-sensor-data', async () => {
  return await fetchAllSensorData();
});

// Dummy user data for demonstration
const dummyUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@disastermanagement.lk',
    role: 'Administrator',
    status: 'Active',
    lastLogin: '2025-08-07 14:30:25',
    location: 'Colombo',
    permissions: ['View All Data', 'Manage Users', 'System Settings', 'Emergency Response'],
    avatar: '👨‍💼'
  },
  {
    id: 2,
    name: 'Dr. Priya Wickramasinghe',
    email: 'priya.w@meteorology.gov.lk',
    role: 'Meteorologist',
    status: 'Active',
    lastLogin: '2025-08-07 13:45:12',
    location: 'Gampaha',
    permissions: ['View Weather Data', 'Environmental Monitoring', 'Weather Alerts'],
    avatar: '👩‍🔬'
  },
  {
    id: 3,
    name: 'Eng. Rohan Fernando',
    email: 'rohan.f@seismic.gov.lk',
    role: 'Seismologist',
    status: 'Active',
    lastLogin: '2025-08-07 12:20:45',
    location: 'Rathnapura',
    permissions: ['View Seismic Data', 'Earthquake Monitoring', 'Geological Alerts'],
    avatar: '👨‍🔬'
  },
  {
    id: 4,
    name: 'Ms. Chamari Silva',
    email: 'chamari.s@emergency.gov.lk',
    role: 'Emergency Coordinator',
    status: 'Active',
    lastLogin: '2025-08-07 14:15:30',
    location: 'Kandy',
    permissions: ['Emergency Response', 'Alert Broadcasting', 'Resource Management'],
    avatar: '👩‍🚒'
  },
  {
    id: 5,
    name: 'Mr. Kasun Perera',
    email: 'kasun.p@field.gov.lk',
    role: 'Field Officer',
    status: 'Active',
    lastLogin: '2025-08-07 11:30:15',
    location: 'Badulla',
    permissions: ['Field Data Collection', 'Equipment Maintenance'],
    avatar: '👨‍🔧'
  },
  {
    id: 6,
    name: 'Dr. Nimalka Jayawardena',
    email: 'nimalka.j@research.ac.lk',
    role: 'Data Analyst',
    status: 'Active',
    lastLogin: '2025-08-07 10:45:20',
    location: 'Colombo',
    permissions: ['Data Analysis', 'Report Generation', 'Statistical Modeling'],
    avatar: '👩‍💻'
  },
  {
    id: 7,
    name: 'Mr. Sunil Rathnayake',
    email: 'sunil.r@maintenance.gov.lk',
    role: 'System Technician',
    status: 'Offline',
    lastLogin: '2025-08-06 17:20:10',
    location: 'Galle',
    permissions: ['System Maintenance', 'Equipment Repair'],
    avatar: '👨‍🔧'
  },
  {
    id: 8,
    name: 'Ms. Sanduni Mendis',
    email: 'sanduni.m@trainee.gov.lk',
    role: 'Trainee Observer',
    status: 'Training',
    lastLogin: '2025-08-07 09:15:45',
    location: 'Matara',
    permissions: ['Basic Data Viewing', 'Training Modules'],
    avatar: '👩‍🎓'
  }
];

// User activity log
const userActivityLog = [
  {
    id: 1,
    userId: 1,
    userName: 'Admin User',
    action: 'System Login',
    timestamp: '2025-08-07 14:30:25',
    details: 'Successful login from IP: 192.168.1.100',
    severity: 'info'
  },
  {
    id: 2,
    userId: 2,
    userName: 'Dr. Priya Wickramasinghe',
    action: 'Weather Alert Created',
    timestamp: '2025-08-07 13:45:12',
    details: 'High temperature alert for Gampaha region',
    severity: 'warning'
  },
  {
    id: 3,
    userId: 3,
    userName: 'Eng. Rohan Fernando',
    action: 'Seismic Data Review',
    timestamp: '2025-08-07 12:20:45',
    details: 'Reviewed MPU6050 readings for anomalies',
    severity: 'info'
  },
  {
    id: 4,
    userId: 4,
    userName: 'Ms. Chamari Silva',
    action: 'Emergency Protocol Activated',
    timestamp: '2025-08-07 14:15:30',
    details: 'Landslide warning issued for Rathnapura',
    severity: 'critical'
  },
  {
    id: 5,
    userId: 5,
    userName: 'Mr. Kasun Perera',
    action: 'Equipment Maintenance',
    timestamp: '2025-08-07 11:30:15',
    details: 'Tilt sensor calibration completed',
    severity: 'info'
  },
  {
    id: 6,
    userId: 6,
    userName: 'Dr. Nimalka Jayawardena',
    action: 'Data Export',
    timestamp: '2025-08-07 10:45:20',
    details: 'Monthly environmental report generated',
    severity: 'info'
  },
  {
    id: 7,
    userId: 1,
    userName: 'Admin User',
    action: 'User Permission Updated',
    timestamp: '2025-08-07 09:20:15',
    details: 'Updated permissions for Trainee Observer',
    severity: 'warning'
  },
  {
    id: 8,
    userId: 8,
    userName: 'Ms. Sanduni Mendis',
    action: 'Training Module Completed',
    timestamp: '2025-08-07 09:15:45',
    details: 'Completed "Basic Sensor Reading" module',
    severity: 'info'
  }
];

// Get users data
async function getUsersData() {
  return {
    success: true,
    data: {
      users: dummyUsers,
      totalUsers: dummyUsers.length,
      activeUsers: dummyUsers.filter(user => user.status === 'Active').length,
      offlineUsers: dummyUsers.filter(user => user.status === 'Offline').length,
      trainingUsers: dummyUsers.filter(user => user.status === 'Training').length
    }
  };
}

// Get user activity log
async function getUserActivity() {
  return {
    success: true,
    data: userActivityLog.slice(-20) // Return last 20 activities
  };
}

// IPC handlers for user management
ipcMain.handle('get-users-data', async () => {
  return await getUsersData();
});

ipcMain.handle('get-user-activity', async () => {
  return await getUserActivity();
});

function createWindow () {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: __dirname + '/preload.js'
    }
  });

  win.loadFile('index.html');
  
  // Open DevTools in development mode based on environment variable
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_TOOLS === 'true') {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
