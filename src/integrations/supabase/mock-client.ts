/**
 * Mock Supabase client for prototype/offline testing.
 * Auto-authenticates as a platform-owner user.
 * All DB queries return empty arrays so every screen loads without errors.
 */

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

const mockUser = {
  id: MOCK_USER_ID,
  email: "info@lifesavingequipment.co.nz",
  app_metadata: {},
  user_metadata: { full_name: "Platform Owner" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as any;

const mockSession = {
  user: mockUser,
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
} as any;

// Auth state change listeners
const authListeners: Array<(event: string, session: any) => void> = [];

// Chainable query builder that always resolves to empty data
function makeQueryBuilder(defaultData: any = []) {
  const builder: any = {
    _data: defaultData,
    select: () => builder,
    insert: (data: any) => { builder._data = Array.isArray(data) ? data : [data]; return builder; },
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    gte: () => builder,
    lte: () => builder,
    gt: () => builder,
    lt: () => builder,
    is: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => ({ data: null, error: null }),
    maybeSingle: () => ({ data: null, error: null }),
    head: () => builder,
    count: () => builder,
    then(resolve: any) {
      return Promise.resolve({ data: builder._data, error: null, count: 0 }).then(resolve);
    },
  };
  return builder;
}

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: mockSession }, error: null }),
    getUser: async () => ({ data: { user: mockUser }, error: null }),
    onAuthStateChange: (cb: (event: string, session: any) => void) => {
      authListeners.push(cb);
      // Fire immediately
      setTimeout(() => cb("SIGNED_IN", mockSession), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = authListeners.indexOf(cb);
              if (idx > -1) authListeners.splice(idx, 1);
            },
          },
        },
      };
    },
    signInWithPassword: async ({ email: _email }: { email: string; password: string }) => {
      return { data: { user: mockUser, session: mockSession }, error: null };
    },
    signUp: async () => ({ data: { user: mockUser, session: mockSession }, error: null }),
    signOut: async () => {
      authListeners.forEach((cb) => cb("SIGNED_OUT", null));
      return { error: null };
    },
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user: mockUser }, error: null }),
  },

  from: (table: string) => {
    // Return realistic mock data for tables the app checks at startup
    if (table === "club_memberships") {
      return makeQueryBuilder([
        {
          club_id: "mock-club-1",
          status: "approved",
          club: { id: "mock-club-1", name: "Demo Surf Club", location: "Gold Coast, QLD" },
        },
      ]);
    }
    if (table === "user_roles") {
      return makeQueryBuilder([
        { club_id: "mock-club-1", role: "owner" },
      ]);
    }
    if (table === "platform_owners") {
      return makeQueryBuilder([{ user_id: MOCK_USER_ID }]);
    }
    if (table === "member_emergency_contacts") {
      // Return 1 so the onboarding/complete redirect doesn't fire
      return makeQueryBuilder([{ id: "mock-ec-1" }]);
    }
    if (table === "profiles") {
      return makeQueryBuilder([
        {
          id: MOCK_USER_ID,
          full_name: "Platform Owner",
          first_name: "Platform",
          last_name: "Owner",
          email: "info@lifesavingequipment.co.nz",
          preferred_roles: [],
          age_division: null,
          gender: null,
        },
      ]);
    }
    // Everything else: empty array
    return makeQueryBuilder([]);
  },

  rpc: async (fn: string) => {
    if (fn === "is_platform_owner") return { data: true, error: null };
    if (fn === "get_platform_stats") return { data: { clubs: 0, members: 0, sessions: 0 }, error: null };
    return { data: null, error: null };
  },

  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
} as any;
