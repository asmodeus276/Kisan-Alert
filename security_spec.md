# Security Specification - Kisan Alert Supabase RLS Policies

This document outlines the security architecture, data integrity invariants, and PostgreSQL Row Level Security (RLS) policies for the Kisan Alert database.

---

## 1. Database Schema Definitions

### Users Table (`users`)
Holds basic user profile mappings between external authentication providers and internal database primary keys.
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(255) NOT NULL UNIQUE, -- Supabase Auth UID (auth.uid())
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Escalated Cases Table (`escalated_cases`)
Tracks crop disease diagnostic cases escalated by farmers to expert agricultural advisors.
```sql
CREATE TABLE escalated_cases (
  id VARCHAR(255) PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  district_id VARCHAR(100) NOT NULL,
  farmer_name VARCHAR(255) NOT NULL,
  village VARCHAR(255) NOT NULL,
  crop_name VARCHAR(255) NOT NULL,
  photo_thumbnail TEXT,
  diagnosis TEXT NOT NULL,
  symptom_description TEXT NOT NULL CHECK (char_length(symptom_description) <= 10000),
  voice_transcript TEXT,
  submission_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  advisory_response TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 2. Row Level Security (RLS) Policies

We enforce strict security policies at the database level using PostgreSQL Row Level Security.

```sql
-- Enable Row Level Security on all critical tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalated_cases ENABLE ROW LEVEL SECURITY;
```

### Helper Functions

#### `is_expert()`
Identifies if the current user is an authorized agricultural expert. In our environment, experts are identified by the authenticated user's email address (e.g., `vaibhav.thakur2719@gmail.com` or `demo-expert@example.com`).
```sql
CREATE OR REPLACE FUNCTION is_expert()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' IN ('vaibhav.thakur2719@gmail.com', 'demo-expert@example.com')
  );
