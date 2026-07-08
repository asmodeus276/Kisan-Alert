import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.ts";

// Server-side in-memory mock database fallback when Supabase is not configured
const inMemoryUsers: Array<{ id: number; uid: string; email: string }> = [];
const inMemoryCases: Array<{
  id: string;
  user_id: number | null;
  district_id: string;
  farmer_name: string;
  village: string;
  crop_name: string;
  photo_thumbnail: string;
  diagnosis: string;
  symptom_description: string;
  voice_transcript: string | null;
  submission_time: string;
  status: string;
  advisory_response: string;
  created_at: string;
}> = [];

/**
 * Automatically synchronizes a logged-in user to the Supabase users table.
 */
export async function syncUserToSupabase(uid: string, email: string) {
  if (!supabase) {
    console.warn("⚠️ Supabase is not configured. Running user sync in local mock server database mode.");
    let existing = inMemoryUsers.find(u => u.uid === uid);
    if (!existing) {
      existing = { id: inMemoryUsers.length + 1, uid, email };
      inMemoryUsers.push(existing);
    } else {
      existing.email = email;
    }
    return existing;
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
    console.warn("⚠️ Supabase is not configured. Returning local mock server diagnostic cases.");
    const cases = inMemoryCases.map(item => ({
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
    console.warn("⚠️ Supabase is not configured. Upserting case into local mock server database.");
    let dbUserId: number | null = null;
    if (caseData.userUid) {
      const u = inMemoryUsers.find(x => x.uid === caseData.userUid);
      if (u) dbUserId = u.id;
    } else if (caseData.userId) {
      dbUserId = caseData.userId;
    }

    const index = inMemoryCases.findIndex(c => c.id === caseData.id);
    const item = {
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
      created_at: index >= 0 ? inMemoryCases[index].created_at : new Date().toISOString()
    };

    if (index >= 0) {
      inMemoryCases[index] = item;
    } else {
      inMemoryCases.push(item);
    }

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
      submissionTime: item.submission_time,
      status: item.status,
      advisoryResponse: item.advisory_response,
      createdAt: item.created_at,
    };
  }

  try {
    let dbUserId: number | null = null;

    // Try lookup by Supabase Auth UID to find the internal primary ID
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
      submissionTime: item.submission_time,
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

/**
 * Resolves the owner's UID for a given case ID, and the current case status & advisory response if it exists.
 */
export async function getCaseOwnerAndStatus(id: string): Promise<{ ownerUid: string | null; status: string | null; advisoryResponse: string | null } | null> {
  if (!supabase) {
    const item = inMemoryCases.find(c => c.id === id);
    if (!item) return null;
    let ownerUid: string | null = null;
    if (item.user_id !== null) {
      const u = inMemoryUsers.find(x => x.id === item.user_id);
      if (u) ownerUid = u.uid;
    }
    return {
      ownerUid,
      status: item.status,
      advisoryResponse: item.advisory_response,
    };
  }

  try {
    const { data: caseItem, error: caseError } = await supabase
      .from("escalated_cases")
      .select("status, advisory_response, user_id")
      .eq("id", id)
      .maybeSingle();

    if (caseError || !caseItem) {
      return null;
    }

    let ownerUid: string | null = null;
    if (caseItem.user_id) {
      const { data: userItem } = await supabase
        .from("users")
        .select("uid")
        .eq("id", caseItem.user_id)
        .maybeSingle();
      if (userItem) {
        ownerUid = userItem.uid;
      }
    }

    return {
      ownerUid,
      status: caseItem.status,
      advisoryResponse: caseItem.advisory_response,
    };
  } catch (err) {
    console.error("Error getting case owner and status:", err);
    return null;
  }
}
