# Security Specification - Kisan Alert Firestore Rules

This document outlines the security architecture and invariants for the Kisan Alert Firebase Firestore database.

## 1. Data Invariants

- **User Profiles (`/users/{userId}`)**:
  - A user profile must be bound to the authenticated user ID (`userId == request.auth.uid`).
  - Users cannot modify or write profiles belonging to other user IDs.
  - The email field must follow a valid email format.

- **Escalated Cases (`/escalatedCases/{caseId}`)**:
  - Anyone (signed in or guests) can create cases, as farmers might use the system anonymously or before signing in.
  - If a case is created with `userUid`, it must match `request.auth.uid`.
  - Only authenticated users can update their own cases or view their private case history.
  - Advisory responses are read-only for regular farmers; only experts/administrators (verified backend/admin role) can update or dispatch responses.
  - Once a case status is set to `Closed`, it is terminally locked and cannot be updated.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 specific payloads designed to breach system laws (Identity, Integrity, State) which must be blocked (`PERMISSION_DENIED`):

1. **Spoofed User Creation**: Attempting to create a profile under `/users/attacker_uid` with `request.auth.uid = victim_uid`.
2. **PII Leakage Query**: Attacker attempting to perform a blanket list query across `/users` profiles without restricting the filter to their own `uid`.
3. **Impersonated Case Ownership**: Attacker creating a case under `/escalatedCases/case-123` setting `userUid` to `victim_uid`.
4. **Anomalous Case ID Injection**: Trying to create a case with an extremely long case ID (`size > 128` or containing non-alphanumeric characters).
5. **Expert Advisory Spoofing**: Regular user attempting to set or edit the `advisoryResponse` or `status` to bypass official expert channels.
6. **Negative Confidence Score**: Submitting a diagnostic case where `diagnosis.confidence_score` is negative or greater than 100.
7. **Terminal State Bypass**: Attacker attempting to update details of an escalated case after its `status` has been marked as `Closed`.
8. **Malicious Sizing Attack**: Submitting an excessively large string inside `symptomDescription` (e.g. >10,000 characters) to exhaust database storage (Denial of Wallet).
9. **Missing Mandatory Fields**: Submitting a case document without the required `districtId` or `cropName` fields.
10. **Shadow Key Injection**: Injecting unsolicited fields like `adminFlag: true` inside a user profile or a case document.
11. **Malicious Array Bloating**: Submitting a case diagnosis with an unbounded array of 1,000 recommendations to perform resource exhaustion.
12. **Unauthorized Case Deletion**: A regular user attempting to delete a registered crop disease case.

---

## 3. Test Cases (TDD Verification)

Every query and write operation matching the scenarios above must explicitly return `PERMISSION_DENIED` under the generated `firestore.rules`.
