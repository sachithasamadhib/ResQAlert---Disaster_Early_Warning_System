const { app, BrowserWindow, ipcMain, Menu } = require("electron")

// Load environment variables
require("dotenv").config()

// Validate required environment variables
function validateEnvironmentVariables() {
  const required = [
    "FIREBASE_API_KEY",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_DATABASE_URL",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_APP_ID",
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:")
    missing.forEach((key) => console.error(`   - ${key}`))
    console.error("\n💡 Please check your .env file and ensure all required variables are set.")
    console.error("📋 Refer to .env.example for the complete list of required variables.\n")
    process.exit(1)
  } else {
    console.log("✅ All required environment variables are set.")
  }
}

// Validate environment on startup
validateEnvironmentVariables()

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
}

let firebaseApp = null
let database = null
let firestore = null // Firestore instance for persistent notifications

// Configuration constants from environment variables
const CONFIG = {
  ALERT_THRESHOLDS: {
    TEMPERATURE: Number.parseFloat(process.env.ALERT_THRESHOLD_TEMPERATURE) || 35,
    PRESSURE: Number.parseFloat(process.env.ALERT_THRESHOLD_PRESSURE) || 1000,
    ACCELERATION: Number.parseFloat(process.env.ALERT_THRESHOLD_ACCELERATION) || 1.5,
  },
  SESSION: {
    TIMEOUT: Number.parseInt(process.env.SESSION_TIMEOUT) || 3600000,
    MAX_LOGIN_ATTEMPTS: Number.parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  },
  DATABASE: {
    CONNECTION_TIMEOUT: Number.parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    RETRY_ATTEMPTS: Number.parseInt(process.env.DB_RETRY_ATTEMPTS) || 3,
  },
}

// Initialize Firebase
async function initializeFirebase() {
  try {
    const firebase = await import("firebase/app")
    const firebaseDatabase = await import("firebase/database")
  const firebaseFirestore = await import("firebase/firestore")

    firebaseApp = firebase.initializeApp(firebaseConfig)
    database = firebaseDatabase.getDatabase(firebaseApp)
  firestore = firebaseFirestore.getFirestore(firebaseApp)

    return true
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    return false
  }
}

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    if (!database) {
      const initialized = await initializeFirebase()
      if (!initialized) {
        return { success: false, message: "Failed to initialize Firebase" }
      }
    }

    const firebaseDatabase = await import("firebase/database")
    const testRef = firebaseDatabase.ref(database, "/")
    const snapshot = await firebaseDatabase.get(testRef)

    return {
      success: true,
      message: "Firebase connection successful!",
      connected: true,
    }
  } catch (error) {
    return {
      success: false,
      message: `Firebase connection failed: ${error.message}`,
      connected: false,
    }
  }
}

// IPC handler for Firebase connection test
ipcMain.handle("test-firebase-connection", async () => {
  return await testFirebaseConnection()
})

