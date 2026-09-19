-- 0019_offline_idempotency.sql added an optional trailing parameter to
-- open_cash_session and register_cash_movement (for the mobile offline
-- queue to pass a client-generated id) via `create or replace function`.
-- Same trap as list_team_members (0018) and report_profit_margin (0022):
-- CREATE OR REPLACE does not replace a function whose parameter list
-- changed, so the ORIGINAL 2-arg open_cash_session and 4-arg
-- register_cash_movement were never actually removed — they've been
-- sitting alongside the new versions since 0019.
--
-- The web app never passes the new optional id params, so it always
-- calls with exactly the old arg count — which now matches BOTH the old
-- exact-arity function AND the new function (via its trailing default),
-- and Postgres can't pick one: "Could not choose the best candidate
-- function". This is exactly the error reported when a Vendedor tried to
-- open caja — probably broken for everyone since 0019 shipped, just not
-- hit because no one had opened a *new* cash session since then.
drop function if exists open_cash_session(uuid, numeric);
drop function if exists register_cash_movement(uuid, cash_movement_type, numeric, text);

-- Not ambiguous (different parameter names, so named-arg RPC calls only
-- ever match one of them) but orphaned since 0012 replaced it with a
-- catalog-based signature — cleaning it up while auditing this class of
-- bug so it doesn't cause confusion later.
drop function if exists create_business_product(text, text, text, text, text, numeric, numeric, numeric, uuid, numeric);
