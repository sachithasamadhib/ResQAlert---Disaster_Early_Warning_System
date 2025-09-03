const { app, BrowserWindow, ipcMain, Menu } = require("electron")
const { dialog } = require("electron")
const fs = require("fs")

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
    // targeted sensors: IMU (MPU6050), Rainfall, Soil Moisture, Tilt.
    const isTargetSensorNotification = (n) => {
      try {
        const candidates = []
        if (typeof n.sensor === "string") candidates.push(n.sensor)
        if (typeof n.source === "string") candidates.push(n.source)
        if (typeof n.category === "string") candidates.push(n.category)
        // Use message as a heuristic fallback
        if (typeof n.message === "string") candidates.push(n.message)
        const text = candidates.join(" ").toLowerCase()
        if (!text) return false
        const keywords = [
          "mpu6050",
          "imu",
          "rain",
          "rainfall",
          "soil",
          "soil moisture",
          "tilt",
        ]
        return keywords.some((k) => text.includes(k))
      } catch {
        return false
      }
    }
    for (const n of notifications) {
      // Basic validation & normalization
      const now = new Date()
      const isTarget = isTargetSensorNotification(n)
      const userIdForDoc = isTarget ? "X5RU2nV4uuuM6f3sdKyb" : "u6vBGxJXJIkFg0a2SKg7"
      await addDoc(colRef, {
        isRead: false,
        message: n.message || "",
        time: n.time || now.toLocaleString("en-GB", { hour12: false }),
        type: n.type === "landslide" || n.type === "flood" ? n.type : "info",
        userID: userIdForDoc,
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

  // Start realtime listeners for all sensors
  startRealtimeListeners(win)
}

// Utility: parse timestamp-like value to Date (fallback now)
function parseTimestamp(ts) {
  if (!ts) return null
  if (ts instanceof Date) return ts
  const d = new Date(ts)
  if (!isNaN(d.getTime())) return d
  return null
}

// Prepare data subset based on time range (ms cutoff)
function filterByTimeRange(mapObj, cutoff) {
  if (!cutoff || !mapObj || typeof mapObj !== 'object') return mapObj || {}
  const result = {}
  for (const [k, v] of Object.entries(mapObj)) {
    const d = parseTimestamp(v && (v.timestamp || v.time))
    if (!d || d.getTime() >= cutoff) result[k] = v
  }
  return result
}

// Summaries for sensor categories relevant to floods / landslides
function summarizeData(data, reportType) {
  const now = Date.now()
  const sections = []
  // Helper building blocks
  const buildTable = (rows) => {
    if (!rows || rows.length === 0) return '<p style="color:#64748b;font-style:italic;">No data</p>'
    const headers = Object.keys(rows[0])
    return `<table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${headers.map(h=>`<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  }

  // Flood-focused sensors: rain (floodsRain), waterLevel, bmp180 (pressure), floodsRain
  if (reportType !== 'landslide') {
    // Water Level summary
    const wlValues = Object.values(data.waterLevel || {})
    const wlNums = wlValues.map(v=> {
      const candidates = [v.WaterLevelPercentage, v.waterLevelPercentage, v.waterLevel, v.value]
      const num = candidates.find(x=> typeof x === 'number')
      return typeof num === 'number'? num : null
    }).filter(n=> n!==null)
    const wlAvg = wlNums.length? (wlNums.reduce((a,b)=>a+b,0)/wlNums.length).toFixed(1) : '--'
    const wlMax = wlNums.length? Math.max(...wlNums).toFixed(1) : '--'
    const wlLatest = wlNums.length? wlNums[wlNums.length-1].toFixed(1) : '--'
    sections.push(`<h2>Flood Risk Overview</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Avg Water Level %</div><div class="kpi-value">${wlAvg}</div></div>
        <div class="kpi"><div class="kpi-label">Max Water Level %</div><div class="kpi-value">${wlMax}</div></div>
        <div class="kpi"><div class="kpi-label">Latest Water Level %</div><div class="kpi-value">${wlLatest}</div></div>
      </div>`)
    // Pressure trend
    const bmpValues = Object.values(data.bmp180 || {})
    const pressures = bmpValues.map(v=> v.pressure_hPa).filter(p=> typeof p==='number')
    if (pressures.length) {
      const pAvg = (pressures.reduce((a,b)=>a+b,0)/pressures.length).toFixed(1)
      const pLast = pressures[pressures.length-1].toFixed(1)
      sections.push(`<h3>Atmospheric Pressure</h3><p>Average: <b>${pAvg} hPa</b>, Latest: <b>${pLast} hPa</b>. Low pressure may correlate with sustained rainfall systems.</p>`)
    }
  }

  // Landslide-focused sensors: rain (hill), soil, tilt, mpu (vibration)
  if (reportType !== 'flood') {
    const soilValues = Object.values(data.soil || {})
    const analogs = soilValues.map(v=> typeof v.analog === 'number'? v.analog : (typeof v.moisture==='number'? v.moisture : null)).filter(n=> n!==null)
    const soilAvg = analogs.length? (analogs.reduce((a,b)=>a+b,0)/analogs.length).toFixed(0) : '--'
    const soilLast = analogs.length? analogs[analogs.length-1].toFixed(0): '--'
    const tiltValues = Object.values(data.tilt || {})
    const tiltEvents = tiltValues.filter(v=> v.value === 0).length
    const mpuValues = Object.values(data.mpu6050 || {})
    const vibrations = mpuValues.map(v=> {
      const ax=v.accelX||0, ay=v.accelY||0, az=v.accelZ||0
      return Math.sqrt(ax*ax+ay*ay+az*az)
    })
    const vibMax = vibrations.length? Math.max(...vibrations).toFixed(3): '--'
    sections.push(`<h2>Landslide Risk Overview</h2>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">Soil Moisture Avg (Analog)</div><div class="kpi-value">${soilAvg}</div></div>
        <div class="kpi"><div class="kpi-label">Latest Soil Moisture</div><div class="kpi-value">${soilLast}</div></div>
        <div class="kpi"><div class="kpi-label">Tilt Events</div><div class="kpi-value">${tiltEvents}</div></div>
        <div class="kpi"><div class="kpi-label">Max Ground Vibration (g)</div><div class="kpi-value">${vibMax}</div></div>
      </div>`)
  }

  // Detailed tables subset (limit to last 15 per sensor)
  function mapToRows(map, pick) {
    if (!map) return []
    return Object.entries(map).slice(-15).map(([k,v])=> pick(k,v))
  }
  if (reportType !== 'landslide') {
    const wlRows = mapToRows(data.waterLevel || {}, (k,v)=> ({Key:k, Time:(v.time||v.timestamp||'').toString().slice(0,19), Level:(v.WaterLevelPercentage||v.waterLevelPercentage||v.waterLevel||v.value||'--')}))
    sections.push(`<h3>Water Level Recent Readings</h3>${buildTable(wlRows)}`)
  }
  if (reportType !== 'flood') {
    const soilRows = mapToRows(data.soil || {}, (k,v)=> ({Key:k, Time:(v.timestamp||'').toString().slice(0,19), Analog:(v.analog||v.moisture||'--'), Digital:(v.digital!==undefined? v.digital:'')}))
    sections.push(`<h3>Soil Moisture Recent Readings</h3>${buildTable(soilRows)}`)
    const tiltRows = mapToRows(data.tilt || {}, (k,v)=> ({Key:k, Time:(v.timestamp||'').toString().slice(0,19), Status:v.value===0?'TILTED':'NORMAL'}))
    sections.push(`<h3>Tilt Sensor Recent Status</h3>${buildTable(tiltRows)}`)
  }
  return sections.join('\n')
}

ipcMain.handle('generate-report', async (_event, options) => {
  try {
    const { reportType='combined', timeRange='24h' } = options || {}
    // Gather fresh complete dataset for accuracy
    const latest = await fetchLatestSensorData()
    if (!latest.success) return { success:false, message: 'Failed to fetch sensor data for report.' }
    let data = latest.data
    // Determine cutoff
    const now = Date.now()
    let cutoff = null
    if (timeRange === '1h') cutoff = now - 3600_000
    else if (timeRange === '6h') cutoff = now - 6*3600_000
    else if (timeRange === '24h') cutoff = now - 24*3600_000
    else if (timeRange === '7d') cutoff = now - 7*24*3600_000
    if (cutoff) {
      data = { ...data,
        bmp180: filterByTimeRange(data.bmp180, cutoff),
        mpu6050: filterByTimeRange(data.mpu6050, cutoff),
        rain: filterByTimeRange(data.rain, cutoff),
        floodsRain: filterByTimeRange(data.floodsRain, cutoff),
        soil: filterByTimeRange(data.soil, cutoff),
        tilt: filterByTimeRange(data.tilt, cutoff),
        waterLevel: filterByTimeRange(data.waterLevel, cutoff),
      }
    }
    const titleMap = { flood:'Flood Risk Report', landslide:'Landslide Risk Report', combined:'Flood & Landslide Combined Report' }
    const reportTitle = titleMap[reportType] || titleMap.combined
    const generatedAt = new Date().toLocaleString('en-GB', { hour12:false })
    const sectionsHTML = summarizeData(data, reportType)
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'/><title>${reportTitle}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin:32px; color:#0f172a; }
        h1 { font-size:24px; margin:0 0 4px; color:#1e3a8a; }
        h2 { margin:32px 0 12px; font-size:20px; color:#1e293b; }
        h3 { margin:28px 0 10px; font-size:16px; color:#334155; }
        p { line-height:1.4; }
        .meta { font-size:12px; color:#475569; margin-bottom:20px; }
        .kpi-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin:12px 0 4px; }
        .kpi { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:12px; }
        .kpi-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#475569; }
        .kpi-value { font-size:20px; font-weight:700; color:#0f172a; margin-top:4px; }
        table.data-table { width:100%; border-collapse:collapse; font-size:12px; }
        table.data-table th { text-align:left; background:#1e40af; color:#fff; padding:6px 8px; font-weight:600; }
        table.data-table td { border:1px solid #e2e8f0; padding:6px 8px; }
        .footer { margin-top:40px; font-size:11px; color:#64748b; text-align:center; }
        .badge { display:inline-block; padding:2px 8px; font-size:11px; border-radius:12px; background:#1e3a8a; color:#fff; font-weight:600; }
      </style></head><body>
      <h1>${reportTitle}</h1>
      <div class='meta'>Generated: ${generatedAt} | Range: ${timeRange} | Environment: ${process.env.NODE_ENV || 'production'}</div>
      ${sectionsHTML}
      <div class='footer'>Disaster Operations Center – Automated Report • ${generatedAt}</div>
      </body></html>`
    const pdfWin = new BrowserWindow({ show:false, webPreferences:{ offscreen:true } })
    await pdfWin.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html))
    const pdfBuffer = await pdfWin.webContents.printToPDF({ pageSize:'A4', printBackground:true, marginsType:1 })
    pdfWin.destroy()
    const { filePath } = await dialog.showSaveDialog({ title:'Save Report', defaultPath: reportTitle.replace(/[^a-z0-9]+/gi,'_')+'.pdf', filters:[{ name:'PDF', extensions:['pdf'] }] })
    if (!filePath) return { success:false, message:'Save cancelled' }
    fs.writeFileSync(filePath, pdfBuffer)
    return { success:true, message:'Report generated', path:filePath }
  } catch (err) {
    console.error('Report generation failed:', err)
    return { success:false, message:err.message }
  }
})

// Realtime listeners for all sensors: on any change, push fresh data to renderer
async function startRealtimeListeners(win) {
  try {
    if (!database) {
      const initialized = await initializeFirebase()
      if (!initialized) return
    }
    const firebaseDatabase = await import("firebase/database")

    // Debounced push to renderer avoiding storm of updates
    let updateTimer = null
    const schedulePushUpdate = () => {
      if (updateTimer) return
      updateTimer = setTimeout(async () => {
        updateTimer = null
        try {
          const latest = await fetchLatestSensorData()
          if (latest.success && !win.isDestroyed()) {
            win.webContents.send("sensor-data-update", latest.data)
          }
        } catch (err) {
          console.error("Realtime update failed:", err.message)
        }
      }, 250)
    }

    const listenPath = (path, label) => {
      try {
        const ref = firebaseDatabase.ref(database, path)
        const q = firebaseDatabase.query(ref, firebaseDatabase.limitToLast(50))
        firebaseDatabase.onValue(
          q,
          () => {
            // console.log(`[Realtime] ${label} change @ ${path}`)
            schedulePushUpdate()
          },
          (error) => {
            console.warn(`[Realtime] ${label} listener error @ ${path}:`, error.message)
          }
        )
        console.log(`[Realtime] Listening: ${label} -> ${path}`)
      } catch (err) {
        console.warn(`[Realtime] Failed to attach listener for ${label} @ ${path}:`, err.message)
      }
    }

    // Fixed sensor paths
    const FIXED = {
      bmp: ["/Sensors/BMP180Readings"],
      mpu: ["/Sensors/MPU6050Readings"],
      rain: ["/Sensors/RainReadings"],
      floodsRain: ["/Sensors/FloodsRainReadings"],
      tilt: ["/Sensors/TiltReadings"],
    }
    FIXED.bmp.forEach(p => listenPath(p, "BMP180"))
    FIXED.mpu.forEach(p => listenPath(p, "MPU6050"))
    FIXED.rain.forEach(p => listenPath(p, "Rain"))
    FIXED.floodsRain.forEach(p => listenPath(p, "FloodsRain"))
    FIXED.tilt.forEach(p => listenPath(p, "Tilt"))

    // Dynamic soil paths (reuse candidates from fetchLatestSensorData)
    const soilPaths = [
      process.env.SOIL_MOISTURE_PATH || "/Sensors/SoilMoistureReadings",
      "/Sensors/SoilReadings",
      "/Sensors/SoilMoisture",
      "/Sensors/SoilSensor",
      "/SoilMoistureReadings",
      "/SoilSensor",
      "/Soil",
      "/Sensors/Soil",
    ].filter((v, i, a) => v && a.indexOf(v) === i)
    soilPaths.forEach(p => listenPath(p, "Soil"))

    // Dynamic water level paths (reuse candidates)
    const waterOverride = process.env.WATER_LEVEL_PATH
    const waterPaths = [
      waterOverride || "/Sensors/waterLevelSensor/levelData",
      "/Sensors/waterLevelSensor/leveldata",
      "/Sensors/waterLevelSensor",
      "/Sensors/WaterLevelSensor/levelData",
      "/Sensors/WaterLevelSensor",
      "/Sensors/WaterLevelReadings",
      "/Sensors/WaterLevel",
      "/waterLevelSensor/levelData",
      "/WaterLevelSensor/levelData",
      "/waterLevelSensor",
      "/WaterLevelSensor",
    ].filter((v, i, a) => v && a.indexOf(v) === i)
    waterPaths.forEach(p => listenPath(p, "WaterLevel"))

    // Push one initial update quickly
    schedulePushUpdate()
    console.log("✅ Realtime listeners for all sensors started")
  } catch (error) {
    console.error("Failed to start realtime listeners:", error.message)
  }
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