// Fetch latest sensor readings
async function fetchLatestSensorData() {
  try {
    if (!database) {
      const initialized = await initializeFirebase()
      if (!initialized) {
        return { success: false, message: "Failed to initialize Firebase" }
      }
    }

  const firebaseDatabase = await import("firebase/database")
  const soilDebug = (process.env.SOIL_DEBUG || "false").toLowerCase() === "true"
  const soilLog = (...args) => { if (soilDebug) console.log(...args) }
  soilLog("=== SOIL MOISTURE DEBUG: Starting data fetch ===")
    // Fetch latest data from each sensor type
  const bmpRef = firebaseDatabase.ref(database, "/Sensors/BMP180Readings")
  const mpuRef = firebaseDatabase.ref(database, "/Sensors/MPU6050Readings")
  const rainRef = firebaseDatabase.ref(database, "/Sensors/RainReadings")
  const floodsRainRef = firebaseDatabase.ref(database, "/Sensors/FloodsRainReadings")

    // Ordered soil moisture path candidates (most likely first). An optional
    // env override SOIL_MOISTURE_PATH lets you force a single path.
    const soilPaths = [
      process.env.SOIL_MOISTURE_PATH || "/Sensors/SoilMoistureReadings", // actual structure (from screenshot)
      "/Sensors/SoilReadings", // legacy / incorrect older name
      "/Sensors/SoilMoisture", // possible shortened variant
      "/Sensors/SoilSensor",
      "/SoilMoistureReadings", // top-level (older firmware sometimes pushed here)
      "/SoilSensor",
      "/Soil",
      "/Sensors/Soil", // generic fallbacks
    ]

  soilLog("[SoilDebug] Candidate soil paths (in priority order):", soilPaths)

    const tiltRef = firebaseDatabase.ref(database, "/Sensors/TiltReadings")

    // Water level dynamic path detection (similar strategy to soil)
    const waterDebug = (process.env.WATER_DEBUG || "false").toLowerCase() === "true"
    const wLog = (...a) => { if (waterDebug) console.log("[WaterDebug]", ...a) }
    const waterOverride = process.env.WATER_LEVEL_PATH
    const waterLevelPathCandidates = [
      waterOverride || "/Sensors/waterLevelSensor/levelData",
      "/Sensors/waterLevelSensor/leveldata", // case variant
      "/Sensors/waterLevelSensor",
      "/Sensors/WaterLevelSensor/levelData",
      "/Sensors/WaterLevelSensor",
      "/waterLevelSensor/levelData",
      "/WaterLevelSensor/levelData",
      "/waterLevelSensor",
      "/WaterLevelSensor",
      "/Sensors/WaterLevel", // alternate naming
      "/Sensors/WaterLevelReadings",
    ].filter((v, i, arr) => v && arr.indexOf(v) === i)

    let waterLevelSnapshot = null
    let workingWaterLevelPath = null
    for (const path of waterLevelPathCandidates) {
      try {
        wLog("Trying water level path:", path)
        const wRef = firebaseDatabase.ref(database, path)
        const wQuery = firebaseDatabase.query(wRef, firebaseDatabase.limitToLast(50))
        const snap = await firebaseDatabase.get(wQuery)
        if (snap.exists()) {
          waterLevelSnapshot = snap
          workingWaterLevelPath = path
          const val = snap.val() || {}
          wLog("Found water level data at", path, "entries:", Object.keys(val).length)
          break
        }
      } catch (err) {
        wLog("Error checking water level path", path, err.message)
      }
    }
    if (!workingWaterLevelPath) {
      wLog("No water level data found in candidate paths")
    } else {
      wLog("Using water level path:", workingWaterLevelPath)
    }

    // Get last 20 readings from each sensor
  const bmpQuery = firebaseDatabase.query(bmpRef, firebaseDatabase.limitToLast(20))
  const mpuQuery = firebaseDatabase.query(mpuRef, firebaseDatabase.limitToLast(20))
  const rainQuery = firebaseDatabase.query(rainRef, firebaseDatabase.limitToLast(20))
  const floodsRainQuery = firebaseDatabase.query(floodsRainRef, firebaseDatabase.limitToLast(20))
    const tiltQuery = firebaseDatabase.query(tiltRef, firebaseDatabase.limitToLast(20))
    // Only create waterLevelQuery if we have a working path snapshot (avoid errors)
    const waterLevelQuery = workingWaterLevelPath ? firebaseDatabase.query(
      firebaseDatabase.ref(database, workingWaterLevelPath),
      firebaseDatabase.limitToLast(20)
    ) : null

    let soilSnapshot = null
    let workingSoilPath = null

    for (const path of soilPaths) {
      try {
  soilLog(`[SoilDebug] Trying soil path: ${path}`)
        const soilRef = firebaseDatabase.ref(database, path)
        const soilQuery = firebaseDatabase.query(soilRef, firebaseDatabase.limitToLast(20))
        const snapshot = await firebaseDatabase.get(soilQuery)
        if (snapshot.exists()) {
          soilSnapshot = snapshot
          workingSoilPath = path
          const data = snapshot.val() || {}
          soilLog(`[SoilDebug] Found soil data at ${path} (${Object.keys(data).length} entries)`)
          soilLog("[SoilDebug] Sample:", JSON.stringify(data).substring(0, 200))
          break
        }
      } catch (error) {
  soilLog(`[SoilDebug] Error checking ${path}:`, error.message)
      }
    }
    // Suppress soil path info unless debugging
    if (!workingSoilPath) {
      soilLog("No soil data found in candidate paths.")
    } else {
      soilLog(`Using soil data path: ${workingSoilPath}`)
    }

    const [bmpSnapshot, mpuSnapshot, rainSnapshot, floodsRainSnapshot, tiltSnapshot, waterLvlLatest] =
      await Promise.all([
        firebaseDatabase.get(bmpQuery),
        firebaseDatabase.get(mpuQuery),
        firebaseDatabase.get(rainQuery),
        firebaseDatabase.get(floodsRainQuery),
        firebaseDatabase.get(tiltQuery),
        waterLevelQuery ? firebaseDatabase.get(waterLevelQuery) : Promise.resolve({ exists: () => false }),
      ])

    // prefer discovered snapshot over query result if exists
    if (!waterLevelSnapshot && waterLvlLatest && waterLvlLatest.exists()) {
      waterLevelSnapshot = waterLvlLatest
    }

    let processedSoilData = {}
    if (soilSnapshot && soilSnapshot.exists()) {
      soilLog(`Processing soil data from: ${workingSoilPath}`)
      const rawData = soilSnapshot.val()
      soilLog("Raw soil data type:", typeof rawData)
      soilLog("Raw soil data keys:", Object.keys(rawData || {}))

      if (typeof rawData === "object" && rawData !== null) {
        // Check if data has numeric keys (expected format)
        const keys = Object.keys(rawData)
        if (keys.length > 0) {
          if (keys.every((k) => !isNaN(Number(k)))) {
            // Data is already in expected format
            processedSoilData = rawData
            soilLog("Using data as-is (numeric keys)")
          } else {
            // Convert to expected format - could be single reading or different structure
            soilLog("Converting data structure")
            const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19)

            // If it looks like a single reading, wrap it
            if (
              rawData.moisture !== undefined ||
              rawData.analog !== undefined ||
              rawData.digital !== undefined ||
              rawData.value !== undefined
            ) {
              processedSoilData = { 1: { ...rawData, timestamp } }
              soilLog("Wrapped single reading")
            } else {
              // Try to use the data as-is but add timestamps if missing
              let counter = 1
              for (const [key, value] of Object.entries(rawData)) {
                if (typeof value === "object" && value !== null) {
                  processedSoilData[counter] = {
                    ...value,
                    timestamp: value.timestamp || timestamp,
                  }
                } else {
                  // Primitive value, treat as moisture reading
                  processedSoilData[counter] = {
                    moisture: value,
                    timestamp,
                  }
                }
                counter++
              }
              soilLog("Processed mixed data structure")
            }
          }
        }
      }
    } else {
  soilLog("=== NO SOIL DATA FOUND IN ANY PATH ===")
  soilLog("Available paths checked:", soilPaths)

      try {
        const sensorsRef = firebaseDatabase.ref(database, "/Sensors")
        const sensorsSnapshot = await firebaseDatabase.get(sensorsRef)
  if (sensorsSnapshot.exists()) soilLog("Available sensor types:", Object.keys(sensorsSnapshot.val()))

        const rootRef = firebaseDatabase.ref(database, "/")
        const rootSnapshot = await firebaseDatabase.get(rootRef)
  if (rootSnapshot.exists()) soilLog("Available root paths:", Object.keys(rootSnapshot.val()))
      } catch (error) {
  soilLog("Error listing available paths:", error.message)
      }
    }

    if (soilDebug) {
      soilLog("Final processed soil data entries:", Object.keys(processedSoilData).length)
      soilLog("=== SOIL MOISTURE DEBUG: End data fetch ===")
    }

    // Helper to get a readable location string from a reading record
    const getLocationString = (rec) => {
      if (!rec || typeof rec !== "object") return ""
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
        rec.town,
      ]
      const flatStr = flat.find((v) => typeof v === "string" && v.trim())
      if (flatStr) return flatStr.trim()
      const locObj = typeof rec.location === "object" && rec.location !== null ? rec.location : null
      if (locObj) {
        const { name, city, district, area, region, town } = locObj
        const parts = [name, city, district, area, region, town].filter((s) => typeof s === "string" && s.trim())
        if (parts.length) return parts.join(", ")
      }
      if (typeof rec.latitude === "number" && typeof rec.longitude === "number") {
        return `${rec.latitude}, ${rec.longitude}`
      }
      if (typeof rec.lat === "number" && typeof rec.lng === "number") {
        return `${rec.lat}, ${rec.lng}`
      }
      return ""
    }

    // Helper to pick latest record by timestamp or numeric-like key
    const getLatestFromMap = (mapObj) => {
      if (!mapObj || typeof mapObj !== "object") return null
      const entries = Object.entries(mapObj)
      if (entries.length === 0) return null
      const withTs = entries.map(([k, v]) => {
        let t = 0
        if (v && typeof v === "object" && v.timestamp) {
          const d = new Date(v.timestamp)
          if (!isNaN(d.getTime())) t = d.getTime()
        }
        return { k, v, t }
      })
      const anyTs = withTs.some((e) => e.t > 0)
      if (anyTs) {
        withTs.sort((a, b) => a.t - b.t)
        return withTs[withTs.length - 1].v
      }
      const parsed = entries.map(([k, v]) => {
        const n = Number(k)
        return { k, v, n: Number.isFinite(n) ? n : null }
      })
      const numericOnly = parsed.filter((e) => e.n !== null)
      if (numericOnly.length > 0) {
        numericOnly.sort((a, b) => a.n - b.n)
        return numericOnly[numericOnly.length - 1].v
      }
      return entries[entries.length - 1][1]
    }

    // Try to get locations from latest readings
  const rainData = rainSnapshot.exists() ? rainSnapshot.val() : {}
  const floodsRainData = floodsRainSnapshot && floodsRainSnapshot.exists() ? floodsRainSnapshot.val() : {}
    const soilData = soilSnapshot && soilSnapshot.exists() ? soilSnapshot.val() : {}
  const latestRain = getLatestFromMap(rainData)
  const latestFloodsRain = getLatestFromMap(floodsRainData)
    const latestSoil = getLatestFromMap(soilData)
  let rainLocation = getLocationString(latestRain)
  let floodsRainLocation = getLocationString(latestFloodsRain)
    let soilLocation = getLocationString(latestSoil)

    // Helper to fetch a location by trying multiple candidate paths
    const tryFetchLocationFromPaths = async (paths) => {
      for (const p of paths) {
        try {
          const refp = firebaseDatabase.ref(database, p)
          const snap = await firebaseDatabase.get(refp)
          if (snap.exists()) {
            const val = snap.val()
            const str = typeof val === "string" ? val : getLocationString(val)
            if (str) return str
          }
        } catch {
          /* ignore individual failures */
        }
      }
      return ""
    }

    // If still missing soil/rain locations, try ID-based resolution first
    const idFields = [
      "deviceId",
      "sensorId",
      "device",
      "node",
      "stationId",
      "id",
      "sensor",
      "station",
      "nodeId",
      "device_id",
      "sensor_id",
    ]
    const resolveByIds = async (latest) => {
      if (!latest || typeof latest !== "object") return ""
      const ids = idFields.map((f) => latest[f]).filter((v) => typeof v === "string" && v.trim())
      const bases = [
        "/Devices",
        "/Sensors/Devices",
        "/Sensors/Meta",
        "/Sensors",
        "/SensorNodes",
        "/Nodes",
        "/Stations",
        "/SensorsInfo",
        "/DevicesInfo",
      ]
      for (const id of ids) {
        const paths = bases.map((b) => `${b}/${id}`)
        const found = await tryFetchLocationFromPaths(paths)
        if (found) return found
      }
      return ""
    }

    if (!soilLocation) {
      soilLocation = await resolveByIds(latestSoil)
    }
    if (!rainLocation) {
      rainLocation = await resolveByIds(latestRain)
    }
    if (!floodsRainLocation) {
      floodsRainLocation = await resolveByIds(latestFloodsRain)
    }

    // Fallback: try common meta nodes with more exhaustive keys
    const metaBases = [
      "/Sensors/Locations",
      "/Locations",
      "/Sensors/Meta",
      "/Meta/Sensors",
      "/SensorLocations",
      "/Configs/Sensors",
      "/Meta",
    ]
    if (!rainLocation || !soilLocation) {
      for (const base of metaBases) {
        const candidates = [
          `${base}/Rain`,
          `${base}/rain`,
          `${base}/RainSensor`,
          `${base}/rainSensor`,
          `${base}/RainReadings`,
          `${base}/Soil`,
          `${base}/soil`,
          `${base}/SoilSensor`,
          `${base}/soilSensor`,
          `${base}/SoilReadings`,
        ]
        try {
          // Try batch-like sequential attempts
          const found = await tryFetchLocationFromPaths(candidates)
          if (found) {
            if (!rainLocation && /rain/i.test(found) === false) {
              // If this is a generic string, still accept
              rainLocation = rainLocation || found
            }
            if (!soilLocation) soilLocation = found // we'll refine below
          }
        } catch {
          /* ignore */
        }
        if (rainLocation && soilLocation) break
      }
    }

    // As a final fallback, try explicit soil/rain location nodes
    const SOIL_LOC_PATH = process.env.SOIL_LOCATION_PATH
    const RAIN_LOC_PATH = process.env.RAIN_LOCATION_PATH
    if (!soilLocation) {
      const paths = [
        "/SoilLocation",
        "/Soil/location",
        "/Soil/Location",
        "/Sensors/Soil/location",
        "/Sensors/Soil/Location",
      ]
      if (SOIL_LOC_PATH && typeof SOIL_LOC_PATH === "string") paths.unshift(SOIL_LOC_PATH)
      soilLocation = await tryFetchLocationFromPaths(paths)
    }
    if (!rainLocation) {
      const paths = [
        "/RainLocation",
        "/Rain/location",
        "/Rain/Location",
        "/Sensors/Rain/location",
        "/Sensors/Rain/Location",
      ]
      if (RAIN_LOC_PATH && typeof RAIN_LOC_PATH === "string") paths.unshift(RAIN_LOC_PATH)
      rainLocation = await tryFetchLocationFromPaths(paths)
    }
    if (!floodsRainLocation) {
      const paths = [
        "/FloodsRainLocation",
        "/FloodsRain/location",
        "/Sensors/FloodsRain/location",
        "/Sensors/FloodsRainReadings/location",
        "/FloodRainLocation",
      ]
      floodsRainLocation = await tryFetchLocationFromPaths(paths)
    }

    return {
      success: true,
      data: {
        bmp180: bmpSnapshot.exists() ? bmpSnapshot.val() : {},
        mpu6050: mpuSnapshot.exists() ? mpuSnapshot.val() : {},
        rain: rainSnapshot.exists() ? rainSnapshot.val() : {},
        floodsRain: floodsRainSnapshot && floodsRainSnapshot.exists() ? floodsRainSnapshot.val() : {},
        soil: processedSoilData, // Use the processed soil data
        tilt: tiltSnapshot.exists() ? tiltSnapshot.val() : {},
  waterLevel: waterLevelSnapshot && waterLevelSnapshot.exists() ? waterLevelSnapshot.val() : {},
        locations: {
          rain: rainLocation || "",
          floodsRain: floodsRainLocation || rainLocation || "",
          soil: soilLocation || "",
          waterLevel: "Gampaha", // Hardcoded for this example, can be dynamic in the future
        },
        debug: {
          soilPath: workingSoilPath || "No working path found",
          soilRawCount: soilSnapshot && soilSnapshot.exists() ? Object.keys(soilSnapshot.val() || {}).length : 0,
          processedSoilCount: Object.keys(processedSoilData).length,
          checkedPaths: soilPaths,
          waterLevelPath: workingWaterLevelPath || "No working path found",
          waterLevelCount: waterLevelSnapshot && waterLevelSnapshot.exists() ? Object.keys(waterLevelSnapshot.val() || {}).length : 0,
        },
      },
    }
  } catch (error) {
    console.error("Error in fetchLatestSensorData:", error)
    return {
      success: false,
      message: `Failed to fetch sensor data: ${error.message}`,
    }
  }
}

