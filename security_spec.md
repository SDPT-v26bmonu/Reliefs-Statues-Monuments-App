# Firestore Security Specification (`trailPhotos`)

## 1. Data Invariants
1. Public trail photos are strictly scoped to the three premade curated trails (`dorsoduro-central-survey`, `dorsoduro-west-survey`, `dorsoduro-east-survey`). Custom user routes (`custom-route`) cannot store or query public trail photos.
2. No PII (`email`, `phone`, `address`) may be stored inside `trailPhotos/{photoId}`. Only `authorUid` and a bounded public `authorName` (1..80 chars) are stored.
3. Every `create` requires an authenticated, email-verified user (`request.auth != null && request.auth.token.email_verified == true`), and `authorUid` must strictly match `request.auth.uid`.
4. `createdAt` must equal `request.time` (server timestamp).
5. `imageDataUrl` must match a bounded base64 web image (`<= 450000` bytes) and `caption`/`stopTitle`/`lat`/`lng` are strictly type- and bounds-checked.
6. Documents are immutable once uploaded (`allow update: if false`), and only the original uploader (`existing().authorUid == request.auth.uid`) may delete a photo.
7. List queries must evaluate `resource.data.trailId` against the premade trail allowlist so clients query per trail.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Create**: Creating a `trailPhotos` document when `request.auth == null`.
2. **Unverified Email Create**: Creating a `trailPhotos` document when `request.auth.token.email_verified == false`.
3. **Custom Route Upload**: Setting `trailId: "custom-route"` instead of a premade trail ID.
4. **UID Spoofing**: Setting `authorUid` to another user's UID (`"other-uid"` != `request.auth.uid`).
5. **Shadow / Ghost Field**: Adding an undeclared field like `isFeatured: true` or `email: "user@example.com"`.
6. **Fake Client Timestamp**: Setting `createdAt` to a client timestamp instead of `request.time`.
7. **Oversized Image Payload**: Sending an `imageDataUrl` exceeding `450000` characters.
8. **Malformed / Non-Image Data URI**: Sending `data:text/html;base64,...` or `https://evil.example/x.jpg` in `imageDataUrl`.
9. **ID Poisoning**: Creating or deleting with a document ID containing invalid characters (`"../../etc"` or >128 chars).
10. **Out-of-Bounds Coordinates**: Supplying `lat: 120` or `lng: -250`.
11. **Post-Publish Mutation**: Updating any field on an existing `trailPhotos` document.
12. **Unauthorized Delete**: Deleting another user's `trailPhotos` document (`existing().authorUid != request.auth.uid`).
