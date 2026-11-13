const SUPABASE_URL = "https://qwzeouzrxvnkqftrqhwm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_xPaAUcxphfFwFa0cgc2juA_sCva5TA0";

const { createClient } = window.supabase;

window.supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