END;
$$ LANGUAGE plpgsql;
```

---

### A. Policies for `users` Table

1. **Read Profile (`SELECT`)**:
   Users can only read their own profile. Expert advisors can read all user profiles.
   ```sql
   CREATE POLICY select_user_profile ON users
   FOR SELECT
   USING (
     auth.uid() = uid OR is_expert()
   );
   ```

2. **Create/Update Profile (`INSERT` / `UPDATE`)**:
   Users can only insert or modify their own profile data, matching their current authenticated session.
   ```sql
   CREATE POLICY insert_user_profile ON users
   FOR INSERT
   WITH CHECK (
     auth.uid() = uid
   );

   CREATE POLICY update_user_profile ON users
   FOR UPDATE
   USING (
     auth.uid() = uid
   )
   WITH CHECK (
     auth.uid() = uid
   );
   ```

3. **Delete Profile (`DELETE`)**:
   Profile deletion is restricted entirely to prevent user data loss.
   ```sql
   CREATE POLICY delete_user_profile ON users
   FOR DELETE
   USING (
     false
   );
   ```

---

### B. Policies for `escalated_cases` Table

1. **Read Case (`SELECT`)**:
   Farmers can view their own escalated cases (by matching their user profile ID mapped via `auth.uid()`).
   Agricultural experts can view all escalated cases across all districts.
   ```sql
   CREATE POLICY select_escalated_cases ON escalated_cases
   FOR SELECT
   USING (
     is_expert() OR 
     user_id IN (SELECT id FROM users WHERE uid = auth.uid())
   );
   ```

2. **Create Case (`INSERT`)**:
   Anyone can create a diagnostic case (enabling guest/anonymous submissions). However, if a user links their authenticated profile (`user_id`), it must belong to their own authenticated ID.
   ```sql
   CREATE POLICY insert_escalated_cases ON escalated_cases
   FOR INSERT
   WITH CHECK (
     user_id IS NULL OR
     user_id IN (SELECT id FROM users WHERE uid = auth.uid())
   );
   ```

3. **Update Case (`UPDATE`)**:
   - **Regular Farmers**: Can only update their own open cases, and they **cannot** modify administrative/expert fields (`status`, `advisory_response`).
   - **Agricultural Experts**: Can update any case to change status or add advisory responses, provided the case is not terminally closed.
   - **Terminally Closed Constraint**: Once a case's status is set to `Closed`, it is immutable and cannot be updated by anyone.

   ```sql
   CREATE POLICY update_escalated_cases ON escalated_cases
   FOR UPDATE
   USING (
     -- Ensure the case is not already Closed
     status <> 'Closed' AND (
       is_expert() OR
       user_id IN (SELECT id FROM users WHERE uid = auth.uid())
     )
   )
   WITH CHECK (
     CASE
       -- If the user is an expert, they can perform updates including changing status and advisory responses
       WHEN is_expert() THEN true
       -- If the user is a regular farmer, they can only update non-administrative fields and cannot change the status/advisory
       ELSE (
         user_id IN (SELECT id FROM users WHERE uid = auth.uid()) AND
         status = 'Open' AND
         advisory_response = ''
       )
     END
   );
   ```

4. **Delete Case (`DELETE`)**:
   Farmers cannot delete cases to preserve public records. Only database admins can delete records if absolutely necessary.
   ```sql
   CREATE POLICY delete_escalated_cases ON escalated_cases
   FOR DELETE
   USING (
     false
   );
   ```

---

## 3. The "Dirty Dozen" Payloads (RLS & Constraint Validation)

Below are the 12 specific attack vectors designed to breach system integrity and how our Supabase/PostgreSQL architecture blocks them:

1. **Spoofed User Creation**: Attempting to insert a row into `users` with `uid = 'victim_uid'` while authenticated as `attacker_uid`.
   - *Blocked by*: `insert_user_profile` policy (`auth.uid() = uid` check).

2. **PII Leakage Query**: Attacker attempting to select rows from the `users` table without restricting the filter to their own profile.
   - *Blocked by*: `select_user_profile` policy (automatically restricts returned rows to `auth.uid() = uid`).

3. **Impersonated Case Ownership**: Attacker trying to submit a case under `escalated_cases` with a `user_id` belonging to a victim.
   - *Blocked by*: `insert_escalated_cases` policy (`user_id IN (SELECT id FROM users WHERE uid = auth.uid())` check).

4. **Anomalous Case ID Injection**: Attempting to create a case with an extremely long ID or containing SQL injection characters.
   - *Blocked by*: Database schemas using parameterized query binding, typed primary key limits, and standard input validation.

5. **Expert Advisory Spoofing**: Regular authenticated farmer attempting to set `advisory_response` or `status` to bypass expert review.
   - *Blocked by*: `update_escalated_cases` `WITH CHECK` block restricting regular users from updating administrative fields.

6. **Invalid Status / State Injection**: Attacker submitting a status of `'MaliciousState'` instead of valid enum options.
   - *Blocked by*: The table check constraint: `CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed'))`.

7. **Terminal State Bypass**: Attacker trying to update a case after its status has been marked as `Closed`.
   - *Blocked by*: `update_escalated_cases` policy `USING` clause condition `status <> 'Closed'`.

8. **Malicious Sizing Attack (Denial of Wallet)**: Injecting a payload of 100,000 characters into the `symptom_description` field.
   - *Blocked by*: The table check constraint: `CHECK (char_length(symptom_description) <= 10000)`.

9. **Missing Mandatory Fields**: Submitting a case document without a `district_id`, `crop_name`, or `diagnosis`.
   - *Blocked by*: Database `NOT NULL` constraint definitions on those columns.

10. **Shadow Column Injection**: Injecting a custom unauthorized column like `is_admin = true` inside the write request.
    - *Blocked by*: PostgreSQL strict relational schema. Unregistered columns will cause immediate syntax/binding errors.

11. **Malicious Array Bloating**: Submitting a case with redundant, bloated nested structures or extremely long repeating strings.
    - *Blocked by*: Proper text parsing, size checking, and relational normalizations.

12. **Unauthorized Case Deletion**: A regular user attempting to delete a registered crop disease case to destroy evidence.
    - *Blocked by*: `delete_escalated_cases` policy (`USING (false)`).

---

## 4. Test Verification (TDD)

Every query and write operation matching the scenarios above must be tested against Supabase Local Emulator or database unit tests to ensure that violating queries explicitly throw a `42501` (Insufficient Privilege) or check constraint violation error.
