# Official product verification gate

Before a luggage item can be saved, EntrySafe calls the authenticated `verify-travel-product` Supabase Edge Function. The verifier checks the versioned regulatory catalog and live official U.S. sources. Decisions are `allowed`, `allowed_declare`, `restricted`, `prohibited`, or `review`.

- `allowed` and `allowed_declare`: the UI may offer the final save button.
- `restricted`: requirements are shown and explicit acknowledgement is required before save.
- `prohibited`: save is blocked.
- `review`: save is blocked because the system has insufficient product-specific evidence.

Each attempt is written to `product_verifications` with the decision, requirements, sources, verification time, expiry and whether the attempt authorized saving. The final admissibility decision remains with U.S. inspectors.