// Fetch all sensor data for historical analysis
async function fetchAllSensorData() {
  try {
    if (!database) {
      const initialized = await initializeFirebase()
      if (!initialized) {
        return { success: false, message: "Failed to initialize Firebase" }
      }
    }

    const firebaseDatabase = await import("firebase/database")

    const bmpRef = firebaseDatabase.ref(database, "/Sensors/BMP180Readings")
    const mpuRef = firebaseDatabase.ref(database, "/Sensors/MPU6050Readings")
    const rainRef = firebaseDatabase.ref(database, "/Sensors/RainReadings")
    const soilRefPrimary = firebaseDatabase.ref(database, "/Sensors/SoilReadings")
    const soilRefAlt1 = firebaseDatabase.ref(database, "/SoilMoistureReadings")
    const soilRefAlt2 = firebaseDatabase.ref(database, "/Sensors/SoilMoistureReadings")
    const tiltRef = firebaseDatabase.ref(database, "/Sensors/TiltReadings")

    const [bmpSnapshot, mpuSnapshot, rainSnapshot, soilSnapPrimary, soilSnapAlt1, soilSnapAlt2, tiltSnapshot] =
      await Promise.all([
        firebaseDatabase.get(bmpRef),
        firebaseDatabase.get(mpuRef),
        firebaseDatabase.get(rainRef),
        firebaseDatabase.get(soilRefPrimary),
        firebaseDatabase.get(soilRefAlt1),
        firebaseDatabase.get(soilRefAlt2),
        firebaseDatabase.get(tiltRef),
      ])
    const soilSnapshot = soilSnapAlt1.exists()
      ? soilSnapAlt1
      : soilSnapPrimary.exists()
        ? soilSnapPrimary
        : soilSnapAlt2.exists()
          ? soilSnapAlt2
          : soilSnapPrimary

    return {
      success: true,
      data: {
        bmp180: bmpSnapshot.exists() ? bmpSnapshot.val() : {},
        mpu6050: mpuSnapshot.exists() ? mpuSnapshot.val() : {},
        rain: rainSnapshot.exists() ? rainSnapshot.val() : {},
        soil: soilSnapshot && soilSnapshot.exists() ? soilSnapshot.val() : {},
        tilt: tiltSnapshot.exists() ? tiltSnapshot.val() : {},
      },
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to fetch all sensor data: ${error.message}`,
    }
  }
}

// IPC handlers for data fetching
ipcMain.handle("fetch-latest-sensor-data", async () => {
  return await fetchLatestSensorData()
})

ipcMain.handle("fetch-all-sensor-data", async () => {
  return await fetchAllSensorData()
})

// IPC: fetch existing notifications (latest 100)
ipcMain.handle("get-notifications", async () => {
  try {
    if (!firestore) {
      const ok = await initializeFirebase()
      if (!ok) return { success: false, message: "Firebase init failed" }
    }
  const { collection, getDocs, limit, query } = await import("firebase/firestore")
  const colRef = collection(firestore, "notifications")
  // No ordering since only permitted fields are stored
  const q = query(colRef, limit(100))
  const snap = await getDocs(q)
    const items = []
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
    return { success: true, data: items }
  } catch (err) {
    return { success: false, message: err.message }
  }
})

// IPC: save an array of new notifications
ipcMain.handle("save-notifications", async (_event, notifications) => {
  try {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return { success: true, saved: 0 }
    }
    if (!firestore) {
      const ok = await initializeFirebase()
      if (!ok) return { success: false, message: "Firebase init failed" }
    }
    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore")
    const colRef = collection(firestore, "notifications")
    let saved = 0
    for (const n of notifications) {
      // Basic validation & normalization
      const now = new Date()
      await addDoc(colRef, {
        isRead: false,
        message: n.message || "",
        time: n.time || now.toLocaleString("en-GB", { hour12: false }),
        type: n.type === "landslide" || n.type === "flood" ? n.type : "info",
        userID: "u6vBGxJXJIkFg0a2SKg7",
      })
      saved++
    }
    return { success: true, saved }
  } catch (err) {
    console.error("Failed to save notifications:", err)
    return { success: false, message: err.message }
  }
})

// IPC: mark notifications as read
ipcMain.handle("mark-notifications-read", async (_event, ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) return { success: true, updated: 0 }
    if (!firestore) {
      const ok = await initializeFirebase()
      if (!ok) return { success: false, message: "Firebase init failed" }
    }
    const { doc, updateDoc } = await import("firebase/firestore")
    let updated = 0
    for (const id of ids) {
      try {
        const ref = doc(firestore, "notifications", id)
        await updateDoc(ref, { isRead: true })
        updated++
      } catch (e) {
        console.warn("Could not mark notification read", id, e.message)
      }
    }
    return { success: true, updated }
  } catch (err) {
    return { success: false, message: err.message }
  }
})

// IPC handlers for user management
ipcMain.handle("get-users-data", async () => {
  return await getUsersData()
})

ipcMain.handle("get-user-activity", async () => {
  return await getUserActivity()
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: __dirname + "/preload.js",
    },
    autoHideMenuBar: true, // Hide by default
  })

  win.loadFile("index.html")

  // Completely remove default menu 
  Menu.setApplicationMenu(null)
  win.setMenuBarVisibility(false)

  // Open DevTools in development mode based on environment variable
  if (process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_TOOLS === "true") {
    win.webContents.openDevTools()
  }

  // Start realtime listener for water level (and potentially others later)
  startRealtimeWaterLevelListener(win)
}

// Realtime water level listener: pushes updates without waiting for polling
async function startRealtimeWaterLevelListener(win) {
  try {
    if (!database) {
      const initialized = await initializeFirebase()
      if (!initialized) return
    }
    const firebaseDatabase = await import("firebase/database")
    // Reuse detection logic: attempt same candidate set as fetch function
    const waterOverride = process.env.WATER_LEVEL_PATH
    const candidates = [
      waterOverride || "/Sensors/waterLevelSensor/levelData",
      "/Sensors/waterLevelSensor/leveldata",
      "/Sensors/waterLevelSensor",
      "/Sensors/WaterLevelSensor/levelData",
      "/Sensors/WaterLevelSensor",
      "/Sensors/WaterLevelReadings",
      "/Sensors/WaterLevel",
    ].filter((v, i, arr) => v && arr.indexOf(v) === i)
    let selectedRef = null
    for (const path of candidates) {
      try {
        const testRef = firebaseDatabase.ref(database, path)
        const testQuery = firebaseDatabase.query(testRef, firebaseDatabase.limitToLast(1))
        const snap = await firebaseDatabase.get(testQuery)
        if (snap.exists()) {
          selectedRef = firebaseDatabase.ref(database, path)
          console.log("[WaterRealtime] Using path:", path)
          break
        }
      } catch (err) {
        console.log("[WaterRealtime] path", path, "error:", err.message)
      }
    }
    if (!selectedRef) {
      console.log("[WaterRealtime] No water level path found; realtime listener not active")
      return
    }
    const waterLevelQuery = firebaseDatabase.query(selectedRef, firebaseDatabase.limitToLast(50))
    firebaseDatabase.onValue(
      waterLevelQuery,
      async () => {
        try {
          const latest = await fetchLatestSensorData()
          if (latest.success && !win.isDestroyed()) {
            win.webContents.send("sensor-data-update", latest.data)
          }
        } catch (err) {
          console.error("Realtime water level update failed:", err.message)
        }
      },
      (error) => {
        console.error("Water level realtime listener error:", error.message)
      }
    )
    console.log("✅ Realtime water level listener started")
  } catch (error) {
    console.error("Failed to start realtime water level listener:", error.message)
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
