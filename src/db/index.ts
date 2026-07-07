import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";

const { Pool } = pg;

// Check if SQL_HOST is configured
const isSqlConfigured = !!process.env.SQL_HOST;

let realDb: any = null;

if (isSqlConfigured) {
  try {
    const pool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
    
    realDb = drizzle(pool, { schema });
  } catch (err) {
    console.error("Failed to initialize Cloud SQL pool, falling back to virtual storage:", err);
  }
}

// High-fidelity in-memory database fallback to allow immediate execution
const localData = {
  users: [] as any[],
  escalatedCases: [] as any[],
};

// Seed with realistic starting data so the dashboard is beautiful immediately
localData.escalatedCases = [
  {
    id: "RSK-CASE-8401",
    userId: null,
    districtId: "D-12",
    farmerName: "Rajesh Kumar",
    village: "Ramnagar",
    cropName: "Wheat",
    photoThumbnail: null,
    diagnosis: {
      disease: "Wheat Rust (Puccinia graminis)",
      confidence_score: 94,
      severity: "High",
      recommendations: [
        "Apply propiconazole fungicide immediately",
        "Destroy infected crop residues after harvest",
        "Avoid overhead sprinkler irrigation to reduce leaf wetness"
      ]
    },
    symptomDescription: "Yellowish-brown oblong pustules appearing on the leaves and stems of the wheat crop.",
    voiceTranscript: "My wheat crop has yellow-brown spots on the leaves. It is spreading fast in my field. Please advise what to do.",
    submissionTime: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    status: "pending",
    advisoryResponse: null,
  },
  {
    id: "RSK-CASE-2914",
    userId: null,
    districtId: "D-05",
    farmerName: "Savitri Devi",
    village: "Kalyanpur",
    cropName: "Rice",
    photoThumbnail: null,
    diagnosis: {
      disease: "Bacterial Leaf Blight (Xanthomonas oryzae)",
      confidence_score: 88,
      severity: "Medium",
      recommendations: [
        "Maintain proper field drainage and sanitation",
        "Apply copper hydroxide spray if infection spreads",
        "Balance nitrogen fertilizer application"
      ]
    },
    symptomDescription: "Water-soaked stripes turning yellow and wavy along the leaf margins.",
    voiceTranscript: null,
    submissionTime: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    status: "dispatched",
    advisoryResponse: "Official advisory dispatched: Apply copper hydroxide at 2.5g/L and reduce nitrogen fertilizer to prevent further spread.",
  }
];

// Determine matching table name
const getTableName = (tableObj: any): "users" | "escalatedCases" => {
  if (tableObj === schema.users) return "users";
  return "escalatedCases";
};

// Simple query builder to support select().from().where() and insert().values().onConflictDoUpdate()
const virtualDb = {
  select: () => {
    return {
      from: (tableObj: any) => {
        const tableName = getTableName(tableObj);
        const data = localData[tableName];
        
        const chain: any = {
          where: (condition: any) => {
            return {
              then: (resolve: any) => {
                let matchedUid = "";
                if (condition && typeof condition === "object") {
                  if (condition.value !== undefined) {
                    matchedUid = condition.value;
                  } else if (condition.right !== undefined) {
                    matchedUid = condition.right;
                  } else {
                    const vals = Object.values(condition);
                    const uidVal = vals.find(v => typeof v === "string" && v.length > 10);
                    if (uidVal) matchedUid = uidVal as string;
                  }
                }
                
                if (matchedUid) {
                  const filtered = data.filter(item => item.uid === matchedUid);
                  return resolve(filtered);
                }
                return resolve(data);
              },
              catch: (reject: any) => reject(new Error("Query failed")),
            };
          },
          then: (resolve: any) => {
            return resolve(data);
          },
          catch: (reject: any) => reject(new Error("Query failed")),
        };
        
        chain.then = (resolve: any) => resolve(data);
        return chain;
      }
    };
  },
  
  insert: (tableObj: any) => {
    const tableName = getTableName(tableObj);
    const dataList = localData[tableName];
    
    return {
      values: (newRow: any) => {
        const executeInsert = () => {
          let insertedRow = { ...newRow };
          
          if (tableName === "users") {
            const existingIndex = dataList.findIndex(u => u.uid === newRow.uid);
            if (existingIndex > -1) {
              dataList[existingIndex] = { ...dataList[existingIndex], ...newRow };
              insertedRow = dataList[existingIndex];
            } else {
              insertedRow.id = dataList.length + 1;
              dataList.push(insertedRow);
            }
          } else if (tableName === "escalatedCases") {
            const existingIndex = dataList.findIndex(c => c.id === newRow.id);
            if (existingIndex > -1) {
              dataList[existingIndex] = { ...dataList[existingIndex], ...newRow };
              insertedRow = dataList[existingIndex];
            } else {
              dataList.push(insertedRow);
            }
          }
          return [insertedRow];
        };
        
        const chain: any = {
          onConflictDoUpdate: () => {
            return {
              returning: () => {
                return {
                  then: (resolve: any) => resolve(executeInsert()),
                };
              }
            };
          },
          returning: () => {
            return {
              then: (resolve: any) => resolve(executeInsert()),
            };
          },
          then: (resolve: any) => resolve(executeInsert()),
        };
        
        return chain;
      }
    };
  }
};

export const db = isSqlConfigured && realDb ? realDb : (virtualDb as any);

