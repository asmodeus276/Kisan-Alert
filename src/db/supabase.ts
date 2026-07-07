import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

// Initialize Supabase Client
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Checks if Supabase has been configured with valid credentials.
 */
export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

/**
 * Automatically synchronizes a logged-in user to the Supabase users table.
 */
export async function syncUserToSupabase(uid: string, email: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        { uid, email },
        { onConflict: "uid" }
      )
      .select();

    if (error) {
      if (
        error.code === "42P01" || 
        error.code === "PGRST205" || 
        (error.message && (
          error.message.toLowerCase().includes("relation") && error.message.toLowerCase().includes("does not exist") ||
          error.message.toLowerCase().includes("could not find the table")
        ))
      ) {
        console.warn("Supabase relation 'users' does not exist yet.");
        return { tablesNotCreated: true };
      }
      console.error("Error syncing user to Supabase:", error);
      throw error;
    }

    return data ? data[0] : null;
  } catch (err: any) {
    if (
      err.code === "42P01" || 
      err.code === "PGRST205" || 
      (err.message && (
        err.message.toLowerCase().includes("relation") && err.message.toLowerCase().includes("does not exist") ||
        err.message.toLowerCase().includes("could not find the table")
      ))
    ) {
      console.warn("Supabase relation 'users' does not exist yet.");
      return { tablesNotCreated: true };
    }
    throw err;
  }
}

/**
 * Fetches all escalated diagnostic cases from the Supabase escalated_cases table.
 */
export async function getSupabaseCases() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  try {
    const { data, error } = await supabase
      .from("escalated_cases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (
        error.code === "42P01" || 
        error.code === "PGRST205" || 
        (error.message && (
          error.message.toLowerCase().includes("relation") && error.message.toLowerCase().includes("does not exist") ||
          error.message.toLowerCase().includes("could not find the table")
        ))
      ) {
        console.warn("Supabase relation 'escalated_cases' does not exist yet.");
        return {
          cases: [],
          tablesNotCreated: true
        };
      }
      console.error("Error fetching cases from Supabase:", error);
      throw error;
    }

    const cases = (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      districtId: item.district_id,
      farmerName: item.farmer_name,
      village: item.village,
      cropName: item.crop_name,
      photoThumbnail: item.photo_thumbnail,
      diagnosis: item.diagnosis,
      symptomDescription: item.symptom_description,
      voiceTranscript: item.voice_transcript,
      submissionTime: item.submission_time,
      status: item.status,
      advisoryResponse: item.advisory_response,
      createdAt: item.created_at,
    }));

    return {
      cases,
      tablesNotCreated: false
    };
  } catch (err: any) {
    if (
      err.code === "42P01" || 
      err.code === "PGRST205" || 
      (err.message && (
        err.message.toLowerCase().includes("relation") && err.message.toLowerCase().includes("does not exist") ||
        err.message.toLowerCase().includes("could not find the table")
      ))
    ) {
      return {
        cases: [],
        tablesNotCreated: true
      };
    }
    throw err;
  }
}

/**
 * Inserts or updates an escalated farmer case in the Supabase database.
 */
export async function upsertCaseToSupabase(caseData: any) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  try {
    let dbUserId: number | null = null;

    // Try lookup by Firebase Auth UID to find the internal primary ID
    if (caseData.userUid) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("uid", caseData.userUid)
        .single();

      if (!userError && user) {
        dbUserId = user.id;
      }
    } else if (caseData.userId) {
      dbUserId = caseData.userId;
    }

    const payload = {
      id: caseData.id,
      user_id: dbUserId,
      district_id: caseData.districtId,
      farmer_name: caseData.farmerName,
      village: caseData.village,
      crop_name: caseData.cropName,
      photo_thumbnail: caseData.photoThumbnail,
      diagnosis: caseData.diagnosis,
      symptom_description: caseData.symptomDescription,
      voice_transcript: caseData.voiceTranscript || null,
      submission_time: caseData.submissionTime,
      status: caseData.status || "Open",
      advisory_response: caseData.advisoryResponse || "",
    };

    const { data, error } = await supabase
      .from("escalated_cases")
      .upsert(payload, { onConflict: "id" })
      .select();

    if (error) {
      if (
        error.code === "42P01" || 
        error.code === "PGRST205" || 
        (error.message && (
          error.message.toLowerCase().includes("relation") && error.message.toLowerCase().includes("does not exist") ||
          error.message.toLowerCase().includes("could not find the table")
        ))
      ) {
        console.warn("Supabase relation 'escalated_cases' does not exist yet.");
        return { tablesNotCreated: true };
      }
      console.error("Error upserting case to Supabase:", error);
      throw error;
    }

    const item = data ? data[0] : null;
    if (!item) return null;

    return {
      id: item.id,
      userId: item.user_id,
      districtId: item.district_id,
      farmerName: item.farmer_name,
      village: item.village,
      cropName: item.crop_name,
      photoThumbnail: item.photo_thumbnail,
      diagnosis: item.diagnosis,
      symptomDescription: item.symptom_description,
      voiceTranscript: item.voice_transcript,
      submission_time: item.submission_time,
      status: item.status,
      advisoryResponse: item.advisory_response,
      createdAt: item.created_at,
    };
  } catch (err: any) {
    if (
      err.code === "42P01" || 
      err.code === "PGRST205" || 
      (err.message && (
        err.message.toLowerCase().includes("relation") && err.message.toLowerCase().includes("does not exist") ||
        err.message.toLowerCase().includes("could not find the table")
      ))
    ) {
      return { tablesNotCreated: true };
    }
    throw err;
  }
}
